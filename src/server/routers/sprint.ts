import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, projectProcedure } from "@/server/trpc/init";

export const sprintRouter = router({
  list: projectProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.sprint.findMany({
        where: { projectId: input.projectId },
        orderBy: { sortOrder: "desc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const record = await ctx.db.sprint.findUniqueOrThrow({
        where: { id: input.id },
        include: { project: { select: { orgId: true } } },
      });
      if (record.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este sprint" });
      }
      return record;
    }),

  create: projectProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1),
        goal: z.string().optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.sprint.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          goal: input.goal,
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
        goal: z.string().nullable().optional(),
        status: z.string().optional(),
        startDate: z.coerce.date().nullable().optional(),
        endDate: z.coerce.date().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const record = await ctx.db.sprint.findUniqueOrThrow({
        where: { id },
        include: { project: { select: { orgId: true } } },
      });
      if (record.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este sprint" });
      }
      return ctx.db.sprint.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.sprint.findUniqueOrThrow({
        where: { id: input.id },
        include: { project: { select: { orgId: true } } },
      });
      if (record.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este sprint" });
      }
      return ctx.db.sprint.delete({ where: { id: input.id } });
    }),

  start: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sprint = await ctx.db.sprint.findUniqueOrThrow({
        where: { id: input.id },
        include: { project: { select: { orgId: true } } },
      });
      if (sprint.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este sprint" });
      }

      return ctx.db.sprint.update({
        where: { id: input.id },
        data: {
          status: "ACTIVE",
          startDate: sprint.startDate ?? new Date(),
        },
      });
    }),

  complete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db;
      const existing = await db.sprint.findUniqueOrThrow({
        where: { id: input.id },
        include: { project: { select: { orgId: true } } },
      });
      if (existing.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este sprint" });
      }

      const sprint = await db.sprint.update({ where: { id: input.id }, data: { status: "COMPLETED" } });
      const incompleteIssues = await db.issue.findMany({
        where: { sprintId: input.id, status: { category: { not: "DONE" } } },
        select: { id: true },
      });
      if (incompleteIssues.length > 0) {
        const nextSprint = await db.sprint.findFirst({
          where: { projectId: sprint.projectId, status: "PLANNED", id: { not: input.id } },
          orderBy: { sortOrder: "asc" },
        });
        await db.issue.updateMany({
          where: { id: { in: incompleteIssues.map((i) => i.id) } },
          data: { sprintId: nextSprint?.id ?? null },
        });
      }
      return sprint;
    }),
});
