import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, projectProcedure } from "@/server/trpc/init";
import { hasPermission, type OrgRole } from "@/lib/permissions";

export const projectRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.project.findMany({
      where: { orgId: ctx.organizationId },
      include: { program: true, portfolio: true },
      orderBy: { createdAt: "desc" },
    });
  }),

  listByOcp: protectedProcedure
    .input(z.object({ ocpId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.project.findMany({
        where: { orgId: ctx.organizationId, ocpId: input.ocpId },
        orderBy: { createdAt: "asc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          portfolio: true,
          program: true,
          members: { include: { user: { select: { id: true, name: true, email: true } } } },
          sprints: { orderBy: { sortOrder: "asc" } },
          components: true,
          labels: true,
          versions: true,
          workflows: { orderBy: { sortOrder: "asc" } },
        },
      });
      if (project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este proyecto" });
      }
      return project;
    }),

  create: protectedProcedure
    .input(
      z.object({
        portfolioId: z.string().optional(),
        programId: z.string().optional(),
        ocpId: z.string().optional(),
        key: z.string().min(1).max(10),
        name: z.string().min(1),
        description: z.string().optional(),
        ownerId: z.string().optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await ctx.db.organizationMember.findUnique({
        where: { userId_organizationId: { userId: ctx.userId, organizationId: ctx.organizationId } },
      });
      if (!membership || !hasPermission(membership.orgRole as OrgRole, "PROJECT_CREATE")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para crear proyectos" });
      }
      const project = await ctx.db.project.create({
        data: {
          orgId: ctx.organizationId ?? "",
          portfolioId: input.portfolioId,
          programId: input.programId,
          ocpId: input.ocpId,
          key: input.key,
          name: input.name,
          description: input.description,
          ownerId: input.ownerId,
          startDate: input.startDate,
          endDate: input.endDate,
        },
      });

      await ctx.db.workflowStatus.createMany({
        data: [
          { projectId: project.id, name: "Por Hacer", category: "TODO", sortOrder: 0 },
          { projectId: project.id, name: "En Progreso", category: "IN_PROGRESS", sortOrder: 1 },
          { projectId: project.id, name: "En Revision", category: "IN_PROGRESS", sortOrder: 2 },
          { projectId: project.id, name: "Hecho", category: "DONE", sortOrder: 3 },
        ],
      });

      return project;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        portfolioId: z.string().nullable().optional(),
        programId: z.string().nullable().optional(),
        startDate: z.coerce.date().nullable().optional(),
        endDate: z.coerce.date().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const project = await ctx.db.project.findUniqueOrThrow({ where: { id } });
      if (project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este proyecto" });
      }
      return ctx.db.project.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUniqueOrThrow({ where: { id: input.id } });
      if (project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este proyecto" });
      }
      return ctx.db.project.delete({ where: { id: input.id } });
    }),
});
