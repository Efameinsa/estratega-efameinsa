import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";
import {
  autoGenerateAgenda,
  generateYearCalendar,
} from "@/lib/review-engine";

const ReviewTypeEnum = z.enum([
  "mensual",
  "trimestral",
  "semestral",
  "anual",
  "extraordinaria",
]);
const StatusEnum = z.enum([
  "programada",
  "en_curso",
  "completada",
  "cancelada",
  "reprogramada",
]);
const AttendanceEnum = z.enum([
  "invitado",
  "confirmado",
  "presente",
  "ausente",
  "ausente_justificado",
]);
const PriorityEnum = z.enum(["alta", "media", "baja"]);
const ActionStatusEnum = z.enum(["pendiente", "en_curso", "completada", "cancelada"]);

async function assertReviewAccess(reviewId: string, organizationId: string) {
  const review = await db.review.findUniqueOrThrow({
    where: { id: reviewId },
    select: { id: true, organizationId: true, cycleId: true, status: true },
  });
  if (review.organizationId !== organizationId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return review;
}

export const reviewsRouter = router({
  setup: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const [cycle, organization, upcoming, completed, calendarConfig, pendingActions] = await Promise.all([
        db.strategicCycle.findUniqueOrThrow({
          where: { id: input.cycleId },
          select: { id: true, name: true, yearStart: true, yearEnd: true },
        }),
        db.organization.findFirstOrThrow({
          where: { cycles: { some: { id: input.cycleId } } },
          select: { id: true, name: true, sector: true, color: true },
        }),
        db.review.findMany({
          where: {
            cycleId: input.cycleId,
            status: { in: ["programada", "en_curso"] },
          },
          orderBy: { scheduledAt: "asc" },
          include: {
            president: { select: { id: true, name: true } },
            secretary: { select: { id: true, name: true } },
            attendees: {
              include: { user: { select: { id: true, name: true } } },
            },
            _count: { select: { agendaItems: true, decisions: true, correctiveActions: true } },
          },
        }),
        db.review.count({
          where: { cycleId: input.cycleId, status: "completada" },
        }),
        db.reviewCalendarConfig.findMany({
          where: { cycleId: input.cycleId },
        }),
        db.reviewCorrectiveAction.count({
          where: {
            review: { cycleId: input.cycleId },
            status: { in: ["pendiente", "en_curso"] },
          },
        }),
      ]);
      return { cycle, organization, upcoming, completed, calendarConfig, pendingActions };
    }),

  list: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        statuses: z.array(StatusEnum).optional(),
        types: z.array(ReviewTypeEnum).optional(),
        limit: z.number().int().max(200).default(100),
      }),
    )
    .query(async ({ input }) => {
      const where: Record<string, unknown> = { cycleId: input.cycleId };
      if (input.statuses) where.status = { in: input.statuses };
      if (input.types) where.type = { in: input.types };
      const reviews = await db.review.findMany({
        where,
        orderBy: { scheduledAt: "desc" },
        take: input.limit,
        include: {
          president: { select: { name: true } },
          secretary: { select: { name: true } },
          _count: { select: { agendaItems: true, decisions: true, correctiveActions: true, attendees: true } },
        },
      });
      return reviews;
    }),

  detail: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertReviewAccess(input.id, ctx.organizationId!);
      const review = await db.review.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          president: { select: { id: true, name: true, role: true } },
          secretary: { select: { id: true, name: true, role: true } },
          attendees: {
            orderBy: { createdAt: "asc" },
            include: { user: { select: { id: true, name: true, role: true, email: true } } },
          },
          agendaItems: {
            orderBy: { order: "asc" },
          },
          decisions: {
            orderBy: { number: "asc" },
            include: { createdBy: { select: { name: true } } },
          },
          correctiveActions: {
            orderBy: { number: "asc" },
            include: { responsible: { select: { name: true } } },
          },
          comments: {
            orderBy: { createdAt: "desc" },
            include: { user: { select: { name: true, role: true } } },
          },
        },
      });
      return review;
    }),

  scheduleReview: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        type: ReviewTypeEnum,
        title: z.string().min(1),
        period: z.string().min(1),
        scheduledAt: z.coerce.date(),
        location: z.string().optional(),
        presidentId: z.string().nullable().optional(),
        secretaryId: z.string().nullable().optional(),
        extraordinaryReason: z.string().nullable().optional(),
        attendeeUserIds: z.array(z.string()).default([]),
        autoGenerateAgendaNow: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const review = await db.review.create({
        data: {
          organizationId: ctx.organizationId!,
          cycleId: input.cycleId,
          type: input.type,
          title: input.title,
          period: input.period,
          scheduledAt: input.scheduledAt,
          location: input.location ?? null,
          status: "programada",
          presidentId: input.presidentId ?? null,
          secretaryId: input.secretaryId ?? null,
          extraordinaryReason: input.extraordinaryReason ?? null,
        },
      });
      if (input.attendeeUserIds.length > 0) {
        await db.reviewAttendee.createMany({
          data: input.attendeeUserIds.map((userId) => ({
            reviewId: review.id,
            userId,
            attendanceStatus: "invitado",
          })),
          skipDuplicates: true,
        });
      }
      if (input.autoGenerateAgendaNow) {
        await autoGenerateAgenda(review.id);
      }
      return review;
    }),

  regenerateAgenda: protectedProcedure
    .input(z.object({ reviewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertReviewAccess(input.reviewId, ctx.organizationId!);
      return autoGenerateAgenda(input.reviewId);
    }),

  openSession: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const review = await assertReviewAccess(input.id, ctx.organizationId!);
      if (review.status === "completada") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "La revisión ya fue cerrada" });
      }
      return db.review.update({
        where: { id: input.id },
        data: { status: "en_curso", startedAt: new Date() },
      });
    }),

  closeSession: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        executiveSummary: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const review = await assertReviewAccess(input.id, ctx.organizationId!);
      const finishedAt = new Date();
      let duration = null;
      const r = await db.review.findUniqueOrThrow({
        where: { id: input.id },
        select: { startedAt: true },
      });
      if (r.startedAt) {
        duration = Math.round((finishedAt.getTime() - r.startedAt.getTime()) / 60000);
      }
      return db.review.update({
        where: { id: input.id },
        data: {
          status: "completada",
          finishedAt,
          durationMinutes: duration,
          executiveSummary: input.executiveSummary ?? null,
        },
      });
    }),

  cancelReview: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertReviewAccess(input.id, ctx.organizationId!);
      return db.review.update({
        where: { id: input.id },
        data: { status: "cancelada" },
      });
    }),

  signAct: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        role: z.enum(["president", "secretary"]),
        signerName: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const review = await assertReviewAccess(input.id, ctx.organizationId!);
      if (review.status !== "completada") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solo puedes firmar revisiones completadas",
        });
      }
      const data: Record<string, unknown> = {};
      if (input.role === "president") {
        data.presidentSignedAt = new Date();
        data.presidentSignedName = input.signerName;
      } else {
        data.secretarySignedAt = new Date();
        data.secretarySignedName = input.signerName;
      }
      const updated = await db.review.update({
        where: { id: input.id },
        data,
      });
      // Si ambas firmas presentes, marcar actSigned
      if (updated.presidentSignedAt && updated.secretarySignedAt) {
        await db.review.update({
          where: { id: input.id },
          data: { actSigned: true },
        });
      }
      return updated;
    }),

  setAttendance: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        userId: z.string(),
        status: AttendanceEnum,
        justification: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertReviewAccess(input.reviewId, ctx.organizationId!);
      return db.reviewAttendee.upsert({
        where: {
          reviewId_userId: { reviewId: input.reviewId, userId: input.userId },
        },
        create: {
          reviewId: input.reviewId,
          userId: input.userId,
          attendanceStatus: input.status,
          justification: input.justification ?? null,
        },
        update: {
          attendanceStatus: input.status,
          justification: input.justification ?? null,
          arrivedAt:
            input.status === "presente" ? new Date() : undefined,
        },
      });
    }),

  toggleAgendaItem: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        covered: z.boolean(),
        discussionNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const item = await db.reviewAgendaItem.findUniqueOrThrow({
        where: { id: input.id },
        include: { review: { select: { organizationId: true } } },
      });
      if (item.review.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.reviewAgendaItem.update({
        where: { id: input.id },
        data: {
          covered: input.covered,
          discussionNotes: input.discussionNotes ?? item.discussionNotes,
        },
      });
    }),

  addDecision: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        text: z.string().min(1),
        decisionType: z.enum(["estrategica", "tactica", "operativa"]).default("tactica"),
        linkType: z
          .enum(["kpi", "olp", "ocp", "estrategia", "politica", "ninguna"])
          .default("ninguna"),
        linkId: z.string().nullable().optional(),
        justification: z.string().optional(),
        requiresVote: z.boolean().default(false),
        approved: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertReviewAccess(input.reviewId, ctx.organizationId!);
      const last = await db.reviewDecision.findFirst({
        where: { reviewId: input.reviewId },
        orderBy: { number: "desc" },
        select: { number: true },
      });
      return db.reviewDecision.create({
        data: {
          reviewId: input.reviewId,
          number: (last?.number ?? 0) + 1,
          text: input.text.trim(),
          decisionType: input.decisionType,
          linkType: input.linkType,
          linkId: input.linkId ?? null,
          justification: input.justification ?? null,
          requiresVote: input.requiresVote,
          approved: input.approved,
          createdById: ctx.userId,
        },
      });
    }),

  deleteDecision: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const d = await db.reviewDecision.findUniqueOrThrow({
        where: { id: input.id },
        select: { reviewId: true },
      });
      await assertReviewAccess(d.reviewId, ctx.organizationId!);
      return db.reviewDecision.delete({ where: { id: input.id } });
    }),

  addCorrectiveAction: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        description: z.string().min(1),
        responsibleId: z.string().nullable().optional(),
        responsibleName: z.string().optional(),
        dueDate: z.coerce.date().optional(),
        priority: PriorityEnum.default("media"),
        linkType: z
          .enum(["alerta", "kpi", "ocp", "olp", "decision", "ninguna"])
          .default("ninguna"),
        linkId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertReviewAccess(input.reviewId, ctx.organizationId!);
      const last = await db.reviewCorrectiveAction.findFirst({
        where: { reviewId: input.reviewId },
        orderBy: { number: "desc" },
        select: { number: true },
      });
      return db.reviewCorrectiveAction.create({
        data: {
          reviewId: input.reviewId,
          number: (last?.number ?? 0) + 1,
          description: input.description.trim(),
          responsibleId: input.responsibleId ?? null,
          responsibleName: input.responsibleName ?? null,
          dueDate: input.dueDate ?? null,
          priority: input.priority,
          linkType: input.linkType,
          linkId: input.linkId ?? null,
        },
      });
    }),

  updateCorrectiveAction: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: ActionStatusEnum.optional(),
        closingNotes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const a = await db.reviewCorrectiveAction.findUniqueOrThrow({
        where: { id: input.id },
        select: { reviewId: true },
      });
      await assertReviewAccess(a.reviewId, ctx.organizationId!);
      const data: Record<string, unknown> = {};
      if (input.status) {
        data.status = input.status;
        if (input.status === "completada") data.completedAt = new Date();
      }
      if (input.closingNotes !== undefined) data.closingNotes = input.closingNotes;
      return db.reviewCorrectiveAction.update({ where: { id: input.id }, data });
    }),

  postComment: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        agendaItemId: z.string().optional(),
        text: z.string().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertReviewAccess(input.reviewId, ctx.organizationId!);
      return db.reviewComment.create({
        data: {
          reviewId: input.reviewId,
          agendaItemId: input.agendaItemId ?? null,
          userId: ctx.userId,
          text: input.text.trim(),
        },
      });
    }),

  upsertCalendarConfig: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        type: z.enum(["mensual", "trimestral", "semestral", "anual"]),
        active: z.boolean(),
        dayOfPeriod: z.number().int().min(1).max(31).default(15),
        defaultHour: z.string().default("10:00"),
        defaultDurationMin: z.number().int().default(120),
        defaultAttendees: z.array(z.string()).default([]),
        defaultPresidentId: z.string().nullable().optional(),
        defaultSecretaryId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const data = {
        active: input.active,
        dayOfPeriod: input.dayOfPeriod,
        defaultHour: input.defaultHour,
        defaultDurationMin: input.defaultDurationMin,
        defaultAttendees: JSON.stringify(input.defaultAttendees),
        defaultPresidentId: input.defaultPresidentId ?? null,
        defaultSecretaryId: input.defaultSecretaryId ?? null,
      };
      return db.reviewCalendarConfig.upsert({
        where: { cycleId_type: { cycleId: input.cycleId, type: input.type } },
        create: { cycleId: input.cycleId, type: input.type, ...data },
        update: data,
      });
    }),

  generateYear: cycleProcedure
    .input(z.object({ cycleId: z.string(), year: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      return generateYearCalendar(input.cycleId, ctx.organizationId!, input.year);
    }),

  stats: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const [byType, byStatus, totalActions, completedActions, durations] = await Promise.all([
        db.review.groupBy({ by: ["type"], where: { cycleId: input.cycleId }, _count: true }),
        db.review.groupBy({ by: ["status"], where: { cycleId: input.cycleId }, _count: true }),
        db.reviewCorrectiveAction.count({
          where: { review: { cycleId: input.cycleId } },
        }),
        db.reviewCorrectiveAction.count({
          where: { review: { cycleId: input.cycleId }, status: "completada" },
        }),
        db.review.findMany({
          where: {
            cycleId: input.cycleId,
            status: "completada",
            durationMinutes: { not: null },
          },
          select: { durationMinutes: true },
        }),
      ]);
      const avgDuration =
        durations.length > 0
          ? Math.round(
              durations.reduce((s, r) => s + (r.durationMinutes ?? 0), 0) / durations.length,
            )
          : 0;
      return {
        byType: Object.fromEntries(byType.map((t) => [t.type, t._count])),
        byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
        totalActions,
        completedActions,
        avgDurationMinutes: avgDuration,
      };
    }),

  getExportData: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertReviewAccess(input.id, ctx.organizationId!);
      const review = await db.review.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          organization: { select: { name: true, sector: true, color: true } },
          cycle: { select: { name: true, yearStart: true, yearEnd: true } },
          president: { select: { name: true, role: true } },
          secretary: { select: { name: true, role: true } },
          attendees: { include: { user: { select: { name: true, role: true } } } },
          agendaItems: { orderBy: { order: "asc" } },
          decisions: { orderBy: { number: "asc" } },
          correctiveActions: {
            orderBy: { number: "asc" },
            include: { responsible: { select: { name: true } } },
          },
        },
      });
      return review;
    }),
});
