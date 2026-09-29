import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";
import { inferRelations } from "@/lib/bsc-dashboard";

async function assertKpiInOrg(kpiId: string, organizationId: string) {
  const kpi = await db.kpi.findUniqueOrThrow({
    where: { id: kpiId },
    select: { id: true, organizationId: true, cycleId: true },
  });
  if (kpi.organizationId !== organizationId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return kpi;
}

export const dashboardRouter = router({
  // Carga todo el set de KPIs confirmados con sus períodos y datos para construir snapshots
  setup: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [cycle, organization, kpis, relations] = await Promise.all([
        db.strategicCycle.findUniqueOrThrow({
          where: { id: input.cycleId },
          select: { id: true, name: true, yearStart: true, yearEnd: true },
        }),
        // cycleProcedure ya validó que el ciclo es de esta organización.
        db.organization.findUniqueOrThrow({
          where: { id: ctx.organizationId },
          select: { id: true, name: true, sector: true, color: true },
        }),
        db.kpi.findMany({
          where: {
            cycleId: input.cycleId,
            status: { in: ["aceptado", "en_edicion", "confirmado"] },
          },
          orderBy: [{ dimensionBsc: "asc" }, { sortOrder: "asc" }],
          include: {
            periods: {
              orderBy: { period: "asc" },
              select: {
                period: true,
                metaGreen: true,
                metaAmber: true,
                metaRed: true,
                realValue: true,
                semaforoActual: true,
                percentCompletion: true,
                dataReceivedAt: true,
              },
            },
            responsibleArea: { select: { id: true, name: true } },
            olps: { select: { olpId: true, olp: { select: { description: true } } } },
            ocps: { select: { ocpId: true, ocp: { select: { id: true, code: true } } } },
          },
        }),
        db.kpiRelation.findMany({
          where: { cycleId: input.cycleId },
        }),
      ]);

      return { cycle, organization, kpis, relations };
    }),

  // Detalle ampliado del KPI: histórico completo, comentarios, relaciones
  kpiDetail: protectedProcedure
    .input(z.object({ kpiId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertKpiInOrg(input.kpiId, ctx.organizationId!);
      const [kpi, history, comments] = await Promise.all([
        db.kpi.findUniqueOrThrow({
          where: { id: input.kpiId },
          include: {
            periods: { orderBy: { period: "asc" } },
            responsibleArea: { select: { id: true, name: true, code: true } },
            olps: {
              include: {
                olp: {
                  select: {
                    id: true,
                    description: true,
                    targetValue: true,
                    unit: true,
                  },
                },
              },
            },
            ocps: {
              include: { ocp: { select: { id: true, code: true, description: true, year: true } } },
            },
          },
        }),
        db.kpiValueHistory.findMany({
          where: { kpiId: input.kpiId },
          orderBy: { receivedAt: "desc" },
          take: 20,
        }),
        db.kpiComment.findMany({
          where: { kpiId: input.kpiId },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true, area: true },
            },
          },
        }),
      ]);
      return { kpi, history, comments };
    }),

  postComment: protectedProcedure
    .input(
      z.object({
        kpiId: z.string(),
        text: z.string().min(1).max(2000),
        mentions: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertKpiInOrg(input.kpiId, ctx.organizationId!);
      return db.kpiComment.create({
        data: {
          kpiId: input.kpiId,
          userId: ctx.userId,
          text: input.text.trim(),
          mentions: input.mentions ? JSON.stringify(input.mentions) : null,
        },
      });
    }),

  updateComment: protectedProcedure
    .input(z.object({ id: z.string(), text: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const comment = await db.kpiComment.findUniqueOrThrow({
        where: { id: input.id },
        select: { userId: true, kpiId: true },
      });
      if (comment.userId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo el autor puede editar" });
      }
      await assertKpiInOrg(comment.kpiId, ctx.organizationId!);
      return db.kpiComment.update({
        where: { id: input.id },
        data: { text: input.text.trim(), edited: true },
      });
    }),

  deleteComment: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await db.kpiComment.findUniqueOrThrow({
        where: { id: input.id },
        select: { userId: true, kpiId: true },
      });
      if (comment.userId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo el autor puede eliminar" });
      }
      await assertKpiInOrg(comment.kpiId, ctx.organizationId!);
      return db.kpiComment.delete({ where: { id: input.id } });
    }),

  // Inferir relaciones del mapa estratégico (idempotente: no crea duplicados)
  inferRelations: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .mutation(async ({ input }) => {
      const kpis = await db.kpi.findMany({
        where: {
          cycleId: input.cycleId,
          status: { in: ["aceptado", "en_edicion", "confirmado"] },
        },
        include: { olps: { select: { olpId: true } } },
      });
      const kpisForInfer = kpis.map((k) => ({
        id: k.id,
        dimensionBsc: k.dimensionBsc,
        olpIds: k.olps.map((o) => o.olpId),
      }));
      const inferred = inferRelations(kpisForInfer);
      const existing = await db.kpiRelation.findMany({
        where: { cycleId: input.cycleId },
        select: { sourceKpiId: true, targetKpiId: true },
      });
      const existingSet = new Set(
        existing.map((r) => `${r.sourceKpiId}::${r.targetKpiId}`),
      );
      let created = 0;
      for (const rel of inferred) {
        const key = `${rel.sourceKpiId}::${rel.targetKpiId}`;
        if (existingSet.has(key)) continue;
        await db.kpiRelation.create({
          data: {
            cycleId: input.cycleId,
            sourceKpiId: rel.sourceKpiId,
            targetKpiId: rel.targetKpiId,
            relationType: "causa_efecto",
            intensity: rel.intensity,
            origin: "auto_inferida",
          },
        });
        created++;
      }
      return { created };
    }),

  // Reemplaza el conjunto completo de relaciones del cycle
  setRelations: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        relations: z.array(
          z.object({
            sourceKpiId: z.string(),
            targetKpiId: z.string(),
            intensity: z.enum(["alta", "media", "baja"]).default("media"),
            relationType: z
              .enum(["causa_efecto", "habilita", "bloquea", "neutral"])
              .default("causa_efecto"),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      await db.kpiRelation.deleteMany({ where: { cycleId: input.cycleId } });
      if (input.relations.length > 0) {
        await db.kpiRelation.createMany({
          data: input.relations.map((r) => ({
            cycleId: input.cycleId,
            sourceKpiId: r.sourceKpiId,
            targetKpiId: r.targetKpiId,
            intensity: r.intensity,
            relationType: r.relationType,
            origin: "manual",
          })),
        });
      }
      return { count: input.relations.length };
    }),

  // Preferencias del usuario para el tablero
  getConfig: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const cfg = await db.dashboardConfig.findUnique({
        where: { cycleId_userId: { cycleId: input.cycleId, userId: ctx.userId } },
      });
      return cfg;
    }),

  upsertConfig: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        defaultMode: z.enum(["dimensiones", "mapa", "lista"]).optional(),
        favoriteKpis: z.array(z.string()).optional(),
        notificationsOn: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = {
        defaultMode: input.defaultMode,
        favoriteKpis: input.favoriteKpis
          ? JSON.stringify(input.favoriteKpis)
          : undefined,
        notificationsOn: input.notificationsOn,
      };
      return db.dashboardConfig.upsert({
        where: { cycleId_userId: { cycleId: input.cycleId, userId: ctx.userId } },
        create: {
          cycleId: input.cycleId,
          userId: ctx.userId,
          organizationId: ctx.organizationId!,
          ...data,
        },
        update: data,
      });
    }),

  getExportData: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const [cycle, organization, kpis] = await Promise.all([
        db.strategicCycle.findUniqueOrThrow({
          where: { id: input.cycleId },
          select: { name: true, yearStart: true, yearEnd: true },
        }),
        db.organization.findFirstOrThrow({
          where: { cycles: { some: { id: input.cycleId } } },
          select: { name: true, sector: true, color: true },
        }),
        db.kpi.findMany({
          where: {
            cycleId: input.cycleId,
            status: { in: ["aceptado", "en_edicion", "confirmado"] },
          },
          include: {
            periods: { orderBy: { period: "asc" } },
            responsibleArea: { select: { name: true } },
            comments: {
              orderBy: { createdAt: "desc" },
              include: { user: { select: { name: true, role: true } } },
            },
          },
        }),
      ]);
      return { cycle, organization, kpis };
    }),
});
