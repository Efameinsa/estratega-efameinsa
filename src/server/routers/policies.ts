import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";
import {
  POLICY_CATEGORIES,
  generatePolicyCode,
  suggestionsForType,
  alwaysSuggestedTemplates,
  detectContradiction,
  type PolicyCategory,
} from "@/lib/policy-suggestions";
import { inferDalessioType } from "@/lib/dalessio-types";

const CategoryEnum = z.enum([
  "general",
  "comercial",
  "operacional",
  "financiera",
  "rrhh",
  "tecnologia",
  "etica_social",
]);
const StatusEnum = z.enum(["sugerida", "aceptada", "en_edicion", "confirmada", "descartada"]);
const FreqEnum = z.enum(["mensual", "trimestral", "semestral", "anual"]);
const ScopeEnum = z.enum([
  "toda_organizacion",
  "area",
  "producto",
  "mercado",
  "situacion",
]);

async function nextCategoryIndex(
  cycleId: string,
  category: PolicyCategory,
): Promise<number> {
  const count = await db.politica.count({ where: { cycleId, category } });
  return count + 1;
}

async function assertPolicyOwnership(politicaId: string, organizationId: string) {
  const politica = await db.politica.findUniqueOrThrow({
    where: { id: politicaId },
    select: { id: true, organizationId: true, cycleId: true, mandatory: true, status: true },
  });
  if (politica.organizationId !== organizationId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return politica;
}

export const policiesRouter = router({
  // Setup: heredados + métricas iniciales para el paso 1
  setup: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const [
        cycle,
        strategies,
        consolidated,
        mitigants,
        values,
        ocps,
        olps,
        existingPolicies,
      ] = await Promise.all([
        db.strategicCycle.findUniqueOrThrow({
          where: { id: input.cycleId },
          select: { id: true, name: true, yearStart: true, yearEnd: true },
        }),
        db.strategy.findMany({
          where: { cycleId: input.cycleId },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            code: true,
            description: true,
            type: true,
            status: true,
            swotQuadrant: true,
          },
        }),
        db.consolidatedStrategy.findMany({
          where: { cycleId: input.cycleId },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            code: true,
            text: true,
            dalessioType: true,
            type: true,
            status: true,
          },
        }),
        db.ethicsMitigant.findMany({
          where: { evaluation: { cycleId: input.cycleId } },
          select: {
            id: true,
            text: true,
            responsible: true,
            indicator: true,
            deadline: true,
            approved: true,
            evaluation: {
              select: { consolidatedId: true, cycleId: true },
            },
          },
        }),
        db.value.findMany({
          where: { cycleId: input.cycleId },
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, description: true },
        }),
        db.ocp.findMany({
          where: { cycleId: input.cycleId },
          orderBy: [{ year: "asc" }],
          select: { id: true, code: true, description: true, year: true },
        }),
        db.olp.findMany({
          where: { cycleId: input.cycleId },
          orderBy: [{ sortOrder: "asc" }],
          select: { id: true, description: true },
        }),
        db.politica.findMany({
          where: { cycleId: input.cycleId },
          orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
          include: {
            strategies: { select: { strategyId: true } },
            consolidatedStrategies: { select: { consolidatedStrategyId: true } },
            ocps: { select: { ocpId: true } },
            valueLinks: { select: { valueId: true } },
            ethicsMitigant: { select: { id: true, text: true, responsible: true, indicator: true } },
          },
        }),
      ]);

      // Métricas
      const acceptedStatuses = new Set(["aceptada", "en_edicion", "confirmada"]);
      const accepted = existingPolicies.filter((p) =>
        acceptedStatuses.has(p.status),
      ).length;
      const fromMitigant = existingPolicies.filter((p) => p.origin === "mitigant").length;
      const categoriesCovered = new Set(
        existingPolicies
          .filter((p) => p.status !== "descartada")
          .map((p) => p.category),
      ).size;

      return {
        cycle,
        strategies,
        consolidated,
        mitigants,
        values,
        ocps,
        olps,
        policies: existingPolicies,
        metrics: {
          totalSuggested: existingPolicies.length,
          fromMitigant,
          categoriesCovered,
          accepted,
          totalCategories: POLICY_CATEGORIES.length,
        },
      };
    }),

  // Genera sugerencias (idempotente: evita duplicar las que ya existen)
  generateSuggestions: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const cycleId = input.cycleId;

      // 1. Estrategias (Strategy + ConsolidatedStrategy)
      const [strategies, consolidated, mitigants, existing] = await Promise.all([
        db.strategy.findMany({ where: { cycleId }, select: { id: true, code: true, description: true, type: true } }),
        db.consolidatedStrategy.findMany({
          where: { cycleId },
          select: { id: true, code: true, text: true, dalessioType: true },
        }),
        db.ethicsMitigant.findMany({
          where: { evaluation: { cycleId } },
          select: {
            id: true,
            text: true,
            responsible: true,
            indicator: true,
            deadline: true,
            approved: true,
            principle: { select: { evaluationId: true } },
            evaluation: { select: { consolidatedId: true } },
          },
        }),
        db.politica.findMany({
          where: { cycleId },
          select: {
            id: true,
            name: true,
            origin: true,
            ethicsMitigantId: true,
            strategies: { select: { strategyId: true } },
            consolidatedStrategies: { select: { consolidatedStrategyId: true } },
          },
        }),
      ]);

      const existingByMitigantId = new Set(
        existing.filter((p) => p.ethicsMitigantId).map((p) => p.ethicsMitigantId!),
      );
      const existingNamesNorm = new Set(
        existing.map((p) => p.name.toLowerCase().trim()),
      );

      let createdMitigant = 0;
      let createdSuggested = 0;

      // 2. Mitigantes éticos → política obligatoria (1:1)
      for (const m of mitigants) {
        if (existingByMitigantId.has(m.id)) continue;
        if (!m.approved) continue;
        const idx = await nextCategoryIndex(cycleId, "etica_social");
        const code = generatePolicyCode("etica_social", idx);
        const name = `Mitigante ético — ${m.text.slice(0, 60)}${m.text.length > 60 ? "…" : ""}`;
        await db.politica.create({
          data: {
            organizationId: ctx.organizationId,
            cycleId,
            code,
            category: "etica_social",
            name,
            enunciado: m.text,
            justification:
              "Política obligatoria derivada de mitigante ético en M3 · Auditoría Ética. No puede descartarse.",
            origin: "mitigant",
            ethicsMitigantId: m.id,
            mandatory: true,
            scope: "toda_organizacion",
            responsible: m.responsible,
            indicator: m.indicator,
            reviewFrequency: "trimestral",
            status: "aceptada",
            sortOrder: idx - 1,
          },
        });
        createdMitigant++;
      }

      // 3. Sugerencias por estrategia (basadas en tipo D'Alessio)
      type StrategyLike = {
        id: string;
        code: string | null;
        description: string;
        type: string | null;
        source: "strategy" | "consolidated";
      };
      const allStrategies: StrategyLike[] = [
        ...strategies.map((s) => ({
          id: s.id,
          code: s.code,
          description: s.description,
          type: s.type,
          source: "strategy" as const,
        })),
        ...consolidated.map((c) => ({
          id: c.id,
          code: c.code,
          description: c.text,
          type: c.dalessioType,
          source: "consolidated" as const,
        })),
      ];

      // Para evitar avalancha, agrupar por tipo D'Alessio inferido y generar
      // una sola tanda de plantillas por tipo (no por cada estrategia).
      const typesSeen = new Set<string>();
      const stratIdsByType = new Map<string, { strategyIds: string[]; consolidatedIds: string[] }>();

      for (const s of allStrategies) {
        const t = inferDalessioType(s.description, s.type);
        if (!t) continue;
        if (!stratIdsByType.has(t)) {
          stratIdsByType.set(t, { strategyIds: [], consolidatedIds: [] });
        }
        const bucket = stratIdsByType.get(t)!;
        if (s.source === "strategy") bucket.strategyIds.push(s.id);
        else bucket.consolidatedIds.push(s.id);
      }

      for (const [type, ids] of stratIdsByType.entries()) {
        typesSeen.add(type);
        const templates = suggestionsForType(type as Parameters<typeof suggestionsForType>[0]);
        for (const tpl of templates) {
          const nameNorm = tpl.name.toLowerCase().trim();
          if (existingNamesNorm.has(nameNorm)) continue;
          existingNamesNorm.add(nameNorm);
          const idx = await nextCategoryIndex(cycleId, tpl.category);
          const code = generatePolicyCode(tpl.category, idx);
          const created = await db.politica.create({
            data: {
              organizationId: ctx.organizationId,
              cycleId,
              code,
              category: tpl.category,
              name: tpl.name,
              enunciado: tpl.enunciado,
              origin: "suggested",
              mandatory: false,
              scope: "toda_organizacion",
              responsible: tpl.responsible,
              indicator: tpl.indicator,
              reviewFrequency: tpl.reviewFrequency,
              status: "sugerida",
              sortOrder: idx - 1,
            },
          });
          // Vincular con las estrategias del tipo
          if (ids.strategyIds.length > 0) {
            await db.policyStrategy.createMany({
              data: ids.strategyIds.map((sid) => ({
                politicaId: created.id,
                strategyId: sid,
              })),
            });
          }
          if (ids.consolidatedIds.length > 0) {
            await db.policyConsolidatedStrategy.createMany({
              data: ids.consolidatedIds.map((cid) => ({
                politicaId: created.id,
                consolidatedStrategyId: cid,
              })),
            });
          }
          createdSuggested++;
        }
      }

      // 4. Sugerencias "always" (general/transversal) — solo si no existen ya
      const alwaysTemplates = alwaysSuggestedTemplates();
      for (const tpl of alwaysTemplates) {
        const nameNorm = tpl.name.toLowerCase().trim();
        if (existingNamesNorm.has(nameNorm)) continue;
        existingNamesNorm.add(nameNorm);
        const idx = await nextCategoryIndex(cycleId, tpl.category);
        const code = generatePolicyCode(tpl.category, idx);
        await db.politica.create({
          data: {
            organizationId: ctx.organizationId,
            cycleId,
            code,
            category: tpl.category,
            name: tpl.name,
            enunciado: tpl.enunciado,
            origin: "suggested",
            mandatory: false,
            scope: "toda_organizacion",
            responsible: tpl.responsible,
            indicator: tpl.indicator,
            reviewFrequency: tpl.reviewFrequency,
            status: "sugerida",
            sortOrder: idx - 1,
          },
        });
        createdSuggested++;
      }

      return { createdMitigant, createdSuggested };
    }),

  // Crear política personalizada
  create: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        category: CategoryEnum,
        name: z.string().min(1).max(140),
        enunciado: z.string().min(1),
        justification: z.string().optional().nullable(),
        scope: ScopeEnum.optional().nullable(),
        scopeDetail: z.string().optional().nullable(),
        responsible: z.string().optional().nullable(),
        indicator: z.string().optional().nullable(),
        reviewFrequency: FreqEnum.optional().nullable(),
        exceptions: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const idx = await nextCategoryIndex(input.cycleId, input.category);
      const code = generatePolicyCode(input.category, idx);
      return db.politica.create({
        data: {
          organizationId: ctx.organizationId,
          cycleId: input.cycleId,
          code,
          category: input.category,
          name: input.name.trim(),
          enunciado: input.enunciado.trim(),
          justification: input.justification ?? null,
          origin: "custom",
          mandatory: false,
          scope: input.scope ?? "toda_organizacion",
          scopeDetail: input.scopeDetail ?? null,
          responsible: input.responsible ?? null,
          indicator: input.indicator ?? null,
          reviewFrequency: input.reviewFrequency ?? null,
          exceptions: input.exceptions ?? null,
          status: "aceptada",
          sortOrder: idx - 1,
        },
      });
    }),

  // Update (no se permite cambiar de mandatory:true a descartada)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        category: CategoryEnum.optional(),
        name: z.string().min(1).max(140).optional(),
        enunciado: z.string().min(1).optional(),
        justification: z.string().nullable().optional(),
        scope: ScopeEnum.nullable().optional(),
        scopeDetail: z.string().nullable().optional(),
        responsible: z.string().nullable().optional(),
        indicator: z.string().nullable().optional(),
        reviewFrequency: FreqEnum.nullable().optional(),
        exceptions: z.string().nullable().optional(),
        validFrom: z.coerce.date().nullable().optional(),
        nextReview: z.coerce.date().nullable().optional(),
        status: StatusEnum.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await assertPolicyOwnership(input.id, ctx.organizationId!);
      if (existing.mandatory && input.status === "descartada") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No puedes descartar una política obligatoria derivada de mitigante ético",
        });
      }
      const { id, ...data } = input;
      return db.politica.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await assertPolicyOwnership(input.id, ctx.organizationId!);
      if (existing.mandatory) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No puedes eliminar una política obligatoria derivada de mitigante ético",
        });
      }
      return db.politica.delete({ where: { id: input.id } });
    }),

  setStrategies: protectedProcedure
    .input(z.object({ politicaId: z.string(), strategyIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const politica = await assertPolicyOwnership(input.politicaId, ctx.organizationId!);
      if (input.strategyIds.length > 0) {
        const strategies = await db.strategy.findMany({
          where: { id: { in: input.strategyIds } },
          select: { id: true, organizationId: true, cycleId: true },
        });
        const invalid = strategies.find(
          (s) => s.organizationId !== ctx.organizationId || s.cycleId !== politica.cycleId,
        );
        if (invalid || strategies.length !== input.strategyIds.length) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      await db.policyStrategy.deleteMany({ where: { politicaId: input.politicaId } });
      if (input.strategyIds.length > 0) {
        await db.policyStrategy.createMany({
          data: input.strategyIds.map((sid) => ({
            politicaId: input.politicaId,
            strategyId: sid,
          })),
        });
      }
      return { count: input.strategyIds.length };
    }),

  setConsolidatedStrategies: protectedProcedure
    .input(
      z.object({ politicaId: z.string(), consolidatedIds: z.array(z.string()) }),
    )
    .mutation(async ({ ctx, input }) => {
      const politica = await assertPolicyOwnership(input.politicaId, ctx.organizationId!);
      if (input.consolidatedIds.length > 0) {
        const items = await db.consolidatedStrategy.findMany({
          where: { id: { in: input.consolidatedIds } },
          select: { id: true, cycleId: true },
        });
        const invalid = items.find((s) => s.cycleId !== politica.cycleId);
        if (invalid || items.length !== input.consolidatedIds.length) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      await db.policyConsolidatedStrategy.deleteMany({
        where: { politicaId: input.politicaId },
      });
      if (input.consolidatedIds.length > 0) {
        await db.policyConsolidatedStrategy.createMany({
          data: input.consolidatedIds.map((cid) => ({
            politicaId: input.politicaId,
            consolidatedStrategyId: cid,
          })),
        });
      }
      return { count: input.consolidatedIds.length };
    }),

  setOcps: protectedProcedure
    .input(z.object({ politicaId: z.string(), ocpIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const politica = await assertPolicyOwnership(input.politicaId, ctx.organizationId!);
      if (input.ocpIds.length > 0) {
        const ocps = await db.ocp.findMany({
          where: { id: { in: input.ocpIds } },
          select: { id: true, organizationId: true, cycleId: true },
        });
        const invalid = ocps.find(
          (o) => o.organizationId !== ctx.organizationId || o.cycleId !== politica.cycleId,
        );
        if (invalid || ocps.length !== input.ocpIds.length) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      await db.policyOcp.deleteMany({ where: { politicaId: input.politicaId } });
      if (input.ocpIds.length > 0) {
        await db.policyOcp.createMany({
          data: input.ocpIds.map((oid) => ({
            politicaId: input.politicaId,
            ocpId: oid,
          })),
        });
      }
      return { count: input.ocpIds.length };
    }),

  setValues: protectedProcedure
    .input(z.object({ politicaId: z.string(), valueIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const politica = await assertPolicyOwnership(input.politicaId, ctx.organizationId!);
      if (input.valueIds.length > 0) {
        const values = await db.value.findMany({
          where: { id: { in: input.valueIds } },
          select: { id: true, organizationId: true, cycleId: true },
        });
        const invalid = values.find(
          (v) => v.organizationId !== ctx.organizationId || v.cycleId !== politica.cycleId,
        );
        if (invalid || values.length !== input.valueIds.length) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      await db.policyValue.deleteMany({ where: { politicaId: input.politicaId } });
      if (input.valueIds.length > 0) {
        await db.policyValue.createMany({
          data: input.valueIds.map((vid) => ({
            politicaId: input.politicaId,
            valueId: vid,
          })),
        });
      }
      return { count: input.valueIds.length };
    }),

  // Análisis: detección de contradicciones + matriz
  analyze: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const policies = await db.politica.findMany({
        where: { cycleId: input.cycleId, status: { not: "descartada" } },
        select: { id: true, code: true, name: true, enunciado: true },
      });
      const detected: { politicaAId: string; politicaBId: string; description: string }[] = [];
      for (let i = 0; i < policies.length; i++) {
        for (let j = i + 1; j < policies.length; j++) {
          const result = detectContradiction(
            policies[i].enunciado,
            policies[j].enunciado,
          );
          if (result) {
            detected.push({
              politicaAId: policies[i].id,
              politicaBId: policies[j].id,
              description: result.description,
            });
          }
        }
      }
      return { contradictions: detected };
    }),

  // Datos para exportar manual de políticas
  getExportData: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const [cycle, org, policies, strategies] = await Promise.all([
        db.strategicCycle.findUniqueOrThrow({
          where: { id: input.cycleId },
          select: { name: true, yearStart: true, yearEnd: true, organizationId: true },
        }),
        db.organization.findFirstOrThrow({
          where: { cycles: { some: { id: input.cycleId } } },
          select: { name: true, sector: true, color: true },
        }),
        db.politica.findMany({
          where: { cycleId: input.cycleId, status: "confirmada" },
          orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
          include: {
            strategies: { include: { strategy: { select: { id: true, code: true, description: true } } } },
            consolidatedStrategies: {
              include: { consolidatedStrategy: { select: { id: true, code: true, text: true } } },
            },
            valueLinks: { include: { value: { select: { name: true } } } },
            ethicsMitigant: { select: { text: true, responsible: true, indicator: true } },
          },
        }),
        db.strategy.findMany({
          where: { cycleId: input.cycleId },
          orderBy: [{ sortOrder: "asc" }],
          select: { id: true, code: true, description: true },
        }),
      ]);
      return { cycle, organization: org, policies, strategies };
    }),
});
