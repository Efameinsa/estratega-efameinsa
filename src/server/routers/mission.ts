import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";

export const missionRouter = router({
  list: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      return db.mission.findMany({
        where: { cycleId: input.cycleId },
        orderBy: { createdAt: "desc" },
      });
    }),

  getActive: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      return db.mission.findFirst({
        where: { cycleId: input.cycleId, isActive: true },
      });
    }),

  create: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        text: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return db.mission.create({ data: { ...input, organizationId: ctx.organizationId } });
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
      const record = await db.mission.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      const { id, ...data } = input;
      return db.mission.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await db.mission.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      return db.mission.delete({ where: { id: input.id } });
    }),
});
