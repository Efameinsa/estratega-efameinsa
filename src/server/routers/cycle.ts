import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, authOnlyProcedure, cycleProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";
import { hasPermission, type OrgRole } from "@/lib/permissions";
import { getSectionStates, moduleStatuses, type ModuleId } from "@/server/cycle-progress";
import { buildKpiSnapshot, computeGlobalCompliance, getDefaultPeriod } from "@/lib/bsc-dashboard";

const MODULE_NAMES: Record<ModuleId, string> = { M1: "Identidad", M2: "Diagnóstico", M3: "Formulación", M4: "Implementación", M5: "Control" };
const MODULE_COLORS: Record<ModuleId, string> = { M1: "#185fa5", M2: "#b45309", M3: "#8B1510", M4: "#be185d", M5: "#1e7f4f" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const cycleRouter = router({
  list: authOnlyProcedure.query(async ({ ctx }) => {
    // Get org from DB directly (JWT might be stale after onboarding)
    const orgId = await ctx.getActiveOrgId();
    if (!orgId) return [];

    return db.strategicCycle.findMany({
      where: { organizationId: orgId },
      orderBy: { yearStart: "desc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Leer org activa desde DB (igual que cycle.list) — el JWT puede estar
      // stale después de un cambio de organización y eso provoca FORBIDDEN
      // falsos que redirigen al dashboard en CycleLayout.
      const orgId = await ctx.getActiveOrgId();
      const cycle = await db.strategicCycle.findUniqueOrThrow({ where: { id: input.id } });
      if (cycle.organizationId !== orgId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      return cycle;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        yearStart: z.number().int(),
        yearEnd: z.number().int(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check org membership + permission
      const membership = await db.organizationMember.findUnique({
        where: { userId_organizationId: { userId: ctx.userId, organizationId: ctx.organizationId } },
      });
      if (!membership || !hasPermission(membership.orgRole as OrgRole, "ORG_CREATE_CYCLE")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo el propietario puede crear ciclos estratégicos" });
      }

      return db.strategicCycle.create({
        data: {
          organization: { connect: { id: ctx.organizationId } },
          name: input.name,
          yearStart: input.yearStart,
          yearEnd: input.yearEnd,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = await ctx.getActiveOrgId();
      const cycle = await db.strategicCycle.findUniqueOrThrow({ where: { id: input.id } });
      if (cycle.organizationId !== orgId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      const { id, ...data } = input;
      return db.strategicCycle.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await ctx.getActiveOrgId();
      const cycle = await db.strategicCycle.findUniqueOrThrow({ where: { id: input.id } });
      if (cycle.organizationId !== orgId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      const membership = await db.organizationMember.findUnique({
        where: { userId_organizationId: { userId: ctx.userId, organizationId: orgId } },
      });
      if (!membership || !hasPermission(membership.orgRole as OrgRole, "ORG_DELETE_CYCLE")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo el propietario puede eliminar ciclos estratégicos" });
      }
      return db.strategicCycle.delete({ where: { id: input.id } });
    }),

  // -----------------------------------------------------------------------
  // Dashboard procedures
  // -----------------------------------------------------------------------

  getProgress: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [states, activeProjects] = await Promise.all([
        getSectionStates(ctx.db, input.cycleId, ctx.getActiveOrgId),
        ctx.db.project.count({ where: { orgId: ctx.organizationId, status: "ACTIVE" } }),
      ]);
      const modules: Record<string, ReturnType<typeof moduleStatuses>[ModuleId]> = moduleStatuses(states);
      const list = Object.values(modules);
      const done = states.filter((s) => s.done).length;
      return {
        percentage: Math.round((done / states.length) * 100),
        modulesCompleted: list.filter((m) => m.status === "COMPLETADO").length,
        activeProjects,
        inProgress: activeProjects,
        pendingInvites: 0,
        activeModuleName: (Object.entries(modules).find(([, m]) => m.status === "EN_CURSO")?.[0] ?? "M5") as string,
        modules,
      };
    }),

  /** Estado de cada herramienta del plan (índices de módulo y menú lateral). */
  sections: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const states = await getSectionStates(ctx.db, input.cycleId, ctx.getActiveOrgId);
      return {
        sections: states.map(({ sql: _sql, ...rest }) => rest),
        modules: moduleStatuses(states),
      };
    }),

  /** Tablero de inicio: avance del plan + BSC + portafolio + mis tareas, en un solo viaje. */
  cockpit: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const cycle = await ctx.db.strategicCycle.findUniqueOrThrow({
        where: { id: input.cycleId },
        select: { yearStart: true, yearEnd: true },
      });
      const [states, kpis, projectAgg, myTasks, members, olpCount] = await Promise.all([
        getSectionStates(ctx.db, input.cycleId, ctx.getActiveOrgId),
        ctx.db.kpi.findMany({
          where: { cycleId: input.cycleId, status: { in: ["aceptado", "en_edicion", "confirmado"] } },
          select: {
            id: true, code: true, name: true, description: true, dimensionBsc: true, unit: true, frequency: true,
            direction: true, source: true, educanetLinkId: true, educanetLastReceivedAt: true, responsibleRole: true,
            responsibleArea: { select: { name: true } },
            periods: {
              select: { period: true, metaGreen: true, metaAmber: true, metaRed: true, realValue: true, semaforoActual: true, percentCompletion: true, dataReceivedAt: true },
            },
          },
        }),
        ctx.db.$queryRaw<{ projects: bigint; total: bigint; done: bigint; overdue: bigint }[]>`
          SELECT COUNT(DISTINCT p.id) AS projects,
            COUNT(i.id) FILTER (WHERE i."parentId" IS NULL) AS total,
            COUNT(i.id) FILTER (WHERE i."parentId" IS NULL AND ws.category = 'DONE') AS done,
            COUNT(i.id) FILTER (WHERE i."dueDate" < NOW() AND COALESCE(ws.category, 'TODO') <> 'DONE') AS overdue
          FROM "Project" p
          JOIN "Portfolio" pf ON pf.id = p."portfolioId" AND pf."cycleId" = ${input.cycleId}
          LEFT JOIN "Issue" i ON i."projectId" = p.id
          LEFT JOIN "WorkflowStatus" ws ON ws.id = i."statusId"
          WHERE p."orgId" = ${ctx.organizationId}`,
        ctx.db.issue.findMany({
          where: {
            assigneeId: ctx.userId,
            project: { orgId: ctx.organizationId },
            OR: [{ status: null }, { status: { category: { not: "DONE" } } }],
            dueDate: { not: null },
          },
          select: { id: true, summary: true, dueDate: true, type: true, project: { select: { id: true, name: true, color: true } } },
          orderBy: { dueDate: "asc" },
          take: 6,
        }),
        ctx.db.organizationMember.count({ where: { organizationId: ctx.organizationId } }),
        ctx.db.olp.count({ where: { cycleId: input.cycleId } }),
      ]);

      const period = getDefaultPeriod(kpis, cycle.yearStart, cycle.yearEnd);
      const snaps = kpis.map((k) => buildKpiSnapshot(k, period));
      const bsc = computeGlobalCompliance(snaps);
      const byDim = (["resultados_economicos", "posicion_mercado", "como_opera_empresa", "personas_cultura"] as const).map((d) => {
        const list = snaps.filter((s) => s.dimensionBsc === d);
        return {
          dimension: d,
          pct: bsc.byDimension[d],
          verde: list.filter((s) => s.semaforo === "verde").length,
          ambar: list.filter((s) => s.semaforo === "ambar").length,
          rojo: list.filter((s) => s.semaforo === "rojo").length,
          sinDato: list.filter((s) => s.semaforo === "sin_dato").length,
          total: list.length,
        };
      });
      const agg = projectAgg[0];
      const total = Number(agg?.total ?? 0);
      const done = Number(agg?.done ?? 0);
      const modules = moduleStatuses(states);
      return {
        plan: {
          percentage: Math.round((states.filter((s) => s.done).length / states.length) * 100),
          modules,
          next: (() => {
            const n = states.find((s) => !s.done);
            return n ? { label: n.label, description: n.description, module: n.module, path: n.path.startsWith("/") ? n.path : `/cycles/${input.cycleId}/${n.path}` } : null;
          })(),
        },
        bsc: { period, globalPct: bsc.globalPct, counts: bsc.counts, byDim, kpis: snaps.length, olps: olpCount },
        portfolio: {
          projects: Number(agg?.projects ?? 0),
          tasks: total,
          done,
          overdue: Number(agg?.overdue ?? 0),
          progress: total ? Math.round((done / total) * 100) : 0,
        },
        myTasks,
        members,
        today: now,
      };
    }),

  getNextStep: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const states = await getSectionStates(ctx.db, input.cycleId, ctx.getActiveOrgId);
      const next = states.find((s) => !s.done);
      if (!next) return null;
      return {
        title: next.label,
        description: next.description,
        path: next.path.startsWith("/") ? next.path : `/cycles/${input.cycleId}/${next.path}`,
      };
    }),

  getActivity: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async () => {
      // No dedicated activity log model exists yet — return empty
      return [] as {
        userName: string;
        userInitials: string;
        action: string;
        timeAgo: string;
      }[];
    }),

  getPending: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const states = await getSectionStates(ctx.db, input.cycleId, ctx.getActiveOrgId);
      const firstOpen = states.find((s) => !s.done)?.module;
      if (!firstOpen) return [];
      return states
        .filter((s) => !s.done && s.module === firstOpen)
        .slice(0, 5)
        .map((s) => ({
          title: s.label,
          subtitle: `${s.module} · ${MODULE_NAMES[s.module]}`,
          path: s.path.startsWith("/") ? s.path : `/cycles/${input.cycleId}/${s.path}`,
          color: MODULE_COLORS[s.module],
        }));
    }),
});
