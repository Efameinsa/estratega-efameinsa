import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";

export const porterRouter = router({
  get: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const record = await db.porterAnalysis.findUnique({
        where: { cycleId: input.cycleId },
      });
      if (!record) return null;
      return {
        ...record,
        data: JSON.parse(record.data) as Record<string, unknown>,
      };
    }),

  upsert: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        data: z.record(z.string(), z.unknown()),
        overallScore: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dataStr = JSON.stringify(input.data);
      return db.porterAnalysis.upsert({
        where: { cycleId: input.cycleId },
        create: {
          cycleId: input.cycleId,
          data: dataStr,
          overallScore: input.overallScore,
          organizationId: ctx.organizationId,
        },
        update: {
          data: dataStr,
          overallScore: input.overallScore,
          organizationId: ctx.organizationId,
        },
      });
    }),

  listFactors: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      return db.pestecFactor.findMany({
        where: { cycleId: input.cycleId, variable: "porter" },
        orderBy: { sortOrder: "asc" },
      });
    }),

  createFactor: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        description: z.string().min(1),
        type: z.enum(["O", "A"]),
        impact: z.number().int(),
        probability: z.number().int(),
        trend: z.string().optional(),
        source: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const count = await db.pestecFactor.count({
        where: { cycleId: input.cycleId, variable: "porter" },
      });
      return db.pestecFactor.create({
        data: {
          ...input,
          variable: "porter",
          subVarType: "primaria",
          sortOrder: count,
          organizationId: ctx.organizationId,
        },
      });
    }),

  updateFactor: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string().min(1).optional(),
        type: z.enum(["O", "A"]).optional(),
        impact: z.number().int().optional(),
        probability: z.number().int().optional(),
        trend: z.string().optional(),
        source: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const factor = await db.pestecFactor.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (factor.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { id, ...data } = input;
      return db.pestecFactor.update({ where: { id }, data });
    }),

  deleteFactor: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const factor = await db.pestecFactor.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (factor.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.pestecFactor.delete({ where: { id: input.id } });
    }),
});
