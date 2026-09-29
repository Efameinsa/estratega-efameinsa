import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";

export const mpcRouter = router({
  getAll: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const factorDefs = await db.mpcFactorDef.findMany({
        where: { cycleId: input.cycleId },
        orderBy: { sortOrder: "asc" },
      });
      const competitors = await db.mpcCompetitor.findMany({
        where: { cycleId: input.cycleId },
        include: { scores: true },
        orderBy: { sortOrder: "asc" },
      });
      return { factorDefs, competitors };
    }),

  createFactor: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        name: z.string().min(1),
        weight: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const count = await db.mpcFactorDef.count({ where: { cycleId: input.cycleId } });
      return db.mpcFactorDef.create({
        data: { ...input, sortOrder: count, organizationId: ctx.organizationId },
      });
    }),

  updateFactor: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        weight: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const factor = await db.mpcFactorDef.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (factor.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { id, ...data } = input;
      return db.mpcFactorDef.update({ where: { id }, data });
    }),

  deleteFactor: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const factor = await db.mpcFactorDef.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (factor.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.mpcFactorDef.delete({ where: { id: input.id } });
    }),

  createCompetitor: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        name: z.string().min(1),
        isOwnOrg: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const count = await db.mpcCompetitor.count({ where: { cycleId: input.cycleId } });
      return db.mpcCompetitor.create({
        data: { ...input, sortOrder: count, organizationId: ctx.organizationId },
      });
    }),

  deleteCompetitor: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const competitor = await db.mpcCompetitor.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (competitor.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.mpcCompetitor.delete({ where: { id: input.id } });
    }),

  upsertScore: protectedProcedure
    .input(
      z.object({
        competitorId: z.string(),
        factorDefId: z.string(),
        rating: z.number().int().min(1).max(4),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const competitor = await db.mpcCompetitor.findUniqueOrThrow({
        where: { id: input.competitorId },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (competitor.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const factorDef = await db.mpcFactorDef.findUniqueOrThrow({
        where: { id: input.factorDefId },
      });
      const score = factorDef.weight * input.rating;

      await db.mpcScore.upsert({
        where: {
          competitorId_factorDefId: {
            competitorId: input.competitorId,
            factorDefId: input.factorDefId,
          },
        },
        create: {
          competitorId: input.competitorId,
          factorDefId: input.factorDefId,
          rating: input.rating,
          score,
        },
        update: {
          rating: input.rating,
          score,
        },
      });

      // Recalculate competitor totalScore
      const allScores = await db.mpcScore.findMany({
        where: { competitorId: input.competitorId },
      });
      const totalScore = allScores.reduce((sum, s) => sum + s.score, 0);
      await db.mpcCompetitor.update({
        where: { id: input.competitorId },
        data: { totalScore },
      });

      return { score, totalScore };
    }),

  importFromAnalyses: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const items: Array<{ name: string; source: string }> = [];

      const compAnalysis = await db.competitiveAnalysis.findUnique({
        where: { cycleId: input.cycleId },
      });
      if (compAnalysis) {
        const data = JSON.parse(compAnalysis.data) as Array<{ label?: string }>;
        for (const item of data) {
          if (item.label) items.push({ name: item.label, source: "competitivo" });
        }
      }

      const indAttract = await db.industryAttractiveness.findUnique({
        where: { cycleId: input.cycleId },
      });
      if (indAttract) {
        const data = JSON.parse(indAttract.data) as Array<{ factor?: string }>;
        for (const item of data) {
          if (item.factor) items.push({ name: item.factor, source: "atractividad" });
        }
      }

      // Also import from Porter (competitive variable C)
      const porterFactors = await db.pestecFactor.findMany({
        where: { cycleId: input.cycleId, variable: "competitivo", confirmed: true },
      });
      for (const f of porterFactors) {
        items.push({ name: f.description, source: "porter" });
      }

      if (items.length === 0) return { count: 0 };

      const existingCount = await db.mpcFactorDef.count({
        where: { cycleId: input.cycleId },
      });
      const defaultWeight = Math.round((1 / items.length) * 100) / 100;

      const creates = items.map((item, i) =>
        db.mpcFactorDef.create({
          data: {
            cycleId: input.cycleId,
            name: item.name,
            weight: defaultWeight,
            source: item.source,
            sortOrder: existingCount + i,
            organizationId: ctx.organizationId,
          },
        })
      );

      await Promise.all(creates);
      return { count: items.length };
    }),
});
