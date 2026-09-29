import { z } from "zod";
import { router, protectedProcedure, editorProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";

const FactorTypeSchema = z.enum(["F", "O", "D", "A"]);
const CrossTypeSchema = z.enum(["FO", "FA", "DO", "DA"]);

const OriginInputSchema = z.object({
  factorType: FactorTypeSchema,
  factorId: z.string(),
  factorCode: z.string().optional(),
  factorText: z.string().optional(),
});

export const fodaCruzadoRouter = router({
  // ───────────────────────────────────────────────────────────────────
  // getSetup — devuelve FODA Consolidado + estrategias con origenes
  // ───────────────────────────────────────────────────────────────────
  getSetup: protectedProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const cycleId = input.cycleId;
      const [mefiFactors, mefeFactors, strategies] = await Promise.all([
        db.mefiFactor.findMany({
          where: { cycleId },
          orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
        }),
        db.mefeFactor.findMany({
          where: { cycleId },
          orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
        }),
        db.strategy.findMany({
          where: { cycleId, swotQuadrant: { in: ["FO", "FA", "DO", "DA"] } },
          include: { origins: true },
          orderBy: { sortOrder: "asc" },
        }),
      ]);

      // Asignar codigos F1/F2/D1/O1/A1 segun orden
      let fIdx = 0, dIdx = 0;
      const fortalezas = mefiFactors
        .filter((f) => f.type === "F")
        .map((f) => ({ id: f.id, code: `F${++fIdx}`, text: f.description, weight: f.weight, rating: f.rating }));
      const debilidades = mefiFactors
        .filter((f) => f.type === "D")
        .map((f) => ({ id: f.id, code: `D${++dIdx}`, text: f.description, weight: f.weight, rating: f.rating }));

      let oIdx = 0, aIdx = 0;
      const oportunidades = mefeFactors
        .filter((f) => f.type === "O")
        .map((f) => ({ id: f.id, code: `O${++oIdx}`, text: f.description, weight: f.weight, rating: f.rating }));
      const amenazas = mefeFactors
        .filter((f) => f.type === "A")
        .map((f) => ({ id: f.id, code: `A${++aIdx}`, text: f.description, weight: f.weight, rating: f.rating }));

      // Asignar codigos E1, E2... a las estrategias
      const enrichedStrategies = strategies.map((s, i) => ({
        ...s,
        eCode: s.code ?? `E${i + 1}`,
      }));

      return {
        fortalezas,
        oportunidades,
        debilidades,
        amenazas,
        strategies: enrichedStrategies,
      };
    }),

  // ───────────────────────────────────────────────────────────────────
  // createWithOrigins — crea Strategy + StrategyOrigin de los factores
  // ───────────────────────────────────────────────────────────────────
  createWithOrigins: editorProcedure
    .input(
      z.object({
        cycleId: z.string(),
        crossType: CrossTypeSchema,
        description: z.string().min(1),
        type: z.string().optional(),
        horizon: z.enum(["corto", "mediano", "largo"]).optional(),
        priority: z.enum(["alta", "media", "baja"]).optional(),
        justification: z.string().optional(),
        origins: z.array(OriginInputSchema).min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const count = await db.strategy.count({
        where: { cycleId: input.cycleId, swotQuadrant: { in: ["FO", "FA", "DO", "DA"] } },
      });
      const code = `E${count + 1}`;
      const strategy = await db.strategy.create({
        data: {
          cycleId: input.cycleId,
          organizationId: ctx.organizationId!,
          code,
          description: input.description,
          swotQuadrant: input.crossType,
          crossType: input.crossType,
          type: input.type,
          horizon: input.horizon,
          priority: input.priority,
          justification: input.justification,
          status: "proposed",
          sortOrder: count,
        },
      });
      await db.strategyOrigin.createMany({
        data: input.origins.map((o) => ({
          strategyId: strategy.id,
          factorType: o.factorType,
          factorId: o.factorId,
          factorCode: o.factorCode,
          factorText: o.factorText,
        })),
      });
      return strategy;
    }),

  // ───────────────────────────────────────────────────────────────────
  // updateWithOrigins — actualiza Strategy + reemplaza origenes
  // ───────────────────────────────────────────────────────────────────
  updateWithOrigins: editorProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string().min(1).optional(),
        crossType: CrossTypeSchema.optional(),
        type: z.string().optional(),
        horizon: z.enum(["corto", "mediano", "largo"]).optional(),
        priority: z.enum(["alta", "media", "baja"]).optional(),
        justification: z.string().optional(),
        status: z.string().optional(),
        origins: z.array(OriginInputSchema).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, origins, crossType, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (crossType) {
        data.crossType = crossType;
        data.swotQuadrant = crossType;
      }
      const strategy = await db.strategy.update({ where: { id }, data });
      if (origins) {
        await db.strategyOrigin.deleteMany({ where: { strategyId: id } });
        if (origins.length > 0) {
          await db.strategyOrigin.createMany({
            data: origins.map((o) => ({
              strategyId: id,
              factorType: o.factorType,
              factorId: o.factorId,
              factorCode: o.factorCode,
              factorText: o.factorText,
            })),
          });
        }
      }
      return strategy;
    }),

  delete: editorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.strategy.delete({ where: { id: input.id } });
    }),

  setStatus: editorProcedure
    .input(z.object({ id: z.string(), status: z.string() }))
    .mutation(async ({ input }) => {
      return db.strategy.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),
});
