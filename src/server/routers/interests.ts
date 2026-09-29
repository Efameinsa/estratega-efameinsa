import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";

export const interestsRouter = router({
  list: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      return db.interest.findMany({
        where: { cycleId: input.cycleId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  create: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        description: z.string().min(1),
        intensity: z.string().min(1),
        allies: z.string().optional(),
        neutrals: z.string().optional(),
        adversaries: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const count = await db.interest.count({ where: { cycleId: input.cycleId } });
      return db.interest.create({
        data: { ...input, sortOrder: count, organizationId: ctx.organizationId },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string().min(1).optional(),
        intensity: z.string().optional(),
        allies: z.string().optional(),
        neutrals: z.string().optional(),
        adversaries: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const record = await db.interest.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      const { id, ...data } = input;
      return db.interest.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await db.interest.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      return db.interest.delete({ where: { id: input.id } });
    }),
});

export const cardinalRouter = router({
  list: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      return db.cardinalPrinciple.findMany({
        where: { cycleId: input.cycleId },
        orderBy: { createdAt: "asc" },
      });
    }),

  create: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        type: z.string().min(1),
        description: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return db.cardinalPrinciple.create({ data: { ...input, organizationId: ctx.organizationId } });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        type: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const record = await db.cardinalPrinciple.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      const { id, ...data } = input;
      return db.cardinalPrinciple.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await db.cardinalPrinciple.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      return db.cardinalPrinciple.delete({ where: { id: input.id } });
    }),
});
