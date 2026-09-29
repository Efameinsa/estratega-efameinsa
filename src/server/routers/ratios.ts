import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";

export const ratiosRouter = router({
  list: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      return db.financialRatio.findMany({
        where: { cycleId: input.cycleId },
        orderBy: [{ category: "asc" }, { name: "asc" }, { year: "desc" }],
      });
    }),

  create: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        category: z.string().min(1),
        name: z.string().min(1),
        formula: z.string().optional(),
        value: z.number(),
        benchmark: z.number().optional(),
        year: z.number().int(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return db.financialRatio.create({ data: { ...input, organizationId: ctx.organizationId } });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        value: z.number().optional(),
        benchmark: z.number().optional(),
        name: z.string().min(1).optional(),
        formula: z.string().optional(),
        category: z.string().min(1).optional(),
        year: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const record = await db.financialRatio.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { id, ...data } = input;
      return db.financialRatio.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await db.financialRatio.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.financialRatio.delete({ where: { id: input.id } });
    }),
});
