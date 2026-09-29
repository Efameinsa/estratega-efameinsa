import { z } from "zod";
import { router, editorProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";

export const ieRouter = router({
  saveRetainedStrategies: editorProcedure
    .input(
      z.object({
        cycleId: z.string(),
        strategies: z.array(
          z.object({
            code: z.string(),
            name: z.string(),
            description: z.string(),
            priority: z.enum(["alta", "media", "baja"]).optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.strategy.deleteMany({
        where: { cycleId: input.cycleId, type: "IE" },
      });
      if (input.strategies.length === 0) return { count: 0 };
      await db.strategy.createMany({
        data: input.strategies.map((s, i) => ({
          cycleId: input.cycleId,
          organizationId: ctx.organizationId!,
          code: s.code,
          description: `${s.name}: ${s.description}`,
          swotQuadrant: "DERIVED_IE",
          type: "IE",
          priority: s.priority,
          status: "proposed",
          sortOrder: i,
        })),
      });
      return { count: input.strategies.length };
    }),
});
