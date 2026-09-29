import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";
import {
  BSC_DIMENSIONS,
  EXTRA_KPI_TEMPLATES,
  generateEducanetLinkId,
  generateKpiCode,
  inferDefaultSource,
  olpBscToDimension,
  computeThresholds,
  generatePeriods,
  type BscDimension,
} from "@/lib/kpi-suggestions";

const DimensionEnum = z.enum([
  "resultados_economicos",
  "posicion_mercado",
  "como_opera_empresa",
  "personas_cultura",
]);
const FrequencyEnum = z.enum(["mensual", "trimestral", "semestral", "anual"]);
const DirectionEnum = z.enum(["mayor_mejor", "menor_mejor", "objetivo_puntual"]);
const SourceEnum = z.enum(["educanet", "manual"]);
const SendModeEnum = z.enum(["manual", "automatico"]);
const StatusEnum = z.enum(["sugerido", "aceptado", "en_edicion", "confirmado", "descartado"]);

async function nextIndexInDimension(
  cycleId: string,
  dimension: BscDimension,
): Promise<number> {
  const count = await db.kpi.count({ where: { cycleId, dimensionBsc: dimension } });
  return count + 1;
}

async function assertKpiAccess(kpiId: string, organizationId: string) {
  const kpi = await db.kpi.findUniqueOrThrow({
    where: { id: kpiId },
    select: {
      id: true,
      organizationId: true,
      cycleId: true,
      dimensionBsc: true,
      frequency: true,
      source: true,
      educanetLinkId: true,
    },
  });
  if (kpi.organizationId !== organizationId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return kpi;
}

async function ensureUniqueEducanetId(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const id = generateEducanetLinkId();
    const exists = await db.kpi.findUnique({ where: { educanetLinkId: id } });
    if (!exists) return id;
  }
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo generar ID único" });
}

