import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";
import {
  CATEGORIES,
  INDUSTRY_TEMPLATES,
  detectIndustry,
  detectCertifications,
  detectMachineMentions,
  detectProfileMentions,
  estimateProfileCost,
  computeRiskLevel,
  type ResourceCategory,
} from "@/lib/resources-7m";

const CategoryEnum = z.enum([
  "money",
  "manpower",
  "materials",
  "machines",
  "methods",
  "mentality",
  "medio_ambiente",
]);
const ProvisionEnum = z.enum([
  "planeada",
  "comprometida",
  "en_gestion",
  "asegurada",
  "faltante",
]);
const RiskEnum = z.enum(["bajo", "medio", "alto"]);

async function ensurePlan(cycleId: string, organizationId: string) {
  let plan = await db.resourcePlan.findUnique({ where: { cycleId } });
  if (!plan) {
    const cycle = await db.strategicCycle.findUniqueOrThrow({
      where: { id: cycleId },
      select: { yearStart: true, yearEnd: true },
    });
    plan = await db.resourcePlan.create({
      data: {
        organizationId,
        cycleId,
        horizonStart: cycle.yearStart,
        horizonEnd: cycle.yearEnd,
      },
    });
  }
  if (plan.organizationId !== organizationId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return plan;
}

async function assertPlanAccess(planId: string, organizationId: string) {
  const plan = await db.resourcePlan.findUniqueOrThrow({
    where: { id: planId },
    select: { id: true, organizationId: true, cycleId: true },
  });
  if (plan.organizationId !== organizationId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return plan;
}

async function assertNeedAccess(needId: string, organizationId: string) {
  const need = await db.resourceNeed.findUniqueOrThrow({
    where: { id: needId },
    include: { plan: { select: { organizationId: true, cycleId: true } } },
  });
  if (need.plan.organizationId !== organizationId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return need;
}

export const resourcesRouter = router({
  setup: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const plan = await ensurePlan(input.cycleId, ctx.organizationId);
      const [cycle, organization, ocps, structure, strategies, consolidated, policies, mitigants, needs, profiles, sources] =
        await Promise.all([
          db.strategicCycle.findUniqueOrThrow({
            where: { id: input.cycleId },
            select: { id: true, name: true, yearStart: true, yearEnd: true },
          }),
          db.organization.findFirstOrThrow({
            where: { cycles: { some: { id: input.cycleId } } },
            select: { id: true, name: true, sector: true, color: true },
          }),
          db.ocp.findMany({
            where: { cycleId: input.cycleId },
            include: {
              resource: true,
              responsibleArea: { select: { id: true, name: true } },
            },
          }),
          db.orgStructure.findUnique({
            where: { cycleId: input.cycleId },
            include: { nodes: true },
          }),
          db.strategy.findMany({
            where: { cycleId: input.cycleId },
            select: { id: true, code: true, description: true, type: true },
          }),
          db.consolidatedStrategy.findMany({
            where: { cycleId: input.cycleId },
            select: { id: true, code: true, text: true, dalessioType: true },
          }),
          db.politica.findMany({
            where: { cycleId: input.cycleId, status: { not: "descartada" } },
            select: { id: true, code: true, name: true, mandatory: true },
          }),
          db.ethicsMitigant.findMany({
            where: { evaluation: { cycleId: input.cycleId } },
            select: { id: true, text: true, responsible: true, indicator: true },
          }),
          db.resourceNeed.findMany({
            where: { planId: plan.id },
            include: { links: true },
            orderBy: [{ category: "asc" }, { createdAt: "asc" }],
          }),
          db.resourceManpowerProfile.findMany({
            where: { planId: plan.id },
            orderBy: { profileName: "asc" },
          }),
          db.resourceMoneySource.findMany({
            where: { planId: plan.id },
            orderBy: { year: "asc" },
          }),
        ]);
      return {
        plan,
        cycle,
        organization,
        industry: detectIndustry(organization.sector),
        ocps,
        structure,
        strategies,
        consolidated,
        policies,
        mitigants,
        needs,
        manpowerProfiles: profiles,
        moneySources: sources,
      };
    }),

  autoDetect: cycleProcedure
    .input(z.object({ cycleId: z.string(), replaceAuto: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const plan = await ensurePlan(input.cycleId, ctx.organizationId);

      if (input.replaceAuto) {
        await db.resourceNeed.deleteMany({
          where: { planId: plan.id, origin: "auto_detected" },
        });
      }

      const [ocps, structure, strategies, consolidated, organization] = await Promise.all([
        db.ocp.findMany({
          where: { cycleId: input.cycleId },
          include: { resource: true, actions: true },
        }),
        db.orgStructure.findUnique({
          where: { cycleId: input.cycleId },
          include: { nodes: true },
        }),
        db.strategy.findMany({ where: { cycleId: input.cycleId } }),
        db.consolidatedStrategy.findMany({ where: { cycleId: input.cycleId } }),
        db.organization.findFirstOrThrow({
          where: { cycles: { some: { id: input.cycleId } } },
          select: { sector: true },
        }),
      ]);

      const cycleSel = await db.strategicCycle.findUniqueOrThrow({
        where: { id: input.cycleId },
        select: { yearStart: true, yearEnd: true },
      });

      // Existing auto needs (para evitar duplicar)
      const existing = await db.resourceNeed.findMany({
        where: { planId: plan.id },
        select: { description: true, category: true, origin: true },
      });
      const seen = new Set(
        existing.map((e) => `${e.category}::${e.description.toLowerCase().trim()}`),
      );
      const seenAdd = (cat: string, desc: string) =>
        seen.add(`${cat}::${desc.toLowerCase().trim()}`);
      const isNew = (cat: string, desc: string) =>
        !seen.has(`${cat}::${desc.toLowerCase().trim()}`);

      let created = 0;
      async function createNeed(args: {
        category: ResourceCategory;
        description: string;
        amountEstimated?: number | null;
        quantity?: number | null;
        unit?: string | null;
        yearStart?: number;
        yearEnd?: number;
        originReference?: object;
        links?: { linkType: string; referenceId: string; referenceLabel: string }[];
      }) {
        if (!isNew(args.category, args.description)) return;
        seenAdd(args.category, args.description);
        const need = await db.resourceNeed.create({
          data: {
            planId: plan.id,
            category: args.category,
            description: args.description,
            yearStart: args.yearStart ?? cycleSel.yearStart,
            yearEnd: args.yearEnd ?? cycleSel.yearEnd,
            amountEstimated: args.amountEstimated ?? null,
            quantity: args.quantity ?? null,
            unit: args.unit ?? null,
            origin: "auto_detected",
            originReference: args.originReference ? JSON.stringify(args.originReference) : null,
            riskLevel: computeRiskLevel(args.amountEstimated ?? null, 0),
          },
        });
        if (args.links && args.links.length > 0) {
          await db.resourceLink.createMany({
            data: args.links.map((l) => ({
              needId: need.id,
              linkType: l.linkType,
              referenceId: l.referenceId,
              referenceLabel: l.referenceLabel,
            })),
          });
        }
        created++;
      }

      // 1. MONEY de OCPs con resource.budgetEstimate
      let totalCapex = 0;
      for (const ocp of ocps) {
        if (ocp.resource?.budgetEstimate && ocp.resource.budgetEstimate > 0) {
          totalCapex += ocp.resource.budgetEstimate;
          await createNeed({
            category: "money",
            description: `Inversión asignada al OCP ${ocp.code}: ${ocp.description.slice(0, 80)}`,
            amountEstimated: ocp.resource.budgetEstimate,
            unit: "USD",
            yearStart: ocp.year,
            yearEnd: ocp.year,
            originReference: { source: "ocp", id: ocp.id, code: ocp.code },
            links: [
              {
                linkType: "ocp",
                referenceId: ocp.id,
                referenceLabel: ocp.code,
              },
            ],
          });
        }
      }

      // 2. MANPOWER de la estructura
      if (structure) {
        const totalFtes = structure.nodes.reduce(
          (sum, n) => sum + (n.ftesEstimated ?? 0),
          0,
        );
        if (totalFtes > 0) {
          await createNeed({
            category: "manpower",
            description: "Plan de plantilla total derivado de la estructura organizacional",
            quantity: totalFtes,
            unit: "FTEs",
            originReference: { source: "structure", id: structure.id },
          });
        }
      }

      // 3. MANPOWER de OCPs con resource.ftesRequired
      for (const ocp of ocps) {
        if (ocp.resource?.ftesRequired && ocp.resource.ftesRequired > 0) {
          await createNeed({
            category: "manpower",
            description: `FTEs adicionales para OCP ${ocp.code}`,
            quantity: ocp.resource.ftesRequired,
            unit: "FTEs",
            yearStart: ocp.year,
            yearEnd: ocp.year,
            originReference: { source: "ocp", id: ocp.id },
            links: [
              {
                linkType: "ocp",
                referenceId: ocp.id,
                referenceLabel: ocp.code,
              },
            ],
          });
        }
      }

      // 4. METHODS — certificaciones detectadas en OCPs y estrategias
      const allStrategyText = [
        ...strategies.map((s) => s.description),
        ...consolidated.map((c) => c.text),
        ...ocps.map((o) => o.description),
        ...ocps.flatMap((o) => o.actions.map((a) => a.description)),
      ].join(" ");
      const certs = detectCertifications(allStrategyText);
      for (const cert of certs) {
        await createNeed({
          category: "methods",
          description: `Certificación ${cert}`,
          quantity: 1,
          unit: "certificaciones",
          amountEstimated: 25000,
          originReference: { source: "strategy_text", label: cert },
        });
      }

      // 5. MACHINES — menciones en OCPs
      for (const ocp of ocps) {
        const machines = detectMachineMentions(ocp.description);
        for (const m of machines) {
          await createNeed({
            category: "machines",
            description: `${m.charAt(0).toUpperCase() + m.slice(1)} (mencionado en OCP ${ocp.code})`,
            unit: "unidades",
            yearStart: ocp.year,
            originReference: { source: "ocp_keyword", ocpId: ocp.id, keyword: m },
            links: [
              {
                linkType: "ocp",
                referenceId: ocp.id,
                referenceLabel: ocp.code,
              },
            ],
          });
        }
      }

      // 6. MEDIO AMBIENTE — divisiones geográficas → oficinas
      if (structure) {
        const divisions = structure.nodes.filter((n) => n.nodeType === "division");
        for (const div of divisions) {
          await createNeed({
            category: "medio_ambiente",
            description: `Oficina/Instalación para ${div.name}`,
            amountEstimated: 50000,
            unit: "USD",
            originReference: { source: "structure_division", nodeId: div.id, label: div.name },
            links: [
              {
                linkType: "area",
                referenceId: div.id,
                referenceLabel: div.code,
              },
            ],
          });
        }
      }

      // 7. MENTALITY — basado en tipos de estrategia
      const stratTexts = strategies.map((s) => s.description.toLowerCase()).join(" ");
      const mentalityChanges: string[] = [];
      if (/internacional|mercados|expansión/.test(stratTexts)) {
        mentalityChanges.push("Cultura global y comunicación multilingüe");
      }
      if (/premium|calidad|diferenciaci/.test(stratTexts)) {
        mentalityChanges.push("Cultura de calidad y excelencia operativa");
      }
      if (/innovaci|i\+d|nuevo producto|ágil|agil/.test(stratTexts)) {
        mentalityChanges.push("Cultura ágil y experimental");
      }
      if (/sostenibilidad|sustenta|responsa|ambient/.test(stratTexts)) {
        mentalityChanges.push("Cultura de responsabilidad y sostenibilidad");
      }
      for (const change of mentalityChanges) {
        await createNeed({
          category: "mentality",
          description: change,
          quantity: 1,
          unit: "programas",
          amountEstimated: 30000,
          originReference: { source: "strategy_inference" },
        });
      }

      // 8. Plantilla por industria
      const industry = detectIndustry(organization.sector);
      const template = INDUSTRY_TEMPLATES.find((t) => t.industry === industry);
      if (template) {
        for (const item of template.needs) {
          await createNeed({
            category: item.category,
            description: item.description,
            quantity: item.defaultQty ?? 1,
            unit: item.unit ?? null,
            originReference: { source: "industry_template", industry },
          });
        }
      }

      // Actualizar inversión total del plan
      const allNeeds = await db.resourceNeed.findMany({ where: { planId: plan.id } });
      const totalInvestment = allNeeds.reduce(
        (sum, n) => sum + (n.amountEstimated ?? 0),
        0,
      );
      await db.resourcePlan.update({
        where: { id: plan.id },
        data: { totalInvestment },
      });

      return { created, totalInvestment };
    }),

  upsertNeed: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        id: z.string().optional(),
        category: CategoryEnum,
        description: z.string().min(1),
        yearStart: z.number().int(),
        yearEnd: z.number().int(),
        amountEstimated: z.number().nullable().optional(),
        quantity: z.number().nullable().optional(),
        unit: z.string().nullable().optional(),
        amountSecured: z.number().optional(),
        provisionStatus: ProvisionEnum.optional(),
        riskLevel: RiskEnum.optional(),
        notes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const plan = await ensurePlan(input.cycleId, ctx.organizationId);
      const data = {
        category: input.category,
        description: input.description,
        yearStart: input.yearStart,
        yearEnd: input.yearEnd,
        amountEstimated: input.amountEstimated ?? null,
        quantity: input.quantity ?? null,
        unit: input.unit ?? null,
        amountSecured: input.amountSecured ?? 0,
        provisionStatus: input.provisionStatus ?? "planeada",
        riskLevel:
          input.riskLevel ??
          computeRiskLevel(input.amountEstimated ?? null, input.amountSecured ?? 0),
        notes: input.notes ?? null,
      };
      if (input.id) {
        await assertNeedAccess(input.id, ctx.organizationId);
        return db.resourceNeed.update({ where: { id: input.id }, data });
      }
      return db.resourceNeed.create({
        data: {
          planId: plan.id,
          origin: "manual",
          ...data,
        },
      });
    }),

  deleteNeed: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertNeedAccess(input.id, ctx.organizationId!);
      return db.resourceNeed.delete({ where: { id: input.id } });
    }),

  // ── Manpower profiles ──
  upsertManpowerProfile: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        id: z.string().optional(),
        profileName: z.string().min(1),
        orgNodeId: z.string().nullable().optional(),
        ftesCurrent: z.number().default(0),
        ftesTarget: z.number().default(0),
        ftesPerYear: z.record(z.string(), z.number()).default({}),
        costPerYear: z.number().nullable().optional(),
        notes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const plan = await ensurePlan(input.cycleId, ctx.organizationId);
      const costAuto =
        input.costPerYear ?? estimateProfileCost(input.profileName);
      const totalNew = Object.values(input.ftesPerYear).reduce(
        (s, n) => s + n,
        0,
      );
      const totalCost = totalNew * costAuto;
      const data = {
        profileName: input.profileName,
        orgNodeId: input.orgNodeId ?? null,
        ftesCurrent: input.ftesCurrent,
        ftesTarget: input.ftesTarget,
        ftesPerYear: JSON.stringify(input.ftesPerYear),
        costPerYear: costAuto,
        totalCost,
        notes: input.notes ?? null,
      };
      if (input.id) {
        const existing = await db.resourceManpowerProfile.findUniqueOrThrow({
          where: { id: input.id },
          select: { planId: true },
        });
        await assertPlanAccess(existing.planId, ctx.organizationId);
        return db.resourceManpowerProfile.update({
          where: { id: input.id },
          data,
        });
      }
      return db.resourceManpowerProfile.create({
        data: { planId: plan.id, ...data },
      });
    }),

  deleteManpowerProfile: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const p = await db.resourceManpowerProfile.findUniqueOrThrow({
        where: { id: input.id },
        select: { planId: true },
      });
      await assertPlanAccess(p.planId, ctx.organizationId!);
      return db.resourceManpowerProfile.delete({ where: { id: input.id } });
    }),

  // ── Money sources ──
  upsertMoneySource: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        id: z.string().optional(),
        needId: z.string().nullable().optional(),
        sourceType: z.enum([
          "capital_propio",
          "deuda_bancaria",
          "inversionista",
          "reinversion",
          "otro",
        ]),
        amount: z.number(),
        year: z.number().int(),
        status: z.enum(["planeada", "comprometida", "asegurada"]).optional(),
        notes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const plan = await ensurePlan(input.cycleId, ctx.organizationId);
      const data = {
        needId: input.needId ?? null,
        sourceType: input.sourceType,
        amount: input.amount,
        year: input.year,
        status: input.status ?? "planeada",
        notes: input.notes ?? null,
      };
      if (input.id) {
        const existing = await db.resourceMoneySource.findUniqueOrThrow({
          where: { id: input.id },
          select: { planId: true },
        });
        await assertPlanAccess(existing.planId, ctx.organizationId);
        return db.resourceMoneySource.update({
          where: { id: input.id },
          data,
        });
      }
      return db.resourceMoneySource.create({
        data: { planId: plan.id, ...data },
      });
    }),

  deleteMoneySource: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const s = await db.resourceMoneySource.findUniqueOrThrow({
        where: { id: input.id },
        select: { planId: true },
      });
      await assertPlanAccess(s.planId, ctx.organizationId!);
      return db.resourceMoneySource.delete({ where: { id: input.id } });
    }),

  confirmPlan: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const plan = await ensurePlan(input.cycleId, ctx.organizationId);
      // Recalcular total
      const needs = await db.resourceNeed.findMany({
        where: { planId: plan.id },
        select: { amountEstimated: true },
      });
      const total = needs.reduce((s, n) => s + (n.amountEstimated ?? 0), 0);
      return db.resourcePlan.update({
        where: { id: plan.id },
        data: { status: "confirmado", totalInvestment: total },
      });
    }),

  getExportData: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const plan = await ensurePlan(input.cycleId, ctx.organizationId);
      const [cycle, organization, needs, profiles, sources] = await Promise.all([
        db.strategicCycle.findUniqueOrThrow({
          where: { id: input.cycleId },
          select: { name: true, yearStart: true, yearEnd: true },
        }),
        db.organization.findFirstOrThrow({
          where: { cycles: { some: { id: input.cycleId } } },
          select: { name: true, sector: true, color: true },
        }),
        db.resourceNeed.findMany({
          where: { planId: plan.id },
          include: { links: true },
          orderBy: [{ category: "asc" }, { createdAt: "asc" }],
        }),
        db.resourceManpowerProfile.findMany({ where: { planId: plan.id } }),
        db.resourceMoneySource.findMany({ where: { planId: plan.id } }),
      ]);
      return { plan, cycle, organization, needs, manpowerProfiles: profiles, moneySources: sources };
    }),
});
