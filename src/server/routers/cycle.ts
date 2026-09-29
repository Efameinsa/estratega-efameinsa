import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, authOnlyProcedure, cycleProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";
import { hasPermission, type OrgRole } from "@/lib/permissions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ModuleStatus {
  status: "COMPLETADO" | "EN_CURSO" | "BLOQUEADO";
  progress: number;
}

const M1_SECTIONS = ["vision", "mission", "values", "interests"] as const;
const M2_SECTIONS = [
  "pestec",
  "porter",
  "mefe",
  "mefi",
  "amofhit",
  "mpc",
  "competitiveAnalysis",
  "industryAttractiveness",
] as const;
const M3_SECTIONS = ["olp", "strategy", "peyea"] as const;
const M4_SECTIONS = ["strategicAxis", "portfolio"] as const;

async function countModuleSections(cycleId: string) {
  const [
    visions,
    missions,
    values,
    interests,
    pestec,
    porter,
    mefe,
    mefi,
    amofhit,
    mpc,
    competitiveAnalysis,
    industryAttractiveness,
    olps,
    strategies,
    peyea,
    axes,
    portfolios,
    projects,
  ] = await Promise.all([
    db.vision.count({ where: { cycleId } }),
    db.mission.count({ where: { cycleId } }),
    db.value.count({ where: { cycleId } }),
    db.interest.count({ where: { cycleId } }),
    db.pestecFactor.count({ where: { cycleId } }),
    db.porterAnalysis.count({ where: { cycleId } }),
    db.mefeFactor.count({ where: { cycleId } }),
    db.mefiFactor.count({ where: { cycleId } }),
    db.amofhitArea.count({ where: { cycleId } }),
    db.mpcCompetitor.count({ where: { cycleId } }),
    db.competitiveAnalysis.count({ where: { cycleId } }),
    db.industryAttractiveness.count({ where: { cycleId } }),
    db.olp.count({ where: { cycleId } }),
    db.strategy.count({ where: { cycleId } }),
    db.peyeaAnalysis.count({ where: { cycleId } }),
    db.strategicAxis.count({ where: { cycleId } }),
    db.portfolio.count({ where: { cycleId } }),
    db.project.count({ where: { orgId: cycleId } }).catch(() => 0),
  ]);

  return {
    m1: [visions > 0, missions > 0, values > 0, interests > 0],
    m2: [
      pestec > 0,
      porter > 0,
      mefe > 0,
      mefi > 0,
      amofhit > 0,
      mpc > 0,
      competitiveAnalysis > 0,
      industryAttractiveness > 0,
    ],
    m3: [olps > 0, strategies > 0, peyea > 0],
    m4: [axes > 0, portfolios > 0],
    projects,
  };
}

