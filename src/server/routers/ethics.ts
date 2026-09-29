import { z } from "zod";
import { router, protectedProcedure, editorProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";
import { computeAutoVerdict, generateMitigantSuggestion, type EthicsRating } from "@/lib/ethics-catalog";

const RatingSchema = z.enum(["viola", "neutral", "promueve"]);
const BlockSchema = z.enum(["derechos", "justicia", "utilitarismo"]);
const VerdictSchema = z.enum(["aprobada", "aprobada_con_mitigantes", "requiere_mitigacion", "rechazada"]);

export const ethicsAuditRouter = router({
  // ───────────────────────────────────────────────────────────────────
  // getSetup: estrategias aprobadas en Rumelt + evaluaciones eticas
  // + valores corporativos (M1)
  // ───────────────────────────────────────────────────────────────────
  getSetup: protectedProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const cycleId = input.cycleId;
      const [consolidated, rumeltEvals, ethicsEvals, values] = await Promise.all([
        db.consolidatedStrategy.findMany({
          where: { cycleId, status: { not: "descartada" } },
          orderBy: { sortOrder: "asc" },
        }),
        db.rumeltEvaluation.findMany({
          where: { cycleId },
          include: { criteria: true },
        }),
        db.ethicsEvaluation.findMany({
          where: { cycleId },
          include: { principles: true, mitigants: true },
        }),
        db.value.findMany({
          where: { cycleId },
          orderBy: { sortOrder: "asc" },
        }),
      ]);

      // Solo estrategias aprobadas en Rumelt
      const rumeltMap = new Map(rumeltEvals.map((e) => [e.consolidatedId, e]));
      const eligible = consolidated.filter((c) => {
        const r = rumeltMap.get(c.id);
        return r && (r.status === "aprobada" || r.status === "aprobada_manual");
      });

      const strategies = eligible.map((c, i) => ({
        ...c,
        eCode: c.code ?? `E${i + 1}`,
      }));

      const ethicsEvalsMap = new Map(ethicsEvals.map((e) => [e.consolidatedId, e]));

      return {
        strategies,
        values: values.map((v) => ({ id: v.id, text: v.description ?? v.name, name: v.name })),
        evaluations: ethicsEvals,
        evalsMap: Object.fromEntries(
          Array.from(ethicsEvalsMap.entries()).map(([k, v]) => [k, {
            id: v.id,
            status: v.status,
            autoVerdict: v.autoVerdict,
            finalVerdict: v.finalVerdict,
            principles: v.principles,
            mitigants: v.mitigants,
          }]),
        ),
        rumeltApprovedCount: eligible.length,
        totalConsolidated: consolidated.length,
      };
    }),

  // ───────────────────────────────────────────────────────────────────
  // setPrinciple: marca rating de un principio y guarda justificacion
  // ───────────────────────────────────────────────────────────────────
  setPrinciple: editorProcedure
    .input(z.object({
      cycleId: z.string(),
      consolidatedId: z.string(),
      block: BlockSchema,
      principleKey: z.string(),
      rating: RatingSchema,
      justification: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Validar justificacion obligatoria si rating=viola
      if (input.rating === "viola" && (!input.justification || input.justification.length < 30)) {
        throw new Error("La justificacion de una violacion es obligatoria (minimo 30 caracteres)");
      }
      // Upsert evaluacion
      const evaluation = await db.ethicsEvaluation.upsert({
        where: { cycleId_consolidatedId: { cycleId: input.cycleId, consolidatedId: input.consolidatedId } },
        create: { cycleId: input.cycleId, consolidatedId: input.consolidatedId, status: "en_evaluacion" },
        update: { status: "en_evaluacion" },
      });
      // Upsert principio
      await db.ethicsPrinciple.upsert({
        where: { evaluationId_principleKey: { evaluationId: evaluation.id, principleKey: input.principleKey } },
        create: {
          evaluationId: evaluation.id,
          block: input.block,
          principleKey: input.principleKey,
          rating: input.rating,
          justification: input.justification,
        },
        update: { block: input.block, rating: input.rating, justification: input.justification },
      });

      // Recomputar veredicto
      await recomputeVerdict(evaluation.id);

      // Devolver sugerencia si viola
      const cs = await db.consolidatedStrategy.findUniqueOrThrow({ where: { id: input.consolidatedId } });
      const suggestion = input.rating === "viola" ? generateMitigantSuggestion(input.principleKey, cs.text) : null;

      return { ok: true, suggestion };
    }),

  // ───────────────────────────────────────────────────────────────────
  // saveMitigant: guarda un mitigante para una violacion
  // ───────────────────────────────────────────────────────────────────
  saveMitigant: editorProcedure
    .input(z.object({
      cycleId: z.string(),
      consolidatedId: z.string(),
      principleKey: z.string(),
      text: z.string().min(30),
      responsible: z.string().min(1),
      deadline: z.enum(["previo_lanzamiento", "primer_trimestre", "primer_año", "continuo"]),
      indicator: z.string().min(1),
      postSeverity: z.enum(["mantiene", "neutral", "promueve"]),
    }))
    .mutation(async ({ input }) => {
      const evaluation = await db.ethicsEvaluation.findUniqueOrThrow({
        where: { cycleId_consolidatedId: { cycleId: input.cycleId, consolidatedId: input.consolidatedId } },
      });
      const principle = await db.ethicsPrinciple.findUniqueOrThrow({
        where: { evaluationId_principleKey: { evaluationId: evaluation.id, principleKey: input.principleKey } },
      });
      // Eliminar mitigantes anteriores del mismo principio (1:1)
      await db.ethicsMitigant.deleteMany({
        where: { evaluationId: evaluation.id, principleId: principle.id },
      });
      const mitigant = await db.ethicsMitigant.create({
        data: {
          evaluationId: evaluation.id,
          principleId: principle.id,
          text: input.text,
          responsible: input.responsible,
          deadline: input.deadline,
          indicator: input.indicator,
          postSeverity: input.postSeverity,
        },
      });
      await recomputeVerdict(evaluation.id);
      return mitigant;
    }),

  overrideVerdict: editorProcedure
    .input(z.object({
      cycleId: z.string(),
      consolidatedId: z.string(),
      newVerdict: VerdictSchema,
      justification: z.string().min(5),
    }))
    .mutation(async ({ input }) => {
      const evaluation = await db.ethicsEvaluation.findUniqueOrThrow({
        where: { cycleId_consolidatedId: { cycleId: input.cycleId, consolidatedId: input.consolidatedId } },
      });
      return db.ethicsEvaluation.update({
        where: { id: evaluation.id },
        data: {
          finalVerdict: input.newVerdict,
          overrideJustification: input.justification,
          status: input.newVerdict,
        },
      });
    }),
});

async function recomputeVerdict(evaluationId: string) {
  const evaluation = await db.ethicsEvaluation.findUniqueOrThrow({
    where: { id: evaluationId },
    include: { principles: true, mitigants: { include: { principle: true } } },
  });
  const principles = evaluation.principles.map((p) => ({ principleKey: p.principleKey, rating: p.rating as EthicsRating }));
  const mitigants = evaluation.mitigants.map((m) => ({ principleKey: m.principle.principleKey, postSeverity: m.postSeverity as "mantiene" | "neutral" | "promueve" }));
  const { verdict } = computeAutoVerdict(principles, mitigants);
  const status = verdict === "aprobada" ? "aprobada" : verdict === "aprobada_con_mitigantes" ? "aprobada_con_mitigantes" : verdict === "requiere_mitigacion" ? "requiere_mitigacion" : "rechazada";
  await db.ethicsEvaluation.update({
    where: { id: evaluationId },
    data: { autoVerdict: verdict, finalVerdict: verdict, status },
  });
}
