import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";

export const strategyRouter = router({
  list: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      return db.strategy.findMany({
        where: { cycleId: input.cycleId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  create: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        description: z.string().min(1),
        swotQuadrant: z.string(),
        code: z.string().optional(),
        type: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const count = await db.strategy.count({ where: { cycleId: input.cycleId } });
      return db.strategy.create({
        data: { ...input, sortOrder: count, organizationId: ctx.organizationId },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string().min(1).optional(),
        swotQuadrant: z.string().optional(),
        code: z.string().optional(),
        type: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const record = await db.strategy.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { id, ...data } = input;
      return db.strategy.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await db.strategy.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.strategy.delete({ where: { id: input.id } });
    }),
});
