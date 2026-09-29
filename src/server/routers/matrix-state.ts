import { z } from "zod";
import { router, cycleProcedure, cycleEditorProcedure } from "@/server/trpc/init";

const KIND = z.enum(["bcg", "ge"]);

// Persistencia en servidor del estado de matrices interactivas (BCG, GE).
export const matrixStateRouter = router({
  get: cycleProcedure.input(z.object({ cycleId: z.string(), kind: KIND })).query(async ({ ctx, input }) => {
    const row = await ctx.db.matrixState.findUnique({
      where: { cycleId_kind: { cycleId: input.cycleId, kind: input.kind } },
      select: { data: true, updatedAt: true },
    });
    if (!row) return null;
    try {
      return { data: JSON.parse(row.data) as unknown, updatedAt: row.updatedAt };
    } catch {
      return null;
    }
  }),

  save: cycleEditorProcedure
    .input(z.object({ cycleId: z.string(), kind: KIND, data: z.unknown() }))
    .mutation(async ({ ctx, input }) => {
      const data = JSON.stringify(input.data ?? {});
      if (data.length > 500_000) throw new Error("El estado de la matriz es demasiado grande");
      await ctx.db.matrixState.upsert({
        where: { cycleId_kind: { cycleId: input.cycleId, kind: input.kind } },
        update: { data, updatedBy: ctx.userId },
        create: { cycleId: input.cycleId, kind: input.kind, data, updatedBy: ctx.userId },
      });
      return { ok: true };
    }),
});
