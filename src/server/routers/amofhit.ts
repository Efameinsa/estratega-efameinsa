import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";

export const amofhitRouter = router({
  list: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      return db.amofhitArea.findMany({
        where: { cycleId: input.cycleId },
        orderBy: { area: "asc" },
      });
    }),

  getByArea: cycleProcedure
    .input(z.object({ cycleId: z.string(), area: z.string() }))
    .query(async ({ input }) => {
      const record = await db.amofhitArea.findUnique({
        where: { cycleId_area: { cycleId: input.cycleId, area: input.area } },
      });
      if (!record) return null;
      return {
        ...record,
        findings: JSON.parse(record.findings) as unknown,
      };
    }),

  upsert: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        area: z.string(),
        findings: z.unknown(),
        notes: z.string().optional(),
        score: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const findingsStr = JSON.stringify(input.findings);
      return db.amofhitArea.upsert({
        where: {
          cycleId_area: { cycleId: input.cycleId, area: input.area },
        },
        create: {
          cycleId: input.cycleId,
          area: input.area,
          findings: findingsStr,
          notes: input.notes,
          score: input.score,
          organizationId: ctx.organizationId,
        },
        update: {
          findings: findingsStr,
          notes: input.notes,
          score: input.score,
          organizationId: ctx.organizationId,
        },
      });
    }),
});
