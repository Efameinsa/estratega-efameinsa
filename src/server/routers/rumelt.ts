import { z } from "zod";
import { router, protectedProcedure, editorProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";
import { computeVerdict, generateReformulationSuggestion, type RumeltCriterion } from "@/lib/rumelt-suggestions";

const CriterionSchema = z.enum(["consistencia", "consonancia", "ventaja", "factibilidad"]);
const VerdictSchema = z.enum(["aprobada", "en_revision", "rechazada"]);

export const rumeltRouter = router({
  // ───────────────────────────────────────────────────────────────────
  // getSetup: estrategias consolidadas + evaluaciones actuales + contexto
  // ───────────────────────────────────────────────────────────────────
  getSetup: protectedProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const cycleId = input.cycleId;
      const [consolidated, evaluations, mcpe, olps] = await Promise.all([
        db.consolidatedStrategy.findMany({
          where: { cycleId, status: { not: "descartada" } },
          orderBy: { sortOrder: "asc" },
          include: { olpLinks: true, origins: true },
        }),
        db.rumeltEvaluation.findMany({
          where: { cycleId },
          include: { criteria: true },
        }),
        db.mcpeAnalysis.findUnique({
          where: { cycleId },
          include: { ratings: true },
        }),
        db.olp.findMany({
          where: { cycleId },
          orderBy: { sortOrder: "asc" },
        }),
      ]);

      // Calcular PTA por estrategia consolidada
      const ptaByStrategy = new Map<string, number>();
      if (mcpe) {
        for (const r of mcpe.ratings) {
          if (r.pa !== null && r.pta !== null) {
            ptaByStrategy.set(r.consolidatedId, (ptaByStrategy.get(r.consolidatedId) ?? 0) + r.pta);
          }
        }
      }

      // Ranking MCPE (orden por PTA descendente)
      const sortedByPta = [...consolidated].sort((a, b) => (ptaByStrategy.get(b.id) ?? 0) - (ptaByStrategy.get(a.id) ?? 0));
      const rankingMap = new Map<string, number>();
      sortedByPta.forEach((s, i) => rankingMap.set(s.id, i + 1));

      const strategies = consolidated.map((c, i) => ({
        ...c,
        eCode: c.code ?? `E${i + 1}`,
        ptaTotal: ptaByStrategy.get(c.id) ?? 0,
        mcpeRanking: rankingMap.get(c.id) ?? null,
      }));

      const olpsEnriched = olps.map((o, i) => ({ ...o, olpCode: `OLP${i + 1}` }));

      const evalsMap = new Map(evaluations.map((e) => [e.consolidatedId, e]));

      return {
        strategies,
        olps: olpsEnriched,
        evaluations: evaluations.map((e) => ({
          ...e,
          criteria: e.criteria,
        })),
        evalsMap: Object.fromEntries(Array.from(evalsMap.entries()).map(([k, v]) => [k, { id: v.id, status: v.status, autoVerdict: v.autoVerdict, finalVerdict: v.finalVerdict, criteria: v.criteria }])),
      };
    }),

  // ───────────────────────────────────────────────────────────────────
  // setCriterion: marca pasa/no pasa con justificacion y sugerencia
  // ───────────────────────────────────────────────────────────────────
  setCriterion: editorProcedure
    .input(z.object({
      cycleId: z.string(),
      consolidatedId: z.string(),
      criterion: CriterionSchema,
      passes: z.boolean(),
      justification: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Upsert evaluacion
      const evaluation = await db.rumeltEvaluation.upsert({
        where: { cycleId_consolidatedId: { cycleId: input.cycleId, consolidatedId: input.consolidatedId } },
        create: {
          cycleId: input.cycleId,
          consolidatedId: input.consolidatedId,
          status: "en_evaluacion",
        },
        update: { status: "en_evaluacion" },
      });

      // Generar sugerencia si no pasa
      let suggestion: string | null = null;
      if (!input.passes) {
        const cs = await db.consolidatedStrategy.findUniqueOrThrow({ where: { id: input.consolidatedId } });
        suggestion = generateReformulationSuggestion(input.criterion, { strategyText: cs.text });
      }

      // Upsert criterio
      await db.rumeltCriterion.upsert({
        where: { evaluationId_criterion: { evaluationId: evaluation.id, criterion: input.criterion } },
        create: {
          evaluationId: evaluation.id,
          criterion: input.criterion,
          passes: input.passes,
          justification: input.justification,
          suggestion,
        },
        update: {
          passes: input.passes,
          justification: input.justification,
          suggestion,
        },
      });

      // Recomputar veredicto
      const allCriteria = await db.rumeltCriterion.findMany({ where: { evaluationId: evaluation.id } });
      const verdict = computeVerdict(allCriteria.map((c) => ({ criterion: c.criterion as RumeltCriterion, passes: c.passes })));
      let status = evaluation.status;
      if (verdict === "aprobada") status = "aprobada";
      else if (verdict === "en_revision") status = "en_revision";
      else if (verdict === "rechazada") status = "rechazada";

      await db.rumeltEvaluation.update({
        where: { id: evaluation.id },
        data: {
          autoVerdict: verdict === "pendiente" ? null : verdict,
          finalVerdict: verdict === "pendiente" ? null : verdict,
          status,
        },
      });

      return { ok: true, verdict, suggestion };
    }),

  // ───────────────────────────────────────────────────────────────────
  // overrideVerdict: usuario sobreescribe veredicto automatico
  // ───────────────────────────────────────────────────────────────────
  overrideVerdict: editorProcedure
    .input(z.object({
      cycleId: z.string(),
      consolidatedId: z.string(),
      newVerdict: VerdictSchema,
      justification: z.string().min(5),
    }))
    .mutation(async ({ input }) => {
      const evaluation = await db.rumeltEvaluation.findUniqueOrThrow({
        where: { cycleId_consolidatedId: { cycleId: input.cycleId, consolidatedId: input.consolidatedId } },
      });
      const statusMap: Record<string, string> = {
        aprobada: "aprobada_manual",
        en_revision: "en_revision",
        rechazada: "rechazada",
      };
      return db.rumeltEvaluation.update({
        where: { id: evaluation.id },
        data: {
          finalVerdict: input.newVerdict,
          overrideJustification: input.justification,
          status: statusMap[input.newVerdict],
        },
      });
    }),

  // ───────────────────────────────────────────────────────────────────
  // reformulate: crea una nueva ConsolidatedStrategy hija con texto nuevo
  // ───────────────────────────────────────────────────────────────────
  reformulate: editorProcedure
    .input(z.object({
      cycleId: z.string(),
      consolidatedId: z.string(),
      newText: z.string().min(10),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const original = await db.consolidatedStrategy.findUniqueOrThrow({
        where: { id: input.consolidatedId },
        include: { origins: true, olpLinks: true },
      });
      const count = await db.consolidatedStrategy.count({ where: { cycleId: input.cycleId } });

      // Marcar original como reformulada
      await db.rumeltEvaluation.updateMany({
        where: { cycleId: input.cycleId, consolidatedId: input.consolidatedId },
        data: { status: "reformulada" },
      });

      // Crear hija
      const child = await db.consolidatedStrategy.create({
        data: {
          cycleId: input.cycleId,
          code: `${original.code}r`,
          text: input.newText,
          type: original.type,
          totalAppearances: original.totalAppearances,
          justification: input.reason ?? `Reformulada desde ${original.code} tras Filtro de Rumelt`,
          sortOrder: count,
          origins: {
            create: original.origins.map((o) => ({
              sourceStrategyId: o.sourceStrategyId,
              sourceMatrix: o.sourceMatrix,
              sourceText: o.sourceText,
              sourceCode: o.sourceCode,
              metadata: o.metadata,
            })),
          },
          olpLinks: {
            create: original.olpLinks.map((l) => ({
              olpId: l.olpId,
              origin: l.origin,
            })),
          },
        },
      });

      // Link en RumeltEvaluation original
      await db.rumeltEvaluation.updateMany({
        where: { cycleId: input.cycleId, consolidatedId: input.consolidatedId },
        data: { reformulatedToId: child.id },
      });

      return child;
    }),
});
