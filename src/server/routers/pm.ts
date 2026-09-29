import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, projectProcedure, cycleProcedure } from "@/server/trpc/init";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  BSC_ORDER,
  BSC_PERSPECTIVES,
  DEFAULT_WORKFLOW,
  PROJECT_COLORS,
  quarterRange,
  toBscCode,
  type BscCode,
  type StatusCategory,
} from "@/lib/pm";

// Gestión de proyectos tipo Asana/ClickUp: portafolio generado desde el plan,
// vistas de proyecto (lista, tablero, Gantt, calendario), evidencias y tiempos.

type Db = PrismaClient;

async function assertIssueInOrg(db: Db, issueId: string, orgId: string) {
  const issue = await db.issue.findUnique({
    where: { id: issueId },
    select: { id: true, projectId: true, project: { select: { orgId: true } } },
  });
  if (!issue || issue.project.orgId !== orgId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a esta tarea" });
  }
  return issue;
}

async function createDefaultWorkflow(db: Db, projectId: string) {
  await db.workflowStatus.createMany({
    data: DEFAULT_WORKFLOW.map((s, i) => ({ projectId, name: s.name, category: s.category, color: s.color, sortOrder: i })),
  });
  return db.workflowStatus.findMany({ where: { projectId }, orderBy: { sortOrder: "asc" } });
}

type IssueLite = {
  projectId: string;
  parentId: string | null;
  dueDate: Date | null;
  estimateHours: number | null;
  timeSpent: number | null;
  status: { category: string } | null;
};

function computeStats(issues: IssueLite[]) {
  const now = Date.now();
  // El avance se mide sobre tareas principales; las subtareas pesan dentro de su padre.
  const top = issues.filter((i) => !i.parentId);
  const total = top.length;
  const done = top.filter((i) => i.status?.category === "DONE").length;
  const inProgress = top.filter((i) => i.status?.category === "IN_PROGRESS").length;
  const overdue = issues.filter(
    (i) => i.dueDate && i.dueDate.getTime() < now && i.status?.category !== "DONE",
  ).length;
  const estimate = issues.reduce((a, i) => a + (i.estimateHours ?? 0), 0);
  const spent = issues.reduce((a, i) => a + (i.timeSpent ?? 0), 0);
  return {
    total,
    done,
    inProgress,
    todo: total - done - inProgress,
    overdue,
    progress: total ? Math.round((done / total) * 100) : 0,
    estimate,
    spent,
  };
}

function health(stats: ReturnType<typeof computeStats>, endDate: Date | null, startDate: Date | null) {
  if (stats.total === 0) return "SIN_TAREAS" as const;
  if (stats.progress === 100) return "COMPLETADO" as const;
  // Avance esperado según el tiempo transcurrido del proyecto.
  if (startDate && endDate && endDate > startDate) {
    const elapsed = (Date.now() - startDate.getTime()) / (endDate.getTime() - startDate.getTime());
    const expected = Math.min(100, Math.max(0, elapsed * 100));
    if (stats.progress + 25 < expected || (endDate.getTime() < Date.now() && stats.progress < 100)) return "EN_RIESGO" as const;
    if (stats.progress + 10 < expected || stats.overdue > 0) return "ATENCION" as const;
  } else if (stats.overdue > 0) {
    return "ATENCION" as const;
  }
  return "EN_CAMINO" as const;
}

async function uniqueProjectKey(db: Db, orgId: string, base: string) {
  const clean = base.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 8) || "PRY";
  let key = clean;
  let n = 2;
  while (await db.project.findUnique({ where: { orgId_key: { orgId, key } } })) {
    key = `${clean.slice(0, 7)}${n++}`.slice(0, 10);
  }
  return key;
}

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

