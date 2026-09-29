import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";

export const portfolioRouter = router({
  list: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.portfolio.findMany({
        where: { cycleId: input.cycleId },
        include: { axis: true },
        orderBy: { sortOrder: "asc" },
      });
    }),

  listAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.portfolio.findMany({
      where: { cycle: { organizationId: ctx.organizationId } },
      include: { axis: true, programs: true },
      orderBy: { name: "asc" },
    });
  }),

  create: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        axisId: z.string().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        ownerId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.portfolio.create({
        data: {
          cycleId: input.cycleId,
          axisId: input.axisId,
          name: input.name,
          description: input.description,
          ownerId: input.ownerId,
          organizationId: ctx.organizationId,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        axisId: z.string().nullable().optional(),
        ownerId: z.string().nullable().optional(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.portfolio.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { id, ...data } = input;
      return ctx.db.portfolio.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.portfolio.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return ctx.db.portfolio.delete({ where: { id: input.id } });
    }),
});
