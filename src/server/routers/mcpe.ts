import { z } from "zod";
import { router, cycleProcedure, cycleEditorProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";
import { compareStrategies } from "@/lib/strategy-similarity";

const FactorTypeSchema = z.enum(["F", "D", "O", "A"]);

interface FactorOut { id: string; code: string; type: "F" | "D" | "O" | "A"; text: string; weight: number }

export const mcpeRouter = router({
  // ───────────────────────────────────────────────────────────────────
  // getSetup: factores FODA + estrategias retenidas + ratings actuales
  // ───────────────────────────────────────────────────────────────────
  getSetup: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const cycleId = input.cycleId;
      const [mefi, mefe, consolidated, analysis] = await Promise.all([
        db.mefiFactor.findMany({
          where: { cycleId },
          orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
        }),
        db.mefeFactor.findMany({
          where: { cycleId },
          orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
        }),
        db.consolidatedStrategy.findMany({
          where: { cycleId, status: { not: "descartada" } },
          orderBy: { sortOrder: "asc" },
          include: { olpLinks: true, origins: true },
        }),
        db.mcpeAnalysis.findUnique({
          where: { cycleId },
          include: { ratings: true },
        }),
      ]);

      // Codificar factores
      let fIdx = 0, dIdx = 0;
      const fortalezas: FactorOut[] = mefi.filter((f) => f.type === "F").map((f) => ({ id: f.id, code: `F${++fIdx}`, type: "F", text: f.description, weight: f.weight }));
      const debilidades: FactorOut[] = mefi.filter((f) => f.type === "D").map((f) => ({ id: f.id, code: `D${++dIdx}`, type: "D", text: f.description, weight: f.weight }));
      let oIdx = 0, aIdx = 0;
      const oportunidades: FactorOut[] = mefe.filter((f) => f.type === "O").map((f) => ({ id: f.id, code: `O${++oIdx}`, type: "O", text: f.description, weight: f.weight }));
      const amenazas: FactorOut[] = mefe.filter((f) => f.type === "A").map((f) => ({ id: f.id, code: `A${++aIdx}`, type: "A", text: f.description, weight: f.weight }));

      const allFactors = [...fortalezas, ...oportunidades, ...debilidades, ...amenazas];

      // Codificar estrategias
      const strategies = consolidated.map((c, i) => ({
        ...c,
        eCode: c.code ?? `E${i + 1}`,
      }));

      // Indexar ratings
      const ratingsMap = new Map<string, { pa: number | null; pta: number | null; origin: string; justification: string | null }>();
      if (analysis) {
        for (const r of analysis.ratings) {
          ratingsMap.set(`${r.factorId}|${r.consolidatedId}`, {
            pa: r.pa, pta: r.pta, origin: r.origin, justification: r.justification,
          });
        }
      }

      // PTA por estrategia (suma de columna)
      const ptaByStrategy: Record<string, number> = {};
      for (const s of strategies) ptaByStrategy[s.id] = 0;
      let totalCells = allFactors.length * strategies.length;
      let ratedCells = 0;
      for (const f of allFactors) {
        for (const s of strategies) {
          const key = `${f.id}|${s.id}`;
          const r = ratingsMap.get(key);
          if (r && r.pa !== null) {
            ptaByStrategy[s.id] += r.pta ?? f.weight * r.pa;
            ratedCells++;
          } else if (r && r.pa === null) {
            // marcado como N/A explicitamente
            ratedCells++;
          }
        }
      }

      const progress = totalCells > 0 ? (ratedCells / totalCells) * 100 : 0;

      // Construir array plano de ratings serializables
      const ratings = Array.from(ratingsMap.entries()).map(([k, v]) => {
        const [factorId, consolidatedId] = k.split("|");
        return { factorId, consolidatedId, ...v };
      });

      return {
        analysisId: analysis?.id ?? null,
        progress,
        ratedCells,
        totalCells,
        factors: { fortalezas, oportunidades, debilidades, amenazas, all: allFactors },
        strategies,
        ratings,
        ptaByStrategy,
      };
    }),

  // ───────────────────────────────────────────────────────────────────
  // setRating: upsert de una calificacion individual
  // ───────────────────────────────────────────────────────────────────
  setRating: cycleEditorProcedure
    .input(z.object({
      cycleId: z.string(),
      factorId: z.string(),
      factorType: FactorTypeSchema,
      consolidatedId: z.string(),
      pa: z.number().int().min(1).max(4).nullable(),
      weight: z.number(),
      origin: z.enum(["user", "suggested", "suggested_accepted", "suggested_modified"]).default("user"),
      justification: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // upsert MCPE analysis
      const analysis = await db.mcpeAnalysis.upsert({
        where: { cycleId: input.cycleId },
        create: { cycleId: input.cycleId },
        update: {},
      });
      const pta = input.pa !== null ? input.weight * input.pa : null;
      await db.mcpeRating.upsert({
        where: { analysisId_factorId_consolidatedId: { analysisId: analysis.id, factorId: input.factorId, consolidatedId: input.consolidatedId } },
        create: {
          analysisId: analysis.id,
          factorId: input.factorId,
          factorType: input.factorType,
          consolidatedId: input.consolidatedId,
          pa: input.pa,
          pta,
          origin: input.origin,
          justification: input.justification,
        },
        update: {
          pa: input.pa,
          pta,
          origin: input.origin,
          justification: input.justification,
        },
      });
      return { ok: true };
    }),

  // ───────────────────────────────────────────────────────────────────
  // setRatingsBulk: aplica multiples ratings a la vez (acepta sugerencias)
  // ───────────────────────────────────────────────────────────────────
  setRatingsBulk: cycleEditorProcedure
    .input(z.object({
      cycleId: z.string(),
      ratings: z.array(z.object({
        factorId: z.string(),
        factorType: FactorTypeSchema,
        consolidatedId: z.string(),
        pa: z.number().int().min(1).max(4).nullable(),
        weight: z.number(),
        origin: z.string().default("suggested"),
      })),
    }))
    .mutation(async ({ input }) => {
      const analysis = await db.mcpeAnalysis.upsert({
        where: { cycleId: input.cycleId },
        create: { cycleId: input.cycleId },
        update: {},
      });
      for (const r of input.ratings) {
        const pta = r.pa !== null ? r.weight * r.pa : null;
        await db.mcpeRating.upsert({
          where: { analysisId_factorId_consolidatedId: { analysisId: analysis.id, factorId: r.factorId, consolidatedId: r.consolidatedId } },
          create: { analysisId: analysis.id, factorId: r.factorId, factorType: r.factorType, consolidatedId: r.consolidatedId, pa: r.pa, pta, origin: r.origin },
          update: { pa: r.pa, pta, origin: r.origin },
        });
      }
      return { count: input.ratings.length };
    }),

  // ───────────────────────────────────────────────────────────────────
  // suggestRatings: genera sugerencias para todas las celdas vacias
  // basadas en similitud factor-estrategia
  // ───────────────────────────────────────────────────────────────────
  suggestRatings: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const cycleId = input.cycleId;
      const [mefi, mefe, consolidated, analysis] = await Promise.all([
        db.mefiFactor.findMany({ where: { cycleId } }),
        db.mefeFactor.findMany({ where: { cycleId } }),
        db.consolidatedStrategy.findMany({ where: { cycleId, status: { not: "descartada" } } }),
        db.mcpeAnalysis.findUnique({ where: { cycleId }, include: { ratings: true } }),
      ]);

      const ratedKeys = new Set<string>();
      if (analysis) {
        for (const r of analysis.ratings) ratedKeys.add(`${r.factorId}|${r.consolidatedId}`);
      }

      const allFactors = [
        ...mefi.map((f) => ({ id: f.id, type: f.type as "F"|"D", text: f.description, weight: f.weight })),
        ...mefe.map((f) => ({ id: f.id, type: f.type as "O"|"A", text: f.description, weight: f.weight })),
      ];

      const suggestions: Array<{
        factorId: string; factorType: "F"|"D"|"O"|"A"; consolidatedId: string;
        pa: number | null; weight: number; reason: string;
      }> = [];

      for (const f of allFactors) {
        for (const s of consolidated) {
          const key = `${f.id}|${s.id}`;
          if (ratedKeys.has(key)) continue;
          const sim = compareStrategies(f.text, s.text);
          // Mapeo: 0-0.10 → null (N/A), 0.10-0.25 → 1-2, 0.25-0.45 → 2-3, ≥0.45 → 3-4
          let pa: number | null;
          let reason: string;
          if (sim < 0.10) {
            pa = null;
            reason = "Sin relacion semantica clara con la estrategia";
          } else if (sim < 0.25) {
            pa = 2;
            reason = `Relacion debil (similitud ${sim.toFixed(2)})`;
          } else if (sim < 0.45) {
            pa = 3;
            reason = `Relacion moderada (similitud ${sim.toFixed(2)})`;
          } else {
            pa = 4;
            reason = `Relacion fuerte (similitud ${sim.toFixed(2)})`;
          }
          suggestions.push({
            factorId: f.id, factorType: f.type, consolidatedId: s.id,
            pa, weight: f.weight, reason,
          });
        }
      }

      return suggestions;
    }),

  // ───────────────────────────────────────────────────────────────────
  // markComplete
  // ───────────────────────────────────────────────────────────────────
  markComplete: cycleEditorProcedure
    .input(z.object({ cycleId: z.string() }))
    .mutation(async ({ input }) => {
      return db.mcpeAnalysis.update({
        where: { cycleId: input.cycleId },
        data: { status: "completo" },
      });
    }),
});