function computeModuleStatus(
  checks: boolean[],
  prevComplete: boolean
): ModuleStatus {
  if (!prevComplete) return { status: "BLOQUEADO", progress: 0 };
  const done = checks.filter(Boolean).length;
  const progress = Math.round((done / checks.length) * 100);
  if (progress === 100) return { status: "COMPLETADO", progress: 100 };
  if (done > 0) return { status: "EN_CURSO", progress };
  return { status: "EN_CURSO", progress: 0 };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const cycleRouter = router({
  list: authOnlyProcedure.query(async ({ ctx }) => {
    // Get org from DB directly (JWT might be stale after onboarding)
    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { activeOrganizationId: true, organizationId: true },
    });
    const orgId = user?.activeOrganizationId ?? user?.organizationId;
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
      const user = await db.user.findUnique({
        where: { id: ctx.userId },
        select: { activeOrganizationId: true, organizationId: true },
      });
      const orgId = user?.activeOrganizationId ?? user?.organizationId;
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
      const user = await db.user.findUnique({
        where: { id: ctx.userId },
        select: { activeOrganizationId: true, organizationId: true },
      });
      const orgId = user?.activeOrganizationId ?? user?.organizationId;
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
      const user = await db.user.findUnique({
        where: { id: ctx.userId },
        select: { activeOrganizationId: true, organizationId: true },
      });
      const orgId = user?.activeOrganizationId ?? user?.organizationId;
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
      const counts = await countModuleSections(input.cycleId);

      const m1 = computeModuleStatus(counts.m1, true);
      const m2 = computeModuleStatus(counts.m2, m1.status === "COMPLETADO");
      const m3 = computeModuleStatus(
        counts.m3,
        m2.status === "COMPLETADO"
      );
      const m4 = computeModuleStatus(
        counts.m4,
        m3.status === "COMPLETADO"
      );
      const m5: ModuleStatus =
        m4.status === "COMPLETADO"
          ? counts.projects > 0
            ? { status: "COMPLETADO", progress: 100 }
            : { status: "EN_CURSO", progress: 0 }
          : { status: "BLOQUEADO", progress: 0 };

      const modules: Record<string, ModuleStatus> = {
        M1: m1,
        M2: m2,
        M3: m3,
        M4: m4,
        M5: m5,
      };

      const modulesCompleted = Object.values(modules).filter(
        (m) => m.status === "COMPLETADO"
      ).length;

      const percentage = Math.round(
        Object.values(modules).reduce((sum, m) => sum + m.progress, 0) / 5
      );

      // Count active projects from the org
      const activeProjects = await db.project
        .count({ where: { orgId: ctx.organizationId, status: "ACTIVE" } })
        .catch(() => 0);

      const activeModuleName =
        Object.entries(modules).find(
          ([, m]) => m.status === "EN_CURSO"
        )?.[0] ?? "M1";

      return {
        percentage,
        modulesCompleted,
        activeProjects,
        inProgress: activeProjects,
        pendingInvites: 0,
        activeModuleName,
        modules,
      };
    }),

  getNextStep: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const counts = await countModuleSections(input.cycleId);
      const base = `/cycles/${input.cycleId}`;

      // M1 checks
      if (!counts.m1[0])
        return {
          title: "Define la Visión",
          description:
            "Establece la visión a largo plazo de tu organización.",
          path: `${base}/m1-identity/vision`,
        };
      if (!counts.m1[1])
        return {
          title: "Define la Misión",
          description: "Describe el propósito y razón de ser de tu organización.",
          path: `${base}/m1-identity/mission`,
        };
      if (!counts.m1[2])
        return {
          title: "Define los Valores",
          description: "Establece los valores que guían a tu organización.",
          path: `${base}/m1-identity/values`,
        };
      if (!counts.m1[3])
        return {
          title: "Define los Intereses",
          description:
            "Identifica los intereses organizacionales y principios cardinales.",
          path: `${base}/m1-identity/interests`,
        };

      // M2 checks
      if (!counts.m2[0])
        return {
          title: "Análisis PESTEC",
          description:
            "Analiza los factores políticos, económicos, sociales, tecnológicos y ecológicos.",
          path: `${base}/m2-diagnosis/pestec`,
        };
      if (!counts.m2[1])
        return {
          title: "5 Fuerzas de Porter",
          description: "Evalúa las fuerzas competitivas de tu industria.",
          path: `${base}/m2-diagnosis/porter`,
        };
      if (!counts.m2[5])
        return {
          title: "Matriz MPC",
          description:
            "Compara tu organización con los competidores principales.",
          path: `${base}/m2-diagnosis/mpc`,
        };
      if (!counts.m2[2])
        return {
          title: "Matriz MEFE",
          description:
            "Sintetiza las oportunidades y amenazas del entorno externo.",
          path: `${base}/m2-diagnosis/mefe`,
        };
      if (!counts.m2[4])
        return {
          title: "Auditoría AMOFHIT",
          description:
            "Realiza la auditoría interna por áreas funcionales.",
          path: `${base}/m2-diagnosis/amofhit`,
        };
      if (!counts.m2[3])
        return {
          title: "Matriz MEFI",
          description:
            "Sintetiza las fortalezas y debilidades internas.",
          path: `${base}/m2-diagnosis/mefi`,
        };

      // M3 checks
      if (!counts.m3[0])
        return {
          title: "Objetivos de Largo Plazo",
          description: "Define los OLP vinculados a tu visión estratégica.",
          path: `${base}/m3-formulation/olp`,
        };
      if (!counts.m3[1])
        return {
          title: "Formulación de Estrategias",
          description:
            "Genera estrategias usando el FODA cruzado y otras matrices.",
          path: `${base}/m3-formulation/strategies`,
        };
      if (!counts.m3[2])
        return {
          title: "Análisis PEYEA",
          description: "Evalúa la posición estratégica de tu organización.",
          path: `${base}/m3-formulation/peyea`,
        };

      // M4
      if (!counts.m4[0])
        return {
          title: "Despliegue Estratégico",
          description:
            "Crea ejes estratégicos y portafolios para ejecutar tus estrategias.",
          path: `${base}/m4-deployment`,
        };

      return null;
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
    .query(async ({ input }) => {
      const counts = await countModuleSections(input.cycleId);
      const base = `/cycles/${input.cycleId}`;
      const items: {
        title: string;
        subtitle: string;
        path: string;
        color: string;
      }[] = [];

      // Find first incomplete module and list its pending sections
      const m1Labels = ["Visión", "Misión", "Valores", "Intereses"];
      const m1Paths = [
        "m1-identity/vision",
        "m1-identity/mission",
        "m1-identity/values",
        "m1-identity/interests",
      ];
      for (let i = 0; i < counts.m1.length; i++) {
        if (!counts.m1[i]) {
          items.push({
            title: m1Labels[i],
            subtitle: "M1 · Identidad",
            path: `${base}/${m1Paths[i]}`,
            color: "#185FA5",
          });
        }
      }
      if (items.length > 0) return items.slice(0, 5);

      const m2Labels = [
        "PESTEC",
        "Porter",
        "MEFE",
        "MEFI",
        "AMOFHIT",
        "MPC",
        "Análisis Competitivo",
        "Atractividad",
      ];
      const m2Paths = [
        "m2-diagnosis/pestec",
        "m2-diagnosis/porter",
        "m2-diagnosis/mefe",
        "m2-diagnosis/mefi",
        "m2-diagnosis/amofhit",
        "m2-diagnosis/mpc",
        "m2-diagnosis/competitive-analysis",
        "m2-diagnosis/industry-attractiveness",
      ];
      for (let i = 0; i < counts.m2.length; i++) {
        if (!counts.m2[i]) {
          items.push({
            title: m2Labels[i],
            subtitle: "M2 · Diagnóstico",
            path: `${base}/${m2Paths[i]}`,
            color: "#D97706",
          });
        }
      }
      if (items.length > 0) return items.slice(0, 5);

      const m3Labels = ["OLP", "Estrategias", "PEYEA"];
      const m3Paths = [
        "m3-formulation/olp",
        "m3-formulation/strategies",
        "m3-formulation/peyea",
      ];
      for (let i = 0; i < counts.m3.length; i++) {
        if (!counts.m3[i]) {
          items.push({
            title: m3Labels[i],
            subtitle: "M3 · Formulación",
            path: `${base}/${m3Paths[i]}`,
            color: "#7C3AED",
          });
        }
      }

      return items.slice(0, 5);
    }),
});
