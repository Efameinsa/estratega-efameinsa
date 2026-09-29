import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";

export const programRouter = router({
  list: protectedProcedure
    .input(z.object({ portfolioId: z.string() }))
    .query(async ({ ctx, input }) => {
      const portfolio = await ctx.db.portfolio.findUniqueOrThrow({
        where: { id: input.portfolioId },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (portfolio.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return ctx.db.program.findMany({
        where: { portfolioId: input.portfolioId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  listAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.program.findMany({
      where: { portfolio: { cycle: { organizationId: ctx.organizationId } } },
      include: { portfolio: true },
      orderBy: { name: "asc" },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        portfolioId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        ownerId: z.string().optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const portfolio = await ctx.db.portfolio.findUniqueOrThrow({
        where: { id: input.portfolioId },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (portfolio.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return ctx.db.program.create({
        data: {
          portfolioId: input.portfolioId,
          name: input.name,
          description: input.description,
          ownerId: input.ownerId,
          startDate: input.startDate,
          endDate: input.endDate,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        ownerId: z.string().nullable().optional(),
        status: z.string().optional(),
        startDate: z.coerce.date().nullable().optional(),
        endDate: z.coerce.date().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.program.findUniqueOrThrow({
        where: { id: input.id },
        include: { portfolio: { include: { cycle: { select: { organizationId: true } } } } },
      });
      if (record.portfolio.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { id, ...data } = input;
      return ctx.db.program.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.program.findUniqueOrThrow({
        where: { id: input.id },
        include: { portfolio: { include: { cycle: { select: { organizationId: true } } } } },
      });
      if (record.portfolio.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return ctx.db.program.delete({ where: { id: input.id } });
    }),
});
