import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";

export const industryAttractivenessRouter = router({
  get: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const record = await db.industryAttractiveness.findUnique({
        where: { cycleId: input.cycleId },
      });
      if (!record) return null;
      let parsed: Array<{ id: number; factor: string; impulsor: string; score: number }> = [];
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
            factor: z.string(),
            impulsor: z.string(),
            score: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dataStr = JSON.stringify(input.data);
      return db.industryAttractiveness.upsert({
        where: { cycleId: input.cycleId },
        create: { cycleId: input.cycleId, data: dataStr, organizationId: ctx.organizationId },
        update: { data: dataStr, organizationId: ctx.organizationId },
      });
    }),
});
