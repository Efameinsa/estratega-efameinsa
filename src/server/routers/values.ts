import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";

export const valuesRouter = router({
  list: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      return db.value.findMany({
        where: { cycleId: input.cycleId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  create: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        behaviors: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const count = await db.value.count({ where: { cycleId: input.cycleId } });
      return db.value.create({
        data: { ...input, sortOrder: count, organizationId: ctx.organizationId },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        behaviors: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const record = await db.value.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      const { id, ...data } = input;
      return db.value.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await db.value.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      return db.value.delete({ where: { id: input.id } });
    }),
});

export const ethicsRouter = router({
  list: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      return db.ethicsCode.findMany({
        where: { cycleId: input.cycleId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  create: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        category: z.string().min(1),
        description: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const count = await db.ethicsCode.count({ where: { cycleId: input.cycleId } });
      return db.ethicsCode.create({
        data: { ...input, sortOrder: count, organizationId: ctx.organizationId },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        category: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const record = await db.ethicsCode.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      const { id, ...data } = input;
      return db.ethicsCode.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await db.ethicsCode.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      return db.ethicsCode.delete({ where: { id: input.id } });
    }),
});
