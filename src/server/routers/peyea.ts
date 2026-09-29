import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure, editorProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";
import {
  PEYEA_CATALOG,
  ratioDeltaToScore,
  score1to4to1to6,
  type PeyeaVariableDef,
} from "@/lib/peyea-catalog";

interface AmofhitFinding {
  score?: number;
  confirmed?: boolean;
}

interface PorterDataItem {
  intensity?: number;
  rating?: number;
}

export const peyeaRouter = router({
  // get — solo trae el estado guardado (legacy compat)
  get: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const record = await db.peyeaAnalysis.findUnique({
        where: { cycleId: input.cycleId },
      });
      if (!record) return null;
      return {
        ...record,
        financialStrength: JSON.parse(record.financialStrength) as unknown,
        competitiveAdvantage: JSON.parse(record.competitiveAdvantage) as unknown,
        environmentalStability: JSON.parse(record.environmentalStability) as unknown,
        industryStrength: JSON.parse(record.industryStrength) as unknown,
      };
    }),

  // getSetup — entrega el catalogo completo con valores sugeridos
  // calculados desde otros modulos + estado del usuario
  getSetup: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const cycleId = input.cycleId;
      const year = new Date().getFullYear() - 1;

      const [
        peyea,
        amofhitAreas,
        companyMetrics,
        ratioMasters,
        ratioBenchmarks,
        mpcCompetitors,
        porter,
        attractiveness,
        cycle,
      ] = await Promise.all([
        db.peyeaAnalysis.findUnique({ where: { cycleId } }),
        db.amofhitArea.findMany({ where: { cycleId } }),
        db.companyMetric.findMany({ where: { cycleId, year } }),
        db.ratioMaster.findMany(),
        db.ratioIndustria.findMany({ where: { year } }),
        db.mpcCompetitor.findMany({ where: { cycleId }, orderBy: { totalScore: "desc" } }),
        db.porterAnalysis.findUnique({ where: { cycleId } }),
        db.industryAttractiveness.findUnique({ where: { cycleId } }),
        db.strategicCycle.findUnique({
          where: { id: cycleId },
          select: { organization: { select: { sector: true } } },
        }),
      ]);

      const sector = (cycle?.organization?.sector ?? "").toLowerCase().trim();
      const ratiosByKey = new Map(ratioMasters.map((r) => [r.key, r]));
      const benchmarksByKey = new Map<string, number>();
      for (const b of ratioBenchmarks) {
        if (b.sector === sector) benchmarksByKey.set(b.ratioKey, b.value);
      }
      const metricsByKey = new Map(companyMetrics.map((m) => [m.ratioKey, m]));

      const amofhitFindingsByKey: Record<string, AmofhitFinding> = {};
      for (const a of amofhitAreas) {
        try {
          const findings = JSON.parse(a.findings);
          if (typeof findings === "object" && !Array.isArray(findings)) {
            for (const [varId, v] of Object.entries(findings)) {
              if (varId === "_legacy") continue;
              amofhitFindingsByKey[varId] = v as AmofhitFinding;
            }
          }
        } catch {}
      }

      const ownCompetitor = mpcCompetitors.find((c) => c.isOwnOrg);
      const mpcOwnTotal = ownCompetitor?.totalScore ?? null;
      const mpcMarketShareScore = mpcOwnTotal !== null ? score1to4to1to6(mpcOwnTotal) : null;

      let porterData: Record<string, PorterDataItem> = {};
      try {
        if (porter?.data) porterData = JSON.parse(porter.data);
      } catch {}
      const porterAvg = porter?.overallScore
        ? score1to4to1to6(porter.overallScore)
        : null;

      let attractivenessData: PorterDataItem[] = [];
      try {
        if (attractiveness?.data) attractivenessData = JSON.parse(attractiveness.data);
      } catch {}
      const attractivenessAvg =
        attractivenessData.length > 0
          ? attractivenessData.reduce(
              (sum, item) => sum + (item.rating ?? item.intensity ?? 3),
              0,
            ) / attractivenessData.length
          : null;
      const attractivenessScore = attractivenessAvg !== null ? score1to4to1to6(attractivenessAvg) : null;

      const pestecFactors = await db.pestecFactor.findMany({
        where: { cycleId, confirmed: true },
      });
      const threatsAvg =
        pestecFactors.filter((f) => f.type === "A").length > 0
          ? pestecFactors
              .filter((f) => f.type === "A")
              .reduce((sum, f) => sum + (f.rating || 3), 0) /
            pestecFactors.filter((f) => f.type === "A").length
          : null;
      const stabilityScore = threatsAvg !== null ? score1to4to1to6(5 - threatsAvg) : null;

      function suggestedScoreFor(def: PeyeaVariableDef): number | null {
        switch (def.origin) {
          case "amofhit_finanzas": {
            if (!def.ratioKey) return null;
            const metric = metricsByKey.get(def.ratioKey);
            const benchmark = benchmarksByKey.get(def.ratioKey);
            const master = ratiosByKey.get(def.ratioKey);
            if (!metric || benchmark === undefined || !master) return null;
            const sectorVal = metric.sectorOverride ?? benchmark;
            const higherIsBetter = def.invert ? !master.higherIsBetter : master.higherIsBetter;
            return ratioDeltaToScore(metric.value, sectorVal, higherIsBetter);
          }
          case "amofhit_operaciones":
          case "amofhit_marketing":
          case "amofhit_tecnologia": {
            if (!def.amofhitVariableId) return null;
            const finding = amofhitFindingsByKey[def.amofhitVariableId];
            if (!finding?.confirmed || finding.score === undefined) return null;
            return score1to4to1to6(finding.score);
          }
          case "mpc":
            return mpcMarketShareScore;
          case "porter":
            return porterAvg;
          case "atractividad":
            return attractivenessScore;
          case "pestec":
            return stabilityScore;
          case "peyea":
            return null;
        }
      }

      let savedState: Record<string, { score: number; modified: boolean }> = {};
      if (peyea) {
        const allDims = [
          peyea.financialStrength,
          peyea.competitiveAdvantage,
          peyea.environmentalStability,
          peyea.industryStrength,
        ];
        for (const raw of allDims) {
          try {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
              for (const item of arr) {
                if (item.key) {
                  savedState[item.key] = {
                    score: item.score,
                    modified: item.modified ?? false,
                  };
                }
              }
            }
          } catch {}
        }
      }

      const items = PEYEA_CATALOG.map((def) => {
        const suggested = suggestedScoreFor(def);
        const saved = savedState[def.key];
        return {
          key: def.key,
          dimension: def.dimension,
          name: def.name,
          origin: def.origin,
          hint: def.hint,
          suggestedScore: suggested,
          userScore: saved?.score ?? null,
          modified: saved?.modified ?? false,
          isLinked: def.origin !== "peyea" && suggested !== null,
        };
      });

      return {
        sector,
        items,
        savedVector: peyea
          ? { x: peyea.vectorX, y: peyea.vectorY, quadrant: peyea.quadrant }
          : null,
        availableSources: {
          amofhit: amofhitAreas.length > 0,
          companyMetrics: companyMetrics.length > 0,
          mpc: mpcCompetitors.length > 0,
          porter: porter !== null,
          attractiveness: attractiveness !== null,
          pestec: pestecFactors.length > 0,
        },
      };
    }),

  upsert: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        financialStrength: z.unknown().optional(),
        competitiveAdvantage: z.unknown().optional(),
        environmentalStability: z.unknown().optional(),
        industryStrength: z.unknown().optional(),
        vectorX: z.number().optional(),
        vectorY: z.number().optional(),
        quadrant: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { cycleId, ...rest } = input;
      const data: Record<string, unknown> = {};

      if (rest.financialStrength !== undefined)
        data.financialStrength = JSON.stringify(rest.financialStrength);
      if (rest.competitiveAdvantage !== undefined)
        data.competitiveAdvantage = JSON.stringify(rest.competitiveAdvantage);
      if (rest.environmentalStability !== undefined)
        data.environmentalStability = JSON.stringify(rest.environmentalStability);
      if (rest.industryStrength !== undefined)
        data.industryStrength = JSON.stringify(rest.industryStrength);
      if (rest.vectorX !== undefined) data.vectorX = rest.vectorX;
      if (rest.vectorY !== undefined) data.vectorY = rest.vectorY;
      if (rest.quadrant !== undefined) data.quadrant = rest.quadrant;

      return db.peyeaAnalysis.upsert({
        where: { cycleId },
        create: {
          cycleId,
          financialStrength: (data.financialStrength as string) ?? "[]",
          competitiveAdvantage: (data.competitiveAdvantage as string) ?? "[]",
          environmentalStability: (data.environmentalStability as string) ?? "[]",
          industryStrength: (data.industryStrength as string) ?? "[]",
          vectorX: rest.vectorX,
          vectorY: rest.vectorY,
          quadrant: rest.quadrant,
          organizationId: ctx.organizationId,
        },
        update: { ...data, organizationId: ctx.organizationId },
      });
    }),

  // saveRetainedStrategies — guarda las estrategias retenidas del Paso 3
  // como filas en tabla Strategy con type="PEYEA" para que FODA Cruzado
  // y MD/MCPE las puedan recoger.
  saveRetainedStrategies: editorProcedure
    .input(
      z.object({
        cycleId: z.string(),
        strategies: z.array(
          z.object({
            code: z.string(),
            name: z.string(),
            description: z.string(),
          }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.strategy.deleteMany({
        where: { cycleId: input.cycleId, type: "PEYEA" },
      });
      if (input.strategies.length === 0) return { count: 0 };
      await db.strategy.createMany({
        data: input.strategies.map((s, i) => ({
          cycleId: input.cycleId,
          organizationId: ctx.organizationId!,
          code: s.code,
          description: `${s.name}: ${s.description}`,
          swotQuadrant: "DERIVED_PEYEA",
          type: "PEYEA",
          status: "proposed",
          sortOrder: i,
        })),
      });
      return { count: input.strategies.length };
    }),
});
