import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";

export const mefeRouter = router({
  list: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      return db.mefeFactor.findMany({
        where: { cycleId: input.cycleId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  getSummary: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const [factors, state] = await Promise.all([
        db.mefeFactor.findMany({ where: { cycleId: input.cycleId } }),
        db.mefeState.findUnique({ where: { cycleId: input.cycleId } }),
      ]);

      const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
      const ppt = factors.reduce((sum, f) => sum + f.score, 0);
      const oportunidades = factors.filter((f) => f.type === "O").length;
      const amenazas = factors.filter((f) => f.type === "A").length;

      return {
        totalWeight,
        ppt,
        isWeightValid: Math.abs(totalWeight - 1) < 0.005,
        weightDiff: 1 - totalWeight,
        count: factors.length,
        oportunidades,
        amenazas,
        status: state?.status ?? "en_construccion",
        pptFinal: state?.pptFinal ?? null,
      };
    }),

  getState: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      return db.mefeState.findUnique({ where: { cycleId: input.cycleId } });
    }),

  // Sync MEFE factors from PESTEC (confirmed+includeInMefe) + Porter (accepted factors)
  syncFromPestec: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Source 1: ALL confirmed PESTEC factors (auto-include in MEFE)
      const pestecFactors = await db.pestecFactor.findMany({
        where: {
          cycleId: input.cycleId,
          confirmed: true,
          variable: { notIn: ["porter", "competitivo"] },
        },
      });

      // Source 2: ALL Porter factors (accepted from 5 forces analysis)
      const porterFactors = await db.pestecFactor.findMany({
        where: {
          cycleId: input.cycleId,
          variable: { in: ["porter", "competitivo"] },
        },
      });

      // Dedupe by description
      const seen = new Set<string>();
      const allFactors = [...pestecFactors, ...porterFactors].filter((f) => {
        if (seen.has(f.description)) return false;
        seen.add(f.description);
        return true;
      });

      if (allFactors.length === 0) return { imported: 0, manual: 0 };

      // Get existing MEFE factors to avoid duplicates — NEVER delete existing adjusted factors
      const existing = await db.mefeFactor.findMany({
        where: { cycleId: input.cycleId },
      });
      const existingSourceIds = new Set(
        existing.filter((f) => f.sourceFactorId).map((f) => f.sourceFactorId),
      );

      // Only add NEW factors that don't already exist in MEFE
      const newFactors = allFactors.filter((f) => !existingSourceIds.has(f.id));

      if (newFactors.length === 0) return { imported: 0, manual: existing.filter((f) => !f.sourceFactorId).length };

      const nextOrder = existing.length;
      const totalAfter = existing.length + newFactors.length;
      const defaultWeight = totalAfter > 0 ? Math.round((1 / totalAfter) * 100) / 100 : 0.05;

      const creates = newFactors.map((f, i) => {
        const rating = f.rating > 0 ? f.rating : (f.type === "O" ? 3 : 2);
        return db.mefeFactor.create({
          data: {
            cycleId: input.cycleId,
            description: f.description,
            originalDescription: f.description,
            sourceFactorId: f.id,
            type: f.type,
            weight: defaultWeight,
            rating,
            score: defaultWeight * rating,
            variable: f.variable,
            sortOrder: nextOrder + i,
            organizationId: ctx.organizationId,
          },
        });
      });

      await Promise.all(creates);

      await db.mefeState.upsert({
        where: { cycleId: input.cycleId },
        create: { cycleId: input.cycleId, status: "en_construccion", organizationId: ctx.organizationId },
        update: { organizationId: ctx.organizationId },
      });

      return { imported: newFactors.length, manual: existing.filter((f) => !f.sourceFactorId).length };
    }),

  // Legacy import
  importFromPesteAndPorter: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const pestecFactors = await db.pestecFactor.findMany({
        where: { cycleId: input.cycleId, variable: { not: "competitivo" } },
      });
      const porterFactors = await db.pestecFactor.findMany({
        where: { cycleId: input.cycleId, variable: "porter" },
      });

      const allFactors = [...pestecFactors, ...porterFactors];
      if (allFactors.length === 0) return { count: 0 };

      const defaultWeight = 1 / allFactors.length;
      const existingCount = await db.mefeFactor.count({ where: { cycleId: input.cycleId } });

      const creates = allFactors.map((f, i) => {
        const rating = f.type === "O" ? 3 : 2;
        return db.mefeFactor.create({
          data: {
            cycleId: input.cycleId,
            description: f.description,
            type: f.type,
            weight: defaultWeight,
            rating,
            score: defaultWeight * rating,
            sortOrder: existingCount + i,
            organizationId: ctx.organizationId,
          },
        });
      });

      await Promise.all(creates);
      return { count: allFactors.length };
    }),

  create: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        description: z.string().min(1),
        type: z.enum(["O", "A"]),
        weight: z.number().min(0.01).max(0.30),
        rating: z.number().int().min(1).max(4),
        variable: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const count = await db.mefeFactor.count({ where: { cycleId: input.cycleId } });
      if (count >= 20) throw new Error("No se pueden tener mas de 20 factores en la MEFE");
      const score = input.weight * input.rating;
      return db.mefeFactor.create({
        data: { ...input, score, sortOrder: count, originalDescription: input.description, organizationId: ctx.organizationId },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string().min(1).optional(),
        type: z.enum(["O", "A"]).optional(),
        weight: z.number().min(0.01).max(0.30).optional(),
        rating: z.number().int().min(1).max(4).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const record = await db.mefeFactor.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      const weight = data.weight ?? record.weight;
      const rating = data.rating ?? record.rating;
      return db.mefeFactor.update({
        where: { id },
        data: { ...data, score: weight * rating },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await db.mefeFactor.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      return db.mefeFactor.delete({ where: { id: input.id } });
    }),

  finalize: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const factors = await db.mefeFactor.findMany({ where: { cycleId: input.cycleId } });

      // Validation 1: factor count
      if (factors.length < 10) throw new Error("La MEFE debe tener al menos 10 factores");
      if (factors.length > 20) throw new Error("La MEFE no puede tener mas de 20 factores");

      // Validation 2: at least 1 O and 1 A
      const oportunidades = factors.filter((f) => f.type === "O").length;
      const amenazas = factors.filter((f) => f.type === "A").length;
      if (oportunidades === 0 || amenazas === 0) {
        throw new Error("La MEFE debe tener al menos 1 oportunidad y 1 amenaza");
      }

      // Validation 3: no incomplete factors (Porter without weight/rating)
      const incomplete = factors.filter((f) => f.weight < 0.01 || f.rating === 0);
      if (incomplete.length > 0) {
        throw new Error(`Hay ${incomplete.length} factor(es) sin peso o calificacion asignada`);
      }

      // Validation 4: weight sum
      const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
      if (Math.abs(totalWeight - 1) > 0.005) {
        throw new Error(`La suma de pesos debe ser 1.00 (actual: ${totalWeight.toFixed(3)})`);
      }

      // Validation 5: no individual weight > 0.30
      const highWeight = factors.find((f) => f.weight > 0.30);
      if (highWeight) {
        throw new Error(`El factor "${highWeight.description}" tiene peso ${highWeight.weight.toFixed(2)} que supera 0.30`);
      }

      const ppt = factors.reduce((sum, f) => sum + f.score, 0);

      await db.mefeState.upsert({
        where: { cycleId: input.cycleId },
        create: {
          cycleId: input.cycleId, status: "finalizada",
          pptFinal: ppt, finalizedAt: new Date(), finalizedBy: ctx.userId,
          organizationId: ctx.organizationId,
        },
        update: {
          status: "finalizada", pptFinal: ppt,
          finalizedAt: new Date(), finalizedBy: ctx.userId,
          organizationId: ctx.organizationId,
        },
      });

      return { ppt, count: factors.length };
    }),

  unlock: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .mutation(async ({ input }) => {
      await db.mefeState.update({
        where: { cycleId: input.cycleId },
        data: { status: "lista_para_ajuste", pptFinal: null, finalizedAt: null },
      });
    }),

  getForFoda: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const factors = await db.mefeFactor.findMany({
        where: { cycleId: input.cycleId },
        orderBy: { score: "desc" },
      });

      const oportunidades = factors
        .filter((f) => f.type === "O")
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5)
        .map((f) => ({ id: f.sourceFactorId ?? f.id, texto: f.description, score: f.rating }));

      const amenazas = factors
        .filter((f) => f.type === "A")
        .sort((a, b) => a.rating - b.rating)
        .slice(0, 5)
        .map((f) => ({ id: f.sourceFactorId ?? f.id, texto: f.description, score: f.rating }));

      return { oportunidades, amenazas };
    }),
});
