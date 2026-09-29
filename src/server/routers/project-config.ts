import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, projectProcedure } from "@/server/trpc/init";

export const projectConfigRouter = router({
  // ---- Members ----
  addMember: projectProcedure
    .input(
      z.object({
        projectId: z.string(),
        userId: z.string(),
        role: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectMember.create({
        data: {
          projectId: input.projectId,
          userId: input.userId,
          role: input.role ?? "MEMBER",
        },
      });
    }),

  removeMember: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.projectMember.findUniqueOrThrow({
        where: { id: input.id },
        include: { project: { select: { orgId: true } } },
      });
      if (record.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este miembro" });
      }
      return ctx.db.projectMember.delete({ where: { id: input.id } });
    }),

  // ---- Workflow Statuses ----
  createWorkflowStatus: projectProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1),
        category: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
        color: z.string().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workflowStatus.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          category: input.category,
          color: input.color,
          sortOrder: input.sortOrder ?? 0,
        },
      });
    }),

  updateWorkflowStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        category: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
        color: z.string().nullable().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const record = await ctx.db.workflowStatus.findUniqueOrThrow({
        where: { id },
        include: { project: { select: { orgId: true } } },
      });
      if (record.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este estado" });
      }
      return ctx.db.workflowStatus.update({ where: { id }, data });
    }),

  deleteWorkflowStatus: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.workflowStatus.findUniqueOrThrow({
        where: { id: input.id },
        include: { project: { select: { orgId: true } } },
      });
      if (record.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este estado" });
      }
      return ctx.db.workflowStatus.delete({ where: { id: input.id } });
    }),

  // ---- Components ----
  createComponent: projectProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        leadId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.component.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          description: input.description,
          leadId: input.leadId,
        },
      });
    }),

  updateComponent: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        leadId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const record = await ctx.db.component.findUniqueOrThrow({
        where: { id },
        include: { project: { select: { orgId: true } } },
      });
      if (record.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este componente" });
      }
      return ctx.db.component.update({ where: { id }, data });
    }),

  deleteComponent: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.component.findUniqueOrThrow({
        where: { id: input.id },
        include: { project: { select: { orgId: true } } },
      });
      if (record.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este componente" });
      }
      return ctx.db.component.delete({ where: { id: input.id } });
    }),

  // ---- Labels ----
  createLabel: projectProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.label.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          color: input.color ?? "#6b7280",
        },
      });
    }),

  deleteLabel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.label.findUniqueOrThrow({
        where: { id: input.id },
        include: { project: { select: { orgId: true } } },
      });
      if (record.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a esta etiqueta" });
      }
      return ctx.db.label.delete({ where: { id: input.id } });
    }),

  // ---- Versions ----
  createVersion: projectProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        startDate: z.coerce.date().optional(),
        releaseDate: z.coerce.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.version.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          description: input.description,
          startDate: input.startDate,
          releaseDate: input.releaseDate,
        },
      });
    }),

  updateVersion: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        startDate: z.coerce.date().nullable().optional(),
        releaseDate: z.coerce.date().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const record = await ctx.db.version.findUniqueOrThrow({
        where: { id },
        include: { project: { select: { orgId: true } } },
      });
      if (record.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a esta version" });
      }
      return ctx.db.version.update({ where: { id }, data });
    }),

  deleteVersion: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.version.findUniqueOrThrow({
        where: { id: input.id },
        include: { project: { select: { orgId: true } } },
      });
      if (record.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a esta version" });
      }
      return ctx.db.version.delete({ where: { id: input.id } });
    }),
});
