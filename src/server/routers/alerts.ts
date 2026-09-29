import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";
import {
  ALERT_TYPES,
  ensureDefaultRules,
  evaluateCycleNow,
} from "@/lib/alerts-engine";

const TypeEnum = z.enum([
  "semaforo_critico",
  "tendencia_negativa",
  "datos_atrasados",
  "olp_en_riesgo",
  "hito_incumplido",
  "personalizada",
]);
const PriorityEnum = z.enum(["alta", "media", "baja"]);
const StatusEnum = z.enum([
  "activa",
  "en_seguimiento",
  "resuelta",
  "ignorada",
  "reactivada",
]);

async function assertAlertAccess(alertId: string, organizationId: string) {
  const alert = await db.alert.findUniqueOrThrow({
    where: { id: alertId },
    select: { id: true, organizationId: true, cycleId: true },
  });
  if (alert.organizationId !== organizationId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return alert;
}

async function assertRuleAccess(ruleId: string, organizationId: string) {
  const rule = await db.alertRule.findUniqueOrThrow({
    where: { id: ruleId },
    include: { cycle: { select: { organizationId: true } } },
  });
  if (rule.cycle.organizationId !== organizationId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return rule;
}

export const alertsRouter = router({
  setup: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      await ensureDefaultRules(input.cycleId);

      const [cycle, activeAlerts, rules, stats] = await Promise.all([
        db.strategicCycle.findUniqueOrThrow({
          where: { id: input.cycleId },
          select: { id: true, name: true, yearStart: true, yearEnd: true },
        }),
        db.alert.findMany({
          where: {
            cycleId: input.cycleId,
            status: { in: ["activa", "en_seguimiento", "reactivada"] },
          },
          orderBy: [{ priority: "asc" }, { generatedAt: "desc" }],
          include: {
            assignee: { select: { id: true, name: true, role: true, area: true } },
            _count: { select: { comments: true, correctiveActions: true } },
          },
        }),
        db.alertRule.findMany({
          where: { cycleId: input.cycleId },
          orderBy: [{ isDefault: "desc" }, { type: "asc" }],
        }),
        db.alert.groupBy({
          by: ["status"],
          where: { cycleId: input.cycleId },
          _count: true,
        }),
      ]);

      const statsByStatus: Record<string, number> = {};
      for (const s of stats) statsByStatus[s.status] = s._count;

      return { cycle, activeAlerts, rules, statsByStatus };
    }),

  // Histórico: todas excepto activas
  listHistory: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        types: z.array(TypeEnum).optional(),
        statuses: z.array(StatusEnum).optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
        limit: z.number().int().max(200).default(100),
      }),
    )
    .query(async ({ input }) => {
      const where: Record<string, unknown> = {
        cycleId: input.cycleId,
        status: { in: input.statuses ?? ["resuelta", "ignorada"] },
      };
      if (input.types && input.types.length > 0) {
        where.type = { in: input.types };
      }
      if (input.from || input.to) {
        const range: Record<string, Date> = {};
        if (input.from) range.gte = input.from;
        if (input.to) range.lte = input.to;
        where.generatedAt = range;
      }
      const alerts = await db.alert.findMany({
        where,
        orderBy: { resolvedAt: "desc" },
        take: input.limit,
        include: {
          assignee: { select: { id: true, name: true } },
        },
      });
      return alerts;
    }),

  alertDetail: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertAlertAccess(input.id, ctx.organizationId!);
      const [alert, actions, comments, correctiveActions] = await Promise.all([
        db.alert.findUniqueOrThrow({
          where: { id: input.id },
          include: {
            assignee: { select: { id: true, name: true, email: true, role: true } },
            rule: { select: { id: true, name: true, type: true } },
          },
        }),
        db.alertAction.findMany({
          where: { alertId: input.id },
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, name: true } } },
        }),
        db.alertComment.findMany({
          where: { alertId: input.id },
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true, role: true } } },
        }),
        db.alertCorrectiveAction.findMany({
          where: { alertId: input.id },
          orderBy: { createdAt: "desc" },
        }),
      ]);
      return { alert, actions, comments, correctiveActions };
    }),

  evaluateNow: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .mutation(async ({ input }) => {
      return evaluateCycleNow(input.cycleId);
    }),

  assignAlert: protectedProcedure
    .input(z.object({ id: z.string(), userId: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      await assertAlertAccess(input.id, ctx.organizationId!);
      const updated = await db.alert.update({
        where: { id: input.id },
        data: {
          assigneeId: input.userId,
          assignedAt: input.userId ? new Date() : null,
        },
      });
      await db.alertAction.create({
        data: {
          alertId: input.id,
          actionType: "asignada",
          userId: ctx.userId,
          data: JSON.stringify({ assigneeId: input.userId }),
        },
      });
      return updated;
    }),

  setStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: StatusEnum,
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertAlertAccess(input.id, ctx.organizationId!);
      const dataPatch: Record<string, unknown> = { status: input.status };
      if (input.status === "resuelta" || input.status === "ignorada") {
        dataPatch.resolvedAt = new Date();
        dataPatch.resolutionType = input.status;
        if (input.reason) dataPatch.resolutionReason = input.reason;
      }
      const updated = await db.alert.update({
        where: { id: input.id },
        data: dataPatch,
      });
      await db.alertAction.create({
        data: {
          alertId: input.id,
          actionType:
            input.status === "resuelta"
              ? "resuelta"
              : input.status === "ignorada"
              ? "ignorada"
              : "estado_cambiado",
          userId: ctx.userId,
          data: JSON.stringify({ newStatus: input.status, reason: input.reason }),
        },
      });
      return updated;
    }),

  setPriority: protectedProcedure
    .input(z.object({ id: z.string(), priority: PriorityEnum }))
    .mutation(async ({ ctx, input }) => {
      await assertAlertAccess(input.id, ctx.organizationId!);
      const updated = await db.alert.update({
        where: { id: input.id },
        data: { priority: input.priority },
      });
      await db.alertAction.create({
        data: {
          alertId: input.id,
          actionType: "escalada",
          userId: ctx.userId,
          data: JSON.stringify({ newPriority: input.priority }),
        },
      });
      return updated;
    }),

  postComment: protectedProcedure
    .input(
      z.object({
        alertId: z.string(),
        text: z.string().min(1).max(2000),
        mentions: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertAlertAccess(input.alertId, ctx.organizationId!);
      const comment = await db.alertComment.create({
        data: {
          alertId: input.alertId,
          userId: ctx.userId,
          text: input.text.trim(),
          mentions: input.mentions ? JSON.stringify(input.mentions) : null,
        },
      });
      await db.alertAction.create({
        data: {
          alertId: input.alertId,
          actionType: "comentada",
          userId: ctx.userId,
          data: JSON.stringify({ commentId: comment.id }),
        },
      });
      return comment;
    }),

  deleteComment: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const c = await db.alertComment.findUniqueOrThrow({
        where: { id: input.id },
        select: { userId: true, alertId: true },
      });
      if (c.userId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await assertAlertAccess(c.alertId, ctx.organizationId!);
      return db.alertComment.delete({ where: { id: input.id } });
    }),

  createCorrectiveAction: protectedProcedure
    .input(
      z.object({
        alertId: z.string(),
        description: z.string().min(1).max(500),
        responsibleName: z.string().min(1),
        dueDate: z.coerce.date().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertAlertAccess(input.alertId, ctx.organizationId!);
      const action = await db.alertCorrectiveAction.create({
        data: {
          alertId: input.alertId,
          description: input.description,
          responsibleName: input.responsibleName,
          dueDate: input.dueDate ?? null,
          notes: input.notes ?? null,
          // educanetTaskId: null por ahora (solo registro interno)
        },
      });
      await db.alertAction.create({
        data: {
          alertId: input.alertId,
          actionType: "accion_correctiva",
          userId: ctx.userId,
          data: JSON.stringify({ correctiveActionId: action.id }),
        },
      });
      return action;
    }),

  updateCorrectiveAction: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["pendiente", "en_curso", "completada", "cancelada"]).optional(),
        notes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ca = await db.alertCorrectiveAction.findUniqueOrThrow({
        where: { id: input.id },
        select: { alertId: true },
      });
      await assertAlertAccess(ca.alertId, ctx.organizationId!);
      const { id, ...data } = input;
      return db.alertCorrectiveAction.update({
        where: { id },
        data,
      });
    }),

  upsertRule: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        id: z.string().optional(),
        type: TypeEnum,
        name: z.string().min(1).max(200),
        active: z.boolean().default(true),
        configuration: z.record(z.string(), z.unknown()).default({}),
        defaultPriority: PriorityEnum.default("media"),
        channels: z.array(z.string()).default(["in_app"]),
        notifyTo: z.array(z.string()).default(["responsible"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = {
        type: input.type,
        name: input.name,
        active: input.active,
        configuration: JSON.stringify(input.configuration),
        defaultPriority: input.defaultPriority,
        channels: JSON.stringify(input.channels),
        notifyTo: JSON.stringify(input.notifyTo),
      };
      if (input.id) {
        await assertRuleAccess(input.id, ctx.organizationId!);
        return db.alertRule.update({
          where: { id: input.id },
          data,
        });
      }
      return db.alertRule.create({
        data: {
          cycleId: input.cycleId,
          isDefault: false,
          ...data,
        },
      });
    }),

  toggleRule: protectedProcedure
    .input(z.object({ id: z.string(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await assertRuleAccess(input.id, ctx.organizationId!);
      return db.alertRule.update({
        where: { id: input.id },
        data: { active: input.active },
      });
    }),

  deleteRule: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rule = await assertRuleAccess(input.id, ctx.organizationId!);
      if (rule.isDefault) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No puedes eliminar una regla por defecto. Desactívala en su lugar.",
        });
      }
      return db.alertRule.delete({ where: { id: input.id } });
    }),

  resetDefaultRules: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .mutation(async ({ input }) => {
      // Borrar default existentes y volver a crear
      await db.alertRule.deleteMany({
        where: { cycleId: input.cycleId, isDefault: true },
      });
      return ensureDefaultRules(input.cycleId);
    }),

  stats: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const [byStatus, byType, resolved, byKpi] = await Promise.all([
        db.alert.groupBy({
          by: ["status"],
          where: { cycleId: input.cycleId },
          _count: true,
        }),
        db.alert.groupBy({
          by: ["type"],
          where: { cycleId: input.cycleId },
          _count: true,
        }),
        db.alert.findMany({
          where: {
            cycleId: input.cycleId,
            status: "resuelta",
            resolvedAt: { not: null },
          },
          select: { generatedAt: true, resolvedAt: true },
        }),
        db.alert.groupBy({
          by: ["objectId"],
          where: { cycleId: input.cycleId, objectType: "kpi" },
          _count: true,
          orderBy: { _count: { objectId: "desc" } },
          take: 5,
        }),
      ]);

      let avgResolutionDays = 0;
      if (resolved.length > 0) {
        const totalDays = resolved.reduce((sum, a) => {
          if (!a.resolvedAt) return sum;
          const diff = a.resolvedAt.getTime() - a.generatedAt.getTime();
          return sum + diff / (1000 * 60 * 60 * 24);
        }, 0);
        avgResolutionDays = totalDays / resolved.length;
      }

      const reactivated = await db.alert.count({
        where: { cycleId: input.cycleId, status: "reactivada" },
      });

      return {
        byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
        byType: Object.fromEntries(byType.map((t) => [t.type, t._count])),
        avgResolutionDays: Math.round(avgResolutionDays * 10) / 10,
        reactivatedCount: reactivated,
        topKpis: byKpi,
      };
    }),

  getExportData: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const [cycle, organization, alerts] = await Promise.all([
        db.strategicCycle.findUniqueOrThrow({
          where: { id: input.cycleId },
          select: { name: true, yearStart: true, yearEnd: true },
        }),
        db.organization.findFirstOrThrow({
          where: { cycles: { some: { id: input.cycleId } } },
          select: { name: true, sector: true, color: true },
        }),
        db.alert.findMany({
          where: { cycleId: input.cycleId },
          orderBy: { generatedAt: "desc" },
          include: {
            assignee: { select: { name: true } },
            rule: { select: { name: true } },
          },
        }),
      ]);
      return { cycle, organization, alerts };
    }),
});
