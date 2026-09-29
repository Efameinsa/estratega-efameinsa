import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";

export const visionRouter = router({
  list: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      return db.vision.findMany({
        where: { cycleId: input.cycleId },
        orderBy: { createdAt: "desc" },
      });
    }),

  getActive: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      return db.vision.findFirst({
        where: { cycleId: input.cycleId, isActive: true },
      });
    }),

  create: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        text: z.string().min(1),
        timeHorizon: z.number().int().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return db.vision.create({ data: { ...input, organizationId: ctx.organizationId } });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        text: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const record = await db.vision.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      const { id, ...data } = input;
      return db.vision.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await db.vision.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      return db.vision.delete({ where: { id: input.id } });
    }),
});
