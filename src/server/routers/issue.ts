import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, projectProcedure } from "@/server/trpc/init";

export const issueRouter = router({
  list: projectProcedure
    .input(
      z.object({
        projectId: z.string(),
        type: z.string().optional(),
        statusId: z.string().optional(),
        assigneeId: z.string().optional(),
        sprintId: z.string().nullable().optional(),
        parentId: z.string().nullable().optional(),
        priority: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { projectId, type, statusId, assigneeId, sprintId, parentId, priority, search } = input;

      return ctx.db.issue.findMany({
        where: {
          projectId,
          ...(type !== undefined && { type }),
          ...(statusId !== undefined && { statusId }),
          ...(assigneeId !== undefined && { assigneeId }),
          ...(sprintId !== undefined && { sprintId }),
          ...(parentId !== undefined && { parentId }),
          ...(priority !== undefined && { priority }),
          ...(search && { summary: { contains: search } }),
        },
        include: {
          status: true,
          component: true,
          sprint: true,
          version: true,
          labels: { include: { label: true } },
          parent: true,
          children: {
            include: { status: true },
            orderBy: { sortOrder: "asc" },
          },
          _count: { select: { children: true } },
          linksFrom: { select: { id: true, type: true, toIssueId: true } },
          linksTo: { select: { id: true, type: true, fromIssueId: true } },
        },
        orderBy: { sortOrder: "asc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const record = await ctx.db.issue.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          project: { select: { orgId: true } },
          status: true,
          component: true,
          sprint: true,
          version: true,
          parent: true,
          children: { include: { status: true } },
          labels: { include: { label: true } },
          comments: { orderBy: { createdAt: "asc" } },
          attachments: true,
          history: { orderBy: { createdAt: "desc" } },
          watchers: true,
          timeEntries: true,
          linksFrom: {
            include: {
              toIssue: { include: { project: true } },
            },
          },
          linksTo: {
            include: {
              fromIssue: { include: { project: true } },
            },
          },
        },
      });
      if (record.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este issue" });
      }
      return record;
    }),

  create: projectProcedure
    .input(
      z.object({
        projectId: z.string(),
        type: z.string(),
        summary: z.string().min(1),
        description: z.string().optional(),
        priority: z.string().optional(),
        assigneeId: z.string().optional(),
        reporterId: z.string().optional(),
        componentId: z.string().optional(),
        sprintId: z.string().optional(),
        versionId: z.string().optional(),
        parentId: z.string().optional(),
        storyPoints: z.number().int().optional(),
        estimateHours: z.number().optional(),
        startDate: z.coerce.date().optional(),
        dueDate: z.coerce.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db;

      // Auto-calculate issue number
      const maxIssue = await db.issue.findFirst({
        where: { projectId: input.projectId },
        orderBy: { number: "desc" },
        select: { number: true },
      });
      const nextNumber = (maxIssue?.number ?? 0) + 1;

      // Get default status (first TODO status for project)
      const defaultStatus = await db.workflowStatus.findFirst({
        where: { projectId: input.projectId, category: "TODO" },
        orderBy: { sortOrder: "asc" },
        select: { id: true },
      });

      const issue = await db.issue.create({
        data: {
          projectId: input.projectId,
          number: nextNumber,
          type: input.type,
          summary: input.summary,
          description: input.description,
          priority: input.priority ?? "MEDIUM",
          assigneeId: input.assigneeId,
          reporterId: input.reporterId ?? ctx.userId,
          componentId: input.componentId,
          sprintId: input.sprintId,
          versionId: input.versionId,
          parentId: input.parentId,
          storyPoints: input.storyPoints,
          estimateHours: input.estimateHours,
          startDate: input.startDate,
          dueDate: input.dueDate,
          statusId: defaultStatus?.id ?? null,
        },
      });

      await db.issueHistory.create({
        data: {
          issueId: issue.id,
          userId: ctx.userId ?? "",
          field: "created",
        },
      });

      return issue;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        summary: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        statusId: z.string().nullable().optional(),
        priority: z.string().optional(),
        resolution: z.string().nullable().optional(),
        assigneeId: z.string().nullable().optional(),
        componentId: z.string().nullable().optional(),
        sprintId: z.string().nullable().optional(),
        versionId: z.string().nullable().optional(),
        parentId: z.string().nullable().optional(),
        storyPoints: z.number().int().nullable().optional(),
        estimateHours: z.number().nullable().optional(),
        startDate: z.coerce.date().nullable().optional(),
        dueDate: z.coerce.date().nullable().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const db = ctx.db;
      const existing = await db.issue.findUniqueOrThrow({
        where: { id },
        select: {
          summary: true, description: true, statusId: true, priority: true,
          resolution: true, assigneeId: true, componentId: true, sprintId: true,
          versionId: true, parentId: true, storyPoints: true, estimateHours: true,
          startDate: true, dueDate: true, sortOrder: true,
          project: { select: { orgId: true } },
        },
      });

      if (existing.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este issue" });
      }

      const historyEntries: { issueId: string; userId: string; field: string; oldValue: string | null; newValue: string | null }[] = [];
      for (const [key, newVal] of Object.entries(updates)) {
        if (newVal === undefined) continue;
        const oldVal = existing[key as keyof typeof existing];
        const oldStr = oldVal == null ? null : String(oldVal);
        const newStr = newVal == null ? null : String(newVal);
        if (oldStr !== newStr) {
          historyEntries.push({ issueId: id, userId: ctx.userId ?? "", field: key, oldValue: oldStr, newValue: newStr });
        }
      }
      if (historyEntries.length > 0) {
        await db.issueHistory.createMany({ data: historyEntries });
      }

      let resolvedAt: Date | undefined;
      if (updates.statusId !== undefined && updates.statusId !== existing.statusId && updates.statusId !== null) {
        const newStatus = await db.workflowStatus.findUnique({ where: { id: updates.statusId }, select: { category: true } });
        if (newStatus?.category === "DONE") resolvedAt = new Date();
      }

      const updated = await db.issue.update({ where: { id }, data: { ...updates, ...(resolvedAt && { resolvedAt }) } });
      // Quien recibe una tarea pasa a formar parte del equipo del proyecto.
      if (updates.assigneeId) {
        await db.projectMember.upsert({
          where: { projectId_userId: { projectId: updated.projectId, userId: updates.assigneeId } },
          update: {},
          create: { projectId: updated.projectId, userId: updates.assigneeId, role: "MEMBER" },
        });
      }
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.issue.findUniqueOrThrow({
        where: { id: input.id },
        include: { project: { select: { orgId: true } } },
      });
      if (record.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este issue" });
      }
      return ctx.db.issue.delete({ where: { id: input.id } });
    }),

  // ---- Comments ----
  addComment: protectedProcedure
    .input(
      z.object({
        issueId: z.string(),
        body: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.issue.findUniqueOrThrow({
        where: { id: input.issueId },
        include: { project: { select: { orgId: true } } },
      });
      if (record.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este issue" });
      }
      return ctx.db.issueComment.create({
        data: {
          issueId: input.issueId,
          authorId: ctx.userId ?? "",
          body: input.body,
        },
      });
    }),

  updateComment: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        body: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.issueComment.findUniqueOrThrow({
        where: { id: input.id },
        include: { issue: { include: { project: { select: { orgId: true } } } } },
      });
      if (record.issue.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este comentario" });
      }
      return ctx.db.issueComment.update({
        where: { id: input.id },
        data: { body: input.body },
      });
    }),

  deleteComment: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.issueComment.findUniqueOrThrow({
        where: { id: input.id },
        include: { issue: { include: { project: { select: { orgId: true } } } } },
      });
      if (record.issue.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este comentario" });
      }
      return ctx.db.issueComment.delete({ where: { id: input.id } });
    }),

  // ---- Links ----
  addLink: protectedProcedure
    .input(
      z.object({
        fromIssueId: z.string(),
        toIssueId: z.string(),
        type: z.enum(["BLOCKS", "RELATES_TO", "DUPLICATES"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.issue.findUniqueOrThrow({
        where: { id: input.fromIssueId },
        include: { project: { select: { orgId: true } } },
      });
      if (record.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este issue" });
      }
      return ctx.db.issueLink.create({
        data: {
          fromIssueId: input.fromIssueId,
          toIssueId: input.toIssueId,
          type: input.type,
        },
      });
    }),

  removeLink: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.issueLink.findUniqueOrThrow({
        where: { id: input.id },
        include: { fromIssue: { include: { project: { select: { orgId: true } } } } },
      });
      if (record.fromIssue.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este enlace" });
      }
      return ctx.db.issueLink.delete({ where: { id: input.id } });
    }),

  // ---- Watchers ----
  toggleWatcher: protectedProcedure
    .input(
      z.object({
        issueId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.issue.findUniqueOrThrow({
        where: { id: input.issueId },
        include: { project: { select: { orgId: true } } },
      });
      if (record.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este issue" });
      }

      const existing = await ctx.db.issueWatcher.findUnique({
        where: {
          issueId_userId: {
            issueId: input.issueId,
            userId: input.userId,
          },
        },
      });

      if (existing) {
        await ctx.db.issueWatcher.delete({
          where: {
            issueId_userId: {
              issueId: input.issueId,
              userId: input.userId,
            },
          },
        });
        return { watching: false };
      }

      await ctx.db.issueWatcher.create({
        data: {
          issueId: input.issueId,
          userId: input.userId,
        },
      });
      return { watching: true };
    }),

  // ---- Time Tracking ----
  logTime: protectedProcedure
    .input(
      z.object({
        issueId: z.string(),
        hours: z.number().positive(),
        date: z.coerce.date(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.issue.findUniqueOrThrow({
        where: { id: input.issueId },
        include: { project: { select: { orgId: true } } },
      });
      if (record.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este issue" });
      }

      const db = ctx.db;
      const entry = await db.timeEntry.create({
        data: { issueId: input.issueId, userId: ctx.userId ?? "", hours: input.hours, date: input.date, notes: input.notes },
      });
      const aggregate = await db.timeEntry.aggregate({ where: { issueId: input.issueId }, _sum: { hours: true } });
      await db.issue.update({ where: { id: input.issueId }, data: { timeSpent: aggregate._sum.hours ?? 0 } });
      return entry;
    }),

  // ---- Attachments ----
  addAttachment: protectedProcedure
    .input(
      z.object({
        issueId: z.string(),
        name: z.string(),
        url: z.string(),
        size: z.number().optional(),
        mimeType: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.issue.findUniqueOrThrow({
        where: { id: input.issueId },
        include: { project: { select: { orgId: true } } },
      });
      if (record.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este issue" });
      }
      return ctx.db.issueAttachment.create({
        data: {
          issueId: input.issueId,
          name: input.name,
          url: input.url,
          size: input.size,
          mimeType: input.mimeType,
          uploadedBy: ctx.userId,
        },
      });
    }),

  removeAttachment: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.issueAttachment.findUniqueOrThrow({
        where: { id: input.id },
        include: { issue: { include: { project: { select: { orgId: true } } } } },
      });
      if (record.issue.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este adjunto" });
      }
      return ctx.db.issueAttachment.delete({ where: { id: input.id } });
    }),

  // ---- Labels ----
  addLabel: protectedProcedure
    .input(
      z.object({
        issueId: z.string(),
        labelId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.issue.findUniqueOrThrow({
        where: { id: input.issueId },
        include: { project: { select: { orgId: true } } },
      });
      if (record.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este issue" });
      }
      return ctx.db.issueLabel.create({
        data: {
          issueId: input.issueId,
          labelId: input.labelId,
        },
      });
    }),

  removeLabel: protectedProcedure
    .input(
      z.object({
        issueId: z.string(),
        labelId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const record = await ctx.db.issue.findUniqueOrThrow({
        where: { id: input.issueId },
        include: { project: { select: { orgId: true } } },
      });
      if (record.project.orgId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a este issue" });
      }
      return ctx.db.issueLabel.delete({
        where: {
          issueId_labelId: {
            issueId: input.issueId,
            labelId: input.labelId,
          },
        },
      });
    }),
});
