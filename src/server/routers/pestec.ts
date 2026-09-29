import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";

export const pestecRouter = router({
  list: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      return db.pestecFactor.findMany({
        where: { cycleId: input.cycleId },
        orderBy: [{ variable: "asc" }, { sortOrder: "asc" }],
      });
    }),

  byVariable: cycleProcedure
    .input(z.object({ cycleId: z.string(), variable: z.string() }))
    .query(async ({ input }) => {
      return db.pestecFactor.findMany({
        where: { cycleId: input.cycleId, variable: input.variable },
        orderBy: { sortOrder: "asc" },
      });
    }),

  toggle: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        variable: z.string(),
        description: z.string(),
        subVarType: z.enum(["primaria", "secundaria", "personalizada"]),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.enabled) {
        // Check if already exists to avoid duplicates
        const existing = await db.pestecFactor.findFirst({
          where: {
            cycleId: input.cycleId,
            variable: input.variable,
            description: input.description,
          },
        });
        if (existing) return existing;

        const count = await db.pestecFactor.count({
          where: { cycleId: input.cycleId, variable: input.variable },
        });
        return db.pestecFactor.create({
          data: {
            cycleId: input.cycleId,
            variable: input.variable,
            description: input.description,
            subVarType: input.subVarType,
            sortOrder: count,
            organizationId: ctx.organizationId,
          },
        });
      } else {
        const factor = await db.pestecFactor.findFirst({
          where: {
            cycleId: input.cycleId,
            variable: input.variable,
            description: input.description,
          },
        });
        if (factor) {
          await db.pestecFactor.delete({ where: { id: factor.id } });
        }
        return null;
      }
    }),

  create: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        variable: z.string(),
        description: z.string().min(1),
        subVarType: z.enum(["primaria", "secundaria", "personalizada"]),
        type: z.enum(["O", "A"]),
        impact: z.number().int(),
        probability: z.number().int(),
        trend: z.string().optional(),
        source: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const count = await db.pestecFactor.count({
        where: { cycleId: input.cycleId, variable: input.variable },
      });
      return db.pestecFactor.create({
        data: { ...input, sortOrder: count, organizationId: ctx.organizationId },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string().min(1).optional(),
        type: z.enum(["O", "A"]).optional(),
        impact: z.number().int().optional(),
        probability: z.number().int().optional(),
        rating: z.number().int().min(0).max(4).optional(),
        hallazgo: z.string().nullable().optional(),
        evidenceChips: z.string().optional(),
        evidenceNotes: z.string().nullable().optional(),
        confirmed: z.boolean().optional(),
        includeInMefe: z.boolean().optional(),
        trend: z.string().nullable().optional(),
        source: z.string().nullable().optional(),
      }),
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
      const updated = await db.pestecFactor.update({ where: { id }, data });

      // Auto-sync to MEFE when confirmed + includeInMefe.
      // Excludes the Porter variables (they go through a dedicated flow).
      const isPorterVar = updated.variable === "porter" || updated.variable === "competitivo";
      if (!isPorterVar) {
        if (updated.confirmed && updated.includeInMefe) {
          const existingMefe = await db.mefeFactor.findFirst({
            where: { cycleId: updated.cycleId, sourceFactorId: updated.id },
          });
          const rating = updated.rating > 0 ? updated.rating : updated.type === "O" ? 3 : 2;
          if (!existingMefe) {
            // Distribute default weight; user can adjust later in MEFE editor.
            const count = await db.mefeFactor.count({ where: { cycleId: updated.cycleId } });
            const defaultWeight = Math.round((1 / Math.max(count + 1, 10)) * 100) / 100;
            await db.mefeFactor.create({
              data: {
                cycleId: updated.cycleId,
                organizationId: ctx.organizationId,
                description: updated.description,
                originalDescription: updated.description,
                sourceFactorId: updated.id,
                type: updated.type,
                weight: defaultWeight,
                rating,
                score: defaultWeight * rating,
                variable: updated.variable,
                sortOrder: count,
              },
            });
            await db.mefeState.upsert({
              where: { cycleId: updated.cycleId },
              create: {
                cycleId: updated.cycleId,
                organizationId: ctx.organizationId,
                status: "en_construccion",
              },
              update: {},
            });
          } else {
            // Keep MEFE row in sync with the latest PESTEC type/description/rating
            // but only when the user has not edited the MEFE description manually.
            const description =
              existingMefe.description === existingMefe.originalDescription
                ? updated.description
                : existingMefe.description;
            await db.mefeFactor.update({
              where: { id: existingMefe.id },
              data: {
                description,
                originalDescription: updated.description,
                type: updated.type,
                rating,
                score: existingMefe.weight * rating,
              },
            });
          }
        } else if (data.includeInMefe === false || data.confirmed === false) {
          // Remove derived MEFE row if user opted out or unconfirmed.
          await db.mefeFactor.deleteMany({
            where: { cycleId: updated.cycleId, sourceFactorId: updated.id },
          });
        }
      }

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const factor = await db.pestecFactor.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (factor.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // Cascade: remove any derived MEFE row before deleting the PESTEC factor.
      await db.mefeFactor.deleteMany({
        where: { cycleId: factor.cycleId, sourceFactorId: factor.id },
      });
      return db.pestecFactor.delete({ where: { id: input.id } });
    }),
});
