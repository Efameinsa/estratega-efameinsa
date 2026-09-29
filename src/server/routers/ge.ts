import { z } from "zod";
import { router, editorProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";

export const geRouter = router({
  saveRetainedStrategies: editorProcedure
    .input(
      z.object({
        cycleId: z.string(),
        strategies: z.array(
          z.object({
            code: z.string(),
            name: z.string(),
            description: z.string(),
            priority: z.number().int(),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.strategy.deleteMany({
        where: { cycleId: input.cycleId, type: "GE" },
      });
      if (input.strategies.length === 0) return { count: 0 };
      await db.strategy.createMany({
        data: input.strategies.map((s, i) => ({
          cycleId: input.cycleId,
          organizationId: ctx.organizationId!,
          code: s.code,
          description: `${s.name}: ${s.description}`,
          swotQuadrant: "DERIVED_GE",
          type: "GE",
          status: "proposed",
          sortOrder: i,
        })),
      });
      return { count: input.strategies.length };
    }),
});