// ---------------------------------------------------------------------------
// Plan → portafolio: Perspectiva BSC → Portafolio, OLP → Programa,
// OCP → Proyecto, acciones trimestrales del OCP → Tareas (+ hito de la meta).
// ---------------------------------------------------------------------------
async function planFromCycle(db: Db, orgId: string, cycleId: string, userId: string, apply: boolean) {
  const cycle = await db.strategicCycle.findUniqueOrThrow({ where: { id: cycleId } });
  const olps = await db.olp.findMany({
    where: { cycleId },
    orderBy: { sortOrder: "asc" },
    include: {
      ocps: {
        orderBy: [{ year: "asc" }, { sortOrder: "asc" }],
        include: {
          actions: { orderBy: [{ quarter: "asc" }, { sortOrder: "asc" }] },
          responsibleArea: true,
          kpiLinks: { include: { kpi: { select: { code: true, name: true } } } },
          initiatives: { select: { id: true, name: true } },
        },
      },
    },
  });

  const existingPortfolios = await db.portfolio.findMany({ where: { cycleId } });
  const existingPrograms = await db.program.findMany({ where: { portfolio: { cycleId } } });

  const summary = { portfolios: 0, programs: 0, projects: 0, tasks: 0, skipped: 0 };
  const tree: {
    code: BscCode;
    label: string;
    exists: boolean;
    programs: {
      olpCode: string;
      name: string;
      exists: boolean;
      projects: { ocpCode: string; name: string; year: number; exists: boolean; tasks: number; area: string | null }[];
    }[];
  }[] = [];

  let colorIdx = 0;
  for (const code of BSC_ORDER) {
    const olpsOfDim = olps
      .map((o, idx) => ({ olp: o, olpCode: `OLP${idx + 1}` }))
      .filter(({ olp }) => toBscCode(olp.bscPerspective) === code);
    if (olpsOfDim.length === 0) continue;

    const persp = BSC_PERSPECTIVES[code];
    let portfolio = existingPortfolios.find((p) => p.bscPerspective === code) ?? null;
    const node: (typeof tree)[number] = { code, label: persp.label, exists: !!portfolio, programs: [] };
    tree.push(node);

    if (apply && !portfolio) {
      let axis = await db.strategicAxis.findFirst({ where: { cycleId, name: persp.label } });
      if (!axis) {
        axis = await db.strategicAxis.create({
          data: { organizationId: orgId, cycleId, name: persp.label, color: persp.color, sortOrder: BSC_ORDER.indexOf(code) },
        });
      }
      portfolio = await db.portfolio.create({
        data: {
          organizationId: orgId,
          cycleId,
          axisId: axis.id,
          bscPerspective: code,
          name: `Portafolio · ${persp.label}`,
          description: `Iniciativas que ejecutan los objetivos de la perspectiva ${persp.short} del Balanced Scorecard.`,
          ownerId: userId,
          sortOrder: BSC_ORDER.indexOf(code),
        },
      });
      summary.portfolios++;
    }

    for (const { olp, olpCode } of olpsOfDim) {
      let program = existingPrograms.find((p) => p.olpId === olp.id) ?? null;
      const pNode: (typeof node.programs)[number] = {
        olpCode,
        name: `${olpCode} · ${truncate(olp.description, 90)}`,
        exists: !!program,
        projects: [],
      };
      node.programs.push(pNode);

      if (apply && !program && portfolio) {
        program = await db.program.create({
          data: {
            portfolioId: portfolio.id,
            olpId: olp.id,
            name: pNode.name,
            description: olp.description,
            ownerId: userId,
            startDate: new Date(Date.UTC(cycle.yearStart, 0, 1, 12)),
            endDate: new Date(Date.UTC(olp.targetYear ?? cycle.yearEnd, 11, 31, 12)),
          },
        });
        summary.programs++;
      }

      for (const ocp of olp.ocps) {
        const exists = ocp.initiatives.length > 0;
        pNode.projects.push({
          ocpCode: ocp.code,
          name: `${ocp.code} · ${truncate(ocp.description, 90)}`,
          year: ocp.year,
          exists,
          tasks: ocp.actions.length + 1,
          area: ocp.responsibleArea?.name ?? null,
        });

        if (exists) {
          summary.skipped++;
          // Enlaza iniciativas creadas a mano con su lugar en el portafolio.
          if (apply && portfolio) {
            await db.project.updateMany({
              where: { ocpId: ocp.id, portfolioId: null },
              data: { portfolioId: portfolio.id, programId: program?.id },
            });
          }
          continue;
        }
        if (!apply || !portfolio) continue;

        const key = await uniqueProjectKey(db, orgId, `${ocp.code.replace(/\..*/, "")}-${String(ocp.year).slice(2)}`);
        const meta = ocp.metaValue != null ? `${ocp.metaValue}${ocp.unit ? " " + ocp.unit : ""}` : ocp.metaText;
        const kpis = ocp.kpiLinks.map((k) => `${k.kpi.code} ${k.kpi.name}`).join("; ");
        const project = await db.project.create({
          data: {
            orgId,
            portfolioId: portfolio.id,
            programId: program?.id,
            ocpId: ocp.id,
            key,
            name: `${ocp.code} · ${truncate(ocp.description, 90)}`,
            description: [
              ocp.description,
              meta ? `Meta: ${meta}` : null,
              ocp.indicator ? `Indicador: ${ocp.indicator}` : null,
              kpis ? `KPIs del BSC: ${kpis}` : null,
              ocp.responsibleArea ? `Área responsable: ${ocp.responsibleArea.name}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
            ownerId: userId,
            color: PROJECT_COLORS[colorIdx++ % PROJECT_COLORS.length],
            startDate: new Date(Date.UTC(ocp.year, 0, 1, 12)),
            endDate: new Date(Date.UTC(ocp.year, 11, 31, 12)),
          },
        });
        await db.projectMember.create({ data: { projectId: project.id, userId, role: "ADMIN" } });
        const statuses = await createDefaultWorkflow(db, project.id);
        const byCat = (cat: StatusCategory) => statuses.find((s) => s.category === cat)?.id ?? statuses[0]?.id;
        const actionStatus: Record<string, StatusCategory> = { pendiente: "TODO", en_curso: "IN_PROGRESS", completada: "DONE" };

        let number = 1;
        const tasks: {
          projectId: string; number: number; type: string; summary: string; description: string;
          statusId: string | undefined; priority: string; reporterId: string; startDate: Date; dueDate: Date;
          ocpActionId: string | null; sortOrder: number;
        }[] = ocp.actions.map((a, i) => {
          const { start, end } = quarterRange(ocp.year, a.quarter);
          return {
            projectId: project.id,
            number: number++,
            type: "TASK",
            summary: a.description,
            description: `Acción ${a.quarter} del ${ocp.code}.`,
            statusId: byCat(actionStatus[a.status] ?? "TODO"),
            priority: ocp.priority === "alta" ? "HIGH" : ocp.priority === "baja" ? "LOW" : "MEDIUM",
            reporterId: userId,
            startDate: start,
            dueDate: end,
            ocpActionId: a.id,
            sortOrder: i,
          };
        });
        tasks.push({
          projectId: project.id,
          number: number++,
          type: "MILESTONE",
          summary: `Hito: meta del ${ocp.code} cumplida${meta ? ` (${meta})` : ""}`,
          description: "Hito de cierre. Adjunta aquí la evidencia del resultado medido.",
          statusId: byCat("TODO"),
          priority: "HIGH",
          reporterId: userId,
          startDate: new Date(Date.UTC(ocp.year, 11, 31, 12)),
          dueDate: new Date(Date.UTC(ocp.year, 11, 31, 12)),
          ocpActionId: null,
          sortOrder: tasks.length,
        });
        const created = await db.issue.createManyAndReturn({ data: tasks, select: { id: true } });
        await db.issueHistory.createMany({ data: created.map((c) => ({ issueId: c.id, userId, field: "created" })) });
        summary.projects++;
        summary.tasks += tasks.length;
      }
    }
  }

  return { tree, summary, hasPlan: olps.length > 0, ocpCount: olps.reduce((a, o) => a + o.ocps.length, 0) };
}

export const pmRouter = router({
  // ---------------------------------------------------------------- Portafolio
  planPreview: cycleProcedure.input(z.object({ cycleId: z.string() })).query(async ({ ctx, input }) => {
    return planFromCycle(ctx.db, ctx.organizationId, input.cycleId, ctx.userId, false);
  }),

  generateFromPlan: cycleProcedure.input(z.object({ cycleId: z.string() })).mutation(async ({ ctx, input }) => {
    const res = await planFromCycle(ctx.db, ctx.organizationId, input.cycleId, ctx.userId, true);
    return res.summary;
  }),

  portfolioTree: protectedProcedure
    .input(z.object({ cycleId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const cycleFilter = input?.cycleId ? { cycleId: input.cycleId } : {};
      const [portfolios, projects] = await Promise.all([
        ctx.db.portfolio.findMany({
          where: { organizationId: ctx.organizationId, ...cycleFilter },
          include: { axis: true, programs: { orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        }),
        ctx.db.project.findMany({
          where: { orgId: ctx.organizationId },
          include: { ocp: { select: { code: true, year: true } } },
          orderBy: { createdAt: "asc" },
        }),
      ]);
      const issues = await ctx.db.issue.findMany({
        where: { projectId: { in: projects.map((p) => p.id) } },
        select: {
          projectId: true, parentId: true, dueDate: true, estimateHours: true, timeSpent: true,
          status: { select: { category: true } },
        },
      });
      const owners = await ctx.db.user.findMany({
        where: { id: { in: projects.map((p) => p.ownerId).filter(Boolean) as string[] } },
        select: { id: true, name: true },
      });

      const projectRows = projects.map((p) => {
        const stats = computeStats(issues.filter((i) => i.projectId === p.id));
        return {
          ...p,
          owner: owners.find((o) => o.id === p.ownerId) ?? null,
          stats,
          health: health(stats, p.endDate, p.startDate),
        };
      });
      const rollup = (rows: typeof projectRows) => {
        const s = computeStats(issues.filter((i) => rows.some((r) => r.id === i.projectId)));
        return { ...s, projects: rows.length, atRisk: rows.filter((r) => r.health === "EN_RIESGO").length };
      };

      const tree = portfolios.map((pf) => {
        const pfProjects = projectRows.filter((p) => p.portfolioId === pf.id);
        return {
          ...pf,
          stats: rollup(pfProjects),
          programs: pf.programs.map((pg) => {
            const pgProjects = pfProjects.filter((p) => p.programId === pg.id);
            return { ...pg, stats: rollup(pgProjects), projects: pgProjects };
          }),
          directProjects: pfProjects.filter((p) => !p.programId || !pf.programs.some((pg) => pg.id === p.programId)),
        };
      });
      const unassigned = projectRows.filter((p) => !p.portfolioId || !portfolios.some((pf) => pf.id === p.portfolioId));
      return { tree, unassigned, totals: rollup(projectRows) };
    }),

  /** "Mis tareas": lo asignado a mí en todos los proyectos de la organización. */
  myTasks: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.issue.findMany({
      where: {
        assigneeId: ctx.userId,
        project: { orgId: ctx.organizationId, status: { in: ["ACTIVE", "ON_HOLD"] } },
        OR: [{ status: null }, { status: { category: { not: "DONE" } } }],
      },
      select: {
        id: true, number: true, summary: true, type: true, priority: true, startDate: true, dueDate: true, parentId: true,
        status: { select: { id: true, name: true, color: true, category: true } },
        project: { select: { id: true, key: true, name: true, color: true } },
        parent: { select: { summary: true } },
      },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { priority: "asc" }],
      take: 300,
    });
  }),

  // ---------------------------------------------------------------- Proyecto
  createProject: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        key: z.string().max(10).optional(),
        description: z.string().optional(),
        portfolioId: z.string().nullable().optional(),
        programId: z.string().nullable().optional(),
        ocpId: z.string().nullable().optional(),
        color: z.string().optional(),
        startDate: z.coerce.date().nullable().optional(),
        endDate: z.coerce.date().nullable().optional(),
        memberIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const baseKey =
        input.key ||
        input.name
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .split(/\s+/)
          .map((w) => w[0])
          .join("")
          .slice(0, 5);
      const key = await uniqueProjectKey(ctx.db, ctx.organizationId, baseKey);
      const project = await ctx.db.project.create({
        data: {
          orgId: ctx.organizationId,
          key,
          name: input.name,
          description: input.description,
          portfolioId: input.portfolioId ?? undefined,
          programId: input.programId ?? undefined,
          ocpId: input.ocpId ?? undefined,
          color: input.color ?? PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
          ownerId: ctx.userId,
          startDate: input.startDate ?? undefined,
          endDate: input.endDate ?? undefined,
        },
      });
      const memberIds = Array.from(new Set([ctx.userId, ...(input.memberIds ?? [])]));
      await ctx.db.projectMember.createMany({
        data: memberIds.map((userId) => ({ projectId: project.id, userId, role: userId === ctx.userId ? "ADMIN" : "MEMBER" })),
        skipDuplicates: true,
      });
      await createDefaultWorkflow(ctx.db, project.id);
      return project;
    }),

  updateProject: projectProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
        color: z.string().optional(),
        ownerId: z.string().nullable().optional(),
        portfolioId: z.string().nullable().optional(),
        programId: z.string().nullable().optional(),
        startDate: z.coerce.date().nullable().optional(),
        endDate: z.coerce.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { projectId, ...data } = input;
      return ctx.db.project.update({ where: { id: projectId }, data });
    }),

  /** Todo lo que necesita el espacio de trabajo del proyecto en una sola consulta. */
  workspace: projectProcedure.input(z.object({ projectId: z.string() })).query(async ({ ctx, input }) => {
    const project = await ctx.db.project.findUniqueOrThrow({
      where: { id: input.projectId },
      include: {
        portfolio: { select: { id: true, name: true, bscPerspective: true } },
        program: { select: { id: true, name: true } },
        ocp: {
          select: {
            id: true, code: true, description: true, year: true, metaValue: true, metaText: true, unit: true,
            indicator: true, cycleId: true,
            olp: { select: { description: true, bscPerspective: true } },
            kpiLinks: { select: { kpi: { select: { id: true, code: true, name: true } } } },
          },
        },
        workflows: { orderBy: { sortOrder: "asc" } },
        labels: true,
        members: { include: { user: { select: { id: true, name: true, email: true, area: true } } }, orderBy: { createdAt: "asc" } },
      },
    });
    if (project.workflows.length === 0) {
      project.workflows = await createDefaultWorkflow(ctx.db, project.id);
    }
    const orgMembers = await ctx.db.organizationMember.findMany({
      where: { organizationId: ctx.organizationId },
      include: { user: { select: { id: true, name: true, email: true, area: true } } },
    });
    const users = new Map<string, { id: string; name: string; email: string; area: string | null }>();
    for (const m of orgMembers) users.set(m.user.id, m.user);
    for (const m of project.members) users.set(m.user.id, m.user);
    return { project, users: Array.from(users.values()).sort((a, b) => a.name.localeCompare(b.name)) };
  }),

  tasks: projectProcedure.input(z.object({ projectId: z.string() })).query(async ({ ctx, input }) => {
    return ctx.db.issue.findMany({
      where: { projectId: input.projectId },
      select: {
        id: true, number: true, type: true, summary: true, statusId: true, priority: true, assigneeId: true,
        parentId: true, estimateHours: true, timeSpent: true, startDate: true, dueDate: true, resolvedAt: true,
        sortOrder: true, createdAt: true,
        labels: { select: { label: { select: { id: true, name: true, color: true } } } },
        linksFrom: { where: { type: "BLOCKS" }, select: { id: true, toIssueId: true } },
        _count: { select: { attachments: true, comments: true, children: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { number: "asc" }],
    });
  }),

  summary: projectProcedure.input(z.object({ projectId: z.string() })).query(async ({ ctx, input }) => {
    const project = await ctx.db.project.findUniqueOrThrow({ where: { id: input.projectId } });
    const issues = await ctx.db.issue.findMany({
      where: { projectId: input.projectId },
      select: {
        id: true, number: true, summary: true, type: true, assigneeId: true, parentId: true, dueDate: true,
        estimateHours: true, timeSpent: true, projectId: true, statusId: true,
        status: { select: { category: true, name: true, color: true } },
      },
    });
    const stats = computeStats(issues);
    const byStatus = new Map<string, { name: string; color: string | null; count: number }>();
    for (const i of issues.filter((x) => !x.parentId)) {
      const k = i.statusId ?? "none";
      const cur = byStatus.get(k) ?? { name: i.status?.name ?? "Sin estado", color: i.status?.color ?? null, count: 0 };
      cur.count++;
      byStatus.set(k, cur);
    }
    const byAssignee = new Map<string, { assigneeId: string | null; total: number; done: number; overdue: number; estimate: number; spent: number }>();
    const now = Date.now();
    for (const i of issues) {
      const k = i.assigneeId ?? "none";
      const cur = byAssignee.get(k) ?? { assigneeId: i.assigneeId, total: 0, done: 0, overdue: 0, estimate: 0, spent: 0 };
      cur.total++;
      if (i.status?.category === "DONE") cur.done++;
      else if (i.dueDate && i.dueDate.getTime() < now) cur.overdue++;
      cur.estimate += i.estimateHours ?? 0;
      cur.spent += i.timeSpent ?? 0;
      byAssignee.set(k, cur);
    }
    const upcoming = issues
      .filter((i) => i.dueDate && i.status?.category !== "DONE")
      .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
      .slice(0, 8);
    const ids = issues.map((i) => i.id);
    const [activity, evidenceCount] = await Promise.all([
      ctx.db.issueHistory.findMany({
        where: { issueId: { in: ids } },
        orderBy: { createdAt: "desc" },
        take: 15,
        include: { issue: { select: { id: true, number: true, summary: true } } },
      }),
      ctx.db.issueAttachment.count({ where: { issueId: { in: ids } } }),
    ]);
    return {
      stats,
      health: health(stats, project.endDate, project.startDate),
      byStatus: Array.from(byStatus.values()),
      byAssignee: Array.from(byAssignee.values()).sort((a, b) => b.total - a.total),
      upcoming,
      activity,
      evidenceCount,
    };
  }),

  // ---------------------------------------------------------------- Miembros
  addMember: projectProcedure
    .input(z.object({ projectId: z.string(), userId: z.string(), role: z.enum(["ADMIN", "PM", "MEMBER", "VIEWER"]).default("MEMBER") }))
    .mutation(async ({ ctx, input }) => {
      const inOrg = await ctx.db.organizationMember.findUnique({
        where: { userId_organizationId: { userId: input.userId, organizationId: ctx.organizationId } },
      });
      if (!inOrg) throw new TRPCError({ code: "BAD_REQUEST", message: "El usuario no pertenece a la organización" });
      return ctx.db.projectMember.upsert({
        where: { projectId_userId: { projectId: input.projectId, userId: input.userId } },
        update: { role: input.role },
        create: { projectId: input.projectId, userId: input.userId, role: input.role },
      });
    }),

  removeMember: projectProcedure
    .input(z.object({ projectId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.projectMember.deleteMany({ where: { projectId: input.projectId, userId: input.userId } });
      return { ok: true };
    }),

  // ---------------------------------------------------------------- Tareas
  createTask: projectProcedure
    .input(
      z.object({
        projectId: z.string(),
        summary: z.string().min(1).max(300),
        type: z.enum(["TASK", "MILESTONE", "SUBTASK"]).default("TASK"),
        statusId: z.string().nullable().optional(),
        parentId: z.string().nullable().optional(),
        assigneeId: z.string().nullable().optional(),
        priority: z.string().optional(),
        startDate: z.coerce.date().nullable().optional(),
        dueDate: z.coerce.date().nullable().optional(),
        estimateHours: z.number().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const last = await ctx.db.issue.findFirst({
        where: { projectId: input.projectId },
        orderBy: { number: "desc" },
        select: { number: true },
      });
      let statusId = input.statusId ?? null;
      if (!statusId) {
        const s = await ctx.db.workflowStatus.findFirst({
          where: { projectId: input.projectId, category: "TODO" },
          orderBy: { sortOrder: "asc" },
        });
        statusId = s?.id ?? null;
      }
      const maxOrder = await ctx.db.issue.aggregate({
        where: { projectId: input.projectId, parentId: input.parentId ?? null },
        _max: { sortOrder: true },
      });
      const issue = await ctx.db.issue.create({
        data: {
          projectId: input.projectId,
          number: (last?.number ?? 0) + 1,
          type: input.parentId ? "SUBTASK" : input.type,
          summary: input.summary.trim(),
          statusId,
          parentId: input.parentId ?? null,
          assigneeId: input.assigneeId ?? null,
          priority: input.priority ?? "MEDIUM",
          startDate: input.startDate ?? (input.type === "MILESTONE" ? input.dueDate : null) ?? null,
          dueDate: input.dueDate ?? null,
          estimateHours: input.estimateHours ?? null,
          reporterId: ctx.userId,
          sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        },
      });
      await ctx.db.issueHistory.create({ data: { issueId: issue.id, userId: ctx.userId, field: "created" } });
      if (issue.assigneeId) {
        await ctx.db.projectMember.upsert({
          where: { projectId_userId: { projectId: input.projectId, userId: issue.assigneeId } },
          update: {},
          create: { projectId: input.projectId, userId: issue.assigneeId, role: "MEMBER" },
        });
      }
      return issue;
    }),

  /** Mover tarjetas en el tablero / reordenar en la lista. */
  moveTasks: projectProcedure
    .input(
      z.object({
        projectId: z.string(),
        moves: z.array(z.object({ id: z.string(), statusId: z.string().nullable().optional(), sortOrder: z.number().int() })).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.issue.findMany({
        where: { projectId: input.projectId, id: { in: input.moves.map((m) => m.id) } },
        select: { id: true, statusId: true },
      });
      const statuses = await ctx.db.workflowStatus.findMany({ where: { projectId: input.projectId } });
      const history: { issueId: string; userId: string; field: string; oldValue: string | null; newValue: string | null }[] = [];
      await ctx.db.$transaction(
        input.moves
          .filter((m) => current.some((c) => c.id === m.id))
          .map((m) => {
            const prev = current.find((c) => c.id === m.id)!;
            const statusChanged = m.statusId !== undefined && m.statusId !== prev.statusId;
            const newStatus = statusChanged ? statuses.find((s) => s.id === m.statusId) : undefined;
            if (statusChanged) {
              history.push({ issueId: m.id, userId: ctx.userId, field: "statusId", oldValue: prev.statusId, newValue: m.statusId ?? null });
            }
            return ctx.db.issue.update({
              where: { id: m.id },
              data: {
                sortOrder: m.sortOrder,
                ...(statusChanged && {
                  statusId: m.statusId,
                  resolvedAt: newStatus?.category === "DONE" ? new Date() : null,
                }),
              },
            });
          }),
      );
      if (history.length) await ctx.db.issueHistory.createMany({ data: history });
      return { ok: true };
    }),

  /** Marcar hecho / reabrir (checkbox de lista y subtareas). */
  toggleComplete: protectedProcedure
    .input(z.object({ id: z.string(), done: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const issue = await assertIssueInOrg(ctx.db, input.id, ctx.organizationId);
      const statuses = await ctx.db.workflowStatus.findMany({
        where: { projectId: issue.projectId },
        orderBy: { sortOrder: "asc" },
      });
      const target = input.done
        ? statuses.find((s) => s.category === "DONE")
        : statuses.find((s) => s.category === "TODO");
      if (!target) throw new TRPCError({ code: "BAD_REQUEST", message: "El proyecto no tiene estados configurados" });
      const prev = await ctx.db.issue.findUniqueOrThrow({ where: { id: input.id }, select: { statusId: true } });
      await ctx.db.issueHistory.create({
        data: { issueId: input.id, userId: ctx.userId, field: "statusId", oldValue: prev.statusId, newValue: target.id },
      });
      return ctx.db.issue.update({
        where: { id: input.id },
        data: { statusId: target.id, resolvedAt: input.done ? new Date() : null },
      });
    }),

  taskDetail: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    await assertIssueInOrg(ctx.db, input.id, ctx.organizationId);
    return ctx.db.issue.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        project: { select: { id: true, key: true, name: true } },
        status: true,
        parent: { select: { id: true, number: true, summary: true } },
        children: {
          select: {
            id: true, number: true, summary: true, statusId: true, assigneeId: true, dueDate: true, priority: true,
            status: { select: { category: true } },
          },
          orderBy: [{ sortOrder: "asc" }, { number: "asc" }],
        },
        labels: { include: { label: true } },
        comments: { orderBy: { createdAt: "asc" } },
        attachments: { orderBy: { createdAt: "desc" } },
        history: { orderBy: { createdAt: "desc" }, take: 50 },
        timeEntries: { orderBy: { date: "desc" } },
        linksFrom: { include: { toIssue: { select: { id: true, number: true, summary: true, status: { select: { category: true } } } } } },
        linksTo: { include: { fromIssue: { select: { id: true, number: true, summary: true, status: { select: { category: true } } } } } },
      },
    });
  }),

  deleteTimeEntry: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const entry = await ctx.db.timeEntry.findUniqueOrThrow({ where: { id: input.id } });
    await assertIssueInOrg(ctx.db, entry.issueId, ctx.organizationId);
    if (entry.userId !== ctx.userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Solo puedes borrar tus propios registros de tiempo" });
    }
    await ctx.db.timeEntry.delete({ where: { id: input.id } });
    const agg = await ctx.db.timeEntry.aggregate({ where: { issueId: entry.issueId }, _sum: { hours: true } });
    await ctx.db.issue.update({ where: { id: entry.issueId }, data: { timeSpent: agg._sum.hours ?? 0 } });
    return { ok: true };
  }),

  // ---------------------------------------------------------------- Evidencias
  addEvidence: protectedProcedure
    .input(
      z.object({
        issueId: z.string(),
        name: z.string().min(1),
        url: z.string().min(1),
        size: z.number().optional(),
        mimeType: z.string().optional(),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertIssueInOrg(ctx.db, input.issueId, ctx.organizationId);
      const att = await ctx.db.issueAttachment.create({ data: { ...input, uploadedBy: ctx.userId } });
      await ctx.db.issueHistory.create({
        data: { issueId: input.issueId, userId: ctx.userId, field: "evidence", newValue: input.name },
      });
      return att;
    }),

  updateEvidence: protectedProcedure
    .input(z.object({ id: z.string(), note: z.string().max(500).nullable() }))
    .mutation(async ({ ctx, input }) => {
      const att = await ctx.db.issueAttachment.findUniqueOrThrow({ where: { id: input.id } });
      await assertIssueInOrg(ctx.db, att.issueId, ctx.organizationId);
      return ctx.db.issueAttachment.update({ where: { id: input.id }, data: { note: input.note } });
    }),

  projectEvidence: projectProcedure.input(z.object({ projectId: z.string() })).query(async ({ ctx, input }) => {
    return ctx.db.issueAttachment.findMany({
      where: { issue: { projectId: input.projectId } },
      include: { issue: { select: { id: true, number: true, summary: true, type: true } } },
      orderBy: { createdAt: "desc" },
    });
  }),

  // ---------------------------------------------------------------- Dependencias
  addDependency: protectedProcedure
    .input(z.object({ fromIssueId: z.string(), toIssueId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.fromIssueId === input.toIssueId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Una tarea no puede depender de sí misma" });
      }
      const a = await assertIssueInOrg(ctx.db, input.fromIssueId, ctx.organizationId);
      const b = await assertIssueInOrg(ctx.db, input.toIssueId, ctx.organizationId);
      if (a.projectId !== b.projectId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Las dependencias deben estar en el mismo proyecto" });
      }
      // Evita ciclos: ¿ya existe camino to → from?
      const links = await ctx.db.issueLink.findMany({
        where: { type: "BLOCKS", fromIssue: { projectId: a.projectId } },
        select: { fromIssueId: true, toIssueId: true },
      });
      const seen = new Set<string>();
      const stack = [input.toIssueId];
      while (stack.length) {
        const cur = stack.pop()!;
        if (cur === input.fromIssueId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Esa dependencia crearía un ciclo" });
        }
        if (seen.has(cur)) continue;
        seen.add(cur);
        for (const l of links) if (l.fromIssueId === cur) stack.push(l.toIssueId);
      }
      return ctx.db.issueLink.upsert({
        where: { fromIssueId_toIssueId_type: { fromIssueId: input.fromIssueId, toIssueId: input.toIssueId, type: "BLOCKS" } },
        update: {},
        create: { fromIssueId: input.fromIssueId, toIssueId: input.toIssueId, type: "BLOCKS" },
      });
    }),
});