export const kpisRouter = router({
  setup: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const [cycle, olps, ocps, structure, kpis] = await Promise.all([
        db.strategicCycle.findUniqueOrThrow({
          where: { id: input.cycleId },
          select: { id: true, name: true, yearStart: true, yearEnd: true },
        }),
        db.olp.findMany({
          where: { cycleId: input.cycleId },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            description: true,
            metric: true,
            currentValue: true,
            targetValue: true,
            unit: true,
            bscPerspective: true,
          },
        }),
        db.ocp.findMany({
          where: { cycleId: input.cycleId },
          orderBy: [{ year: "asc" }],
          select: {
            id: true,
            code: true,
            description: true,
            year: true,
            olpId: true,
            metaValue: true,
            indicator: true,
            frequency: true,
            unit: true,
          },
        }),
        db.orgStructure.findUnique({
          where: { cycleId: input.cycleId },
          include: { nodes: { select: { id: true, code: true, name: true, nodeType: true } } },
        }),
        db.kpi.findMany({
          where: { cycleId: input.cycleId },
          orderBy: [{ dimensionBsc: "asc" }, { sortOrder: "asc" }],
          include: {
            olps: { include: { olp: { select: { id: true, description: true } } } },
            ocps: { include: { ocp: { select: { id: true, code: true } } } },
            periods: true,
            responsibleArea: { select: { id: true, name: true, code: true } },
          },
        }),
      ]);

      return { cycle, olps, ocps, structure, kpis };
    }),

  autoDetect: cycleProcedure
    .input(z.object({ cycleId: z.string(), replaceAuto: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      if (input.replaceAuto) {
        await db.kpi.deleteMany({
          where: { cycleId: input.cycleId, origin: "auto_detected" },
        });
      }
      const [cycle, olps, ocps] = await Promise.all([
        db.strategicCycle.findUniqueOrThrow({
          where: { id: input.cycleId },
          select: { yearStart: true, yearEnd: true },
        }),
        db.olp.findMany({
          where: { cycleId: input.cycleId },
          orderBy: { sortOrder: "asc" },
        }),
        db.ocp.findMany({
          where: { cycleId: input.cycleId },
          orderBy: [{ year: "asc" }],
        }),
      ]);

      const existing = await db.kpi.findMany({
        where: { cycleId: input.cycleId },
        select: { name: true, dimensionBsc: true },
      });
      const seenNames = new Set(
        existing.map((e) => `${e.dimensionBsc}::${e.name.toLowerCase().trim()}`),
      );

      let created = 0;
      async function makeKpi(args: {
        name: string;
        description: string;
        formula: string;
        dimension: BscDimension;
        unit: string;
        frequency: "mensual" | "trimestral" | "semestral" | "anual";
        direction: "mayor_mejor" | "menor_mejor" | "objetivo_puntual";
        source?: "educanet" | "manual";
        olpIds?: string[];
        ocpIds?: string[];
        sourceTarget?: number | null;
      }) {
        const k = `${args.dimension}::${args.name.toLowerCase().trim()}`;
        if (seenNames.has(k)) return;
        seenNames.add(k);
        const idx = await nextIndexInDimension(input.cycleId, args.dimension);
        const code = generateKpiCode(args.dimension, idx);
        const source = args.source ?? inferDefaultSource(args.name, args.description);
        const educanetLinkId = source === "educanet" ? await ensureUniqueEducanetId() : null;
        const sendMode = source === "educanet" ? "manual" : null;

        const kpi = await db.kpi.create({
          data: {
            organizationId: ctx.organizationId,
            cycleId: input.cycleId,
            code,
            name: args.name,
            description: args.description,
            formula: args.formula,
            dimensionBsc: args.dimension,
            unit: args.unit,
            frequency: args.frequency,
            direction: args.direction,
            source,
            educanetLinkId,
            educanetSendMode: sendMode,
            status: "sugerido",
            origin: "auto_detected",
            sortOrder: idx - 1,
          },
        });

        if (args.olpIds && args.olpIds.length > 0) {
          await db.kpiOlp.createMany({
            data: args.olpIds.map((oid) => ({ kpiId: kpi.id, olpId: oid })),
          });
        }
        if (args.ocpIds && args.ocpIds.length > 0) {
          await db.kpiOcp.createMany({
            data: args.ocpIds.map((oid) => ({ kpiId: kpi.id, ocpId: oid })),
          });
        }

        // Pre-llenar periodos según frecuencia + targets de OCP
        const periods = generatePeriods(args.frequency, cycle.yearStart, cycle.yearEnd);
        const ocpsForKpi = ocps.filter((o) => (args.olpIds ?? []).includes(o.olpId));
        const ocpsByYear = new Map<number, number>();
        for (const o of ocpsForKpi) {
          if (o.metaValue != null) ocpsByYear.set(o.year, o.metaValue);
        }
        for (const p of periods) {
          // Extraer año del período (YYYY-MM o YYYY-QN o YYYY)
          const yearMatch = p.match(/^(\d{4})/);
          const year = yearMatch ? Number(yearMatch[1]) : cycle.yearEnd;
          const meta = ocpsByYear.get(year) ?? args.sourceTarget ?? null;
          const thresholds = meta != null ? computeThresholds(meta, args.direction) : null;
          await db.kpiPeriod.create({
            data: {
              kpiId: kpi.id,
              period: p,
              metaGreen: thresholds?.green ?? null,
              metaAmber: thresholds?.amber ?? null,
              metaRed: thresholds?.red ?? null,
            },
          });
        }
        created++;
      }

      // 1. Por cada OLP, generar KPI principal
      for (const olp of olps) {
        const dimension = olpBscToDimension(olp.bscPerspective);
        const ocpIds = ocps.filter((o) => o.olpId === olp.id).map((o) => o.id);
        const name =
          olp.metric ?? olp.description.slice(0, 60);
        await makeKpi({
          name,
          description: `Indicador principal del OLP: ${olp.description.slice(0, 200)}`,
          formula: olp.metric ?? "—",
          dimension,
          unit: olp.unit ?? "USD",
          frequency: "trimestral",
          direction: "mayor_mejor",
          olpIds: [olp.id],
          ocpIds,
          sourceTarget: olp.targetValue,
        });
      }

      // 2. Plantillas adicionales (KPIs estándar por dimensión)
      for (const tpl of EXTRA_KPI_TEMPLATES) {
        // Sugerir solo si hay al menos un OLP en esa dimensión
        const olpsInDim = olps.filter(
          (o) => olpBscToDimension(o.bscPerspective) === tpl.dimension,
        );
        if (olpsInDim.length === 0) continue;
        await makeKpi({
          name: tpl.name,
          description: tpl.description,
          formula: tpl.formula,
          dimension: tpl.dimension,
          unit: tpl.unit,
          frequency: tpl.frequency,
          direction: tpl.direction,
          source: tpl.defaultSource,
          olpIds: olpsInDim.map((o) => o.id),
        });
      }

      return { created };
    }),

  upsert: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        id: z.string().optional(),
        name: z.string().min(1).max(140),
        description: z.string().optional().nullable(),
        formula: z.string().optional().nullable(),
        dimensionBsc: DimensionEnum,
        unit: z.string().optional().nullable(),
        frequency: FrequencyEnum,
        direction: DirectionEnum,
        source: SourceEnum,
        educanetSendMode: SendModeEnum.optional().nullable(),
        manualResponsible: z.string().optional().nullable(),
        responsibleAreaId: z.string().optional().nullable(),
        responsibleRole: z.string().optional().nullable(),
        status: StatusEnum.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isUpdate = !!input.id;

      // EduCaNet link ID logic
      let educanetLinkId: string | null = null;
      let educanetSendMode: string | null = null;

      if (input.source === "educanet") {
        if (isUpdate) {
          const existing = await assertKpiAccess(input.id!, ctx.organizationId);
          educanetLinkId = existing.educanetLinkId ?? (await ensureUniqueEducanetId());
        } else {
          educanetLinkId = await ensureUniqueEducanetId();
        }
        educanetSendMode = input.educanetSendMode ?? "manual";
      }

      const data = {
        name: input.name.trim(),
        description: input.description ?? null,
        formula: input.formula ?? null,
        dimensionBsc: input.dimensionBsc,
        unit: input.unit ?? null,
        frequency: input.frequency,
        direction: input.direction,
        source: input.source,
        educanetLinkId,
        educanetSendMode,
        manualResponsible: input.manualResponsible ?? null,
        responsibleAreaId: input.responsibleAreaId ?? null,
        responsibleRole: input.responsibleRole ?? null,
        status: input.status ?? "aceptado",
      };

      if (isUpdate) {
        await assertKpiAccess(input.id!, ctx.organizationId);
        return db.kpi.update({ where: { id: input.id! }, data });
      }
      const idx = await nextIndexInDimension(input.cycleId, input.dimensionBsc);
      const code = generateKpiCode(input.dimensionBsc, idx);
      return db.kpi.create({
        data: {
          organizationId: ctx.organizationId,
          cycleId: input.cycleId,
          code,
          origin: "manual",
          sortOrder: idx - 1,
          ...data,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertKpiAccess(input.id, ctx.organizationId!);
      return db.kpi.delete({ where: { id: input.id } });
    }),

  setStatus: protectedProcedure
    .input(z.object({ id: z.string(), status: StatusEnum }))
    .mutation(async ({ ctx, input }) => {
      await assertKpiAccess(input.id, ctx.organizationId!);
      return db.kpi.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  setOlps: protectedProcedure
    .input(z.object({ kpiId: z.string(), olpIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const kpi = await assertKpiAccess(input.kpiId, ctx.organizationId!);
      if (input.olpIds.length > 0) {
        const olps = await db.olp.findMany({
          where: { id: { in: input.olpIds } },
          select: { id: true, cycleId: true, organizationId: true },
        });
        const invalid = olps.find(
          (o) =>
            o.organizationId !== ctx.organizationId || o.cycleId !== kpi.cycleId,
        );
        if (invalid || olps.length !== input.olpIds.length) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      await db.kpiOlp.deleteMany({ where: { kpiId: input.kpiId } });
      if (input.olpIds.length > 0) {
        await db.kpiOlp.createMany({
          data: input.olpIds.map((oid) => ({ kpiId: input.kpiId, olpId: oid })),
        });
      }
      return { count: input.olpIds.length };
    }),

  setOcps: protectedProcedure
    .input(z.object({ kpiId: z.string(), ocpIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const kpi = await assertKpiAccess(input.kpiId, ctx.organizationId!);
      if (input.ocpIds.length > 0) {
        const ocps = await db.ocp.findMany({
          where: { id: { in: input.ocpIds } },
          select: { id: true, cycleId: true, organizationId: true },
        });
        const invalid = ocps.find(
          (o) =>
            o.organizationId !== ctx.organizationId || o.cycleId !== kpi.cycleId,
        );
        if (invalid || ocps.length !== input.ocpIds.length) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      await db.kpiOcp.deleteMany({ where: { kpiId: input.kpiId } });
      if (input.ocpIds.length > 0) {
        await db.kpiOcp.createMany({
          data: input.ocpIds.map((oid) => ({ kpiId: input.kpiId, ocpId: oid })),
        });
      }
      return { count: input.ocpIds.length };
    }),

  upsertPeriod: protectedProcedure
    .input(
      z.object({
        kpiId: z.string(),
        period: z.string(),
        metaGreen: z.number().nullable().optional(),
        metaAmber: z.number().nullable().optional(),
        metaRed: z.number().nullable().optional(),
        realValue: z.number().nullable().optional(),
        observation: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertKpiAccess(input.kpiId, ctx.organizationId!);
      const data = {
        metaGreen: input.metaGreen ?? null,
        metaAmber: input.metaAmber ?? null,
        metaRed: input.metaRed ?? null,
        realValue: input.realValue ?? null,
        observation: input.observation ?? null,
      };
      return db.kpiPeriod.upsert({
        where: { kpiId_period: { kpiId: input.kpiId, period: input.period } },
        create: { kpiId: input.kpiId, period: input.period, ...data },
        update: data,
      });
    }),

  regenerateEducanetId: protectedProcedure
    .input(z.object({ kpiId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const kpi = await assertKpiAccess(input.kpiId, ctx.organizationId!);
      if (kpi.source !== "educanet") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solo aplica a indicadores con fuente EduCaNet",
        });
      }
      const newId = await ensureUniqueEducanetId();
      return db.kpi.update({
        where: { id: input.kpiId },
        data: {
          educanetLinkId: newId,
          educanetProjectId: null,
          educanetMetricId: null,
          educanetLastReceivedAt: null,
        },
      });
    }),

  coverage: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const [olps, kpis] = await Promise.all([
        db.olp.findMany({
          where: { cycleId: input.cycleId },
          orderBy: { sortOrder: "asc" },
          select: { id: true, description: true, sortOrder: true },
        }),
        db.kpi.findMany({
          where: { cycleId: input.cycleId, status: { not: "descartado" } },
          select: {
            id: true,
            dimensionBsc: true,
            source: true,
            status: true,
            olps: { select: { olpId: true } },
          },
        }),
      ]);

      // Por dimensión
      const byDim = BSC_DIMENSIONS.map((d) => ({
        key: d.key,
        label: d.label,
        count: kpis.filter((k) => k.dimensionBsc === d.key).length,
        confirmed: kpis.filter(
          (k) => k.dimensionBsc === d.key && k.status === "confirmado",
        ).length,
      }));

      // Por OLP
      const olpCoverage = olps.map((olp, i) => {
        const kpisForOlp = kpis.filter((k) =>
          k.olps.some((kol) => kol.olpId === olp.id),
        );
        return {
          olpId: olp.id,
          olpCode: `OLP${i + 1}`,
          description: olp.description,
          kpiCount: kpisForOlp.length,
          hasEducanet: kpisForOlp.some((k) => k.source === "educanet"),
          hasManual: kpisForOlp.some((k) => k.source === "manual"),
        };
      });

      return { byDimension: byDim, olpCoverage };
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
          where: { cycleId: input.cycleId, status: "confirmado" },
          orderBy: [{ dimensionBsc: "asc" }, { sortOrder: "asc" }],
          include: {
            olps: { include: { olp: { select: { description: true } } } },
            ocps: { include: { ocp: { select: { code: true } } } },
            periods: true,
            responsibleArea: { select: { name: true } },
          },
        }),
      ]);
      return { cycle, organization, kpis };
    }),
});
