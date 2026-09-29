import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";

export const competitiveAnalysisRouter = router({
  get: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const record = await db.competitiveAnalysis.findUnique({
        where: { cycleId: input.cycleId },
      });
      if (!record) return null;
      let parsed: Array<{ id: number; label: string; value: number }> = [];
      try {
        parsed = JSON.parse(record.data);
      } catch {
        parsed = [];
      }
      return { ...record, data: parsed };
    }),

  upsert: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        data: z.array(
          z.object({
            id: z.number(),
            label: z.string(),
            value: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dataStr = JSON.stringify(input.data);
      return db.competitiveAnalysis.upsert({
        where: { cycleId: input.cycleId },
        create: { cycleId: input.cycleId, data: dataStr, organizationId: ctx.organizationId },
        update: { data: dataStr, organizationId: ctx.organizationId },
      });
    }),
});
