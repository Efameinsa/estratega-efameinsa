import { z } from "zod";
import { router, cycleEditorProcedure } from "@/server/trpc/init";

// Estrategias que salen de la Matriz BCG (una por unidad de negocio) y que la
// Matriz de Decisión consolida junto con FODA cruzado, PEYEA, IE y GE.
export const bcgRouter = router({
  saveRetainedStrategies: cycleEditorProcedure
    .input(
      z.object({
        cycleId: z.string(),
        strategies: z.array(z.object({ code: z.string(), name: z.string(), description: z.string() })).max(40),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.db.strategy.deleteMany({ where: { cycleId: input.cycleId, type: "BCG" } });
      if (input.strategies.length === 0) return { count: 0 };
      await ctx.db.strategy.createMany({
        data: input.strategies.map((s, i) => ({
          cycleId: input.cycleId,
          organizationId: ctx.organizationId!,
          code: s.code,
          description: `${s.name}: ${s.description}`,
          swotQuadrant: "DERIVED_BCG",
          type: "BCG",
          status: "proposed",
          sortOrder: i,
        })),
      });
      return { count: input.strategies.length };
    }),
});
