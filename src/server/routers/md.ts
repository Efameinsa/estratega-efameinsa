import { z } from "zod";
import { router, protectedProcedure, editorProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";
import { compareStrategies, clusterStrategies, DEFAULT_DUPLICATE_THRESHOLD } from "@/lib/strategy-similarity";

const SourceMatrixSchema = z.enum(["foda_cruzado", "peyea", "bcg", "ie", "ge"]);

function inferSourceMatrix(strategyType: string | null, swotQuadrant: string): "foda_cruzado" | "peyea" | "bcg" | "ie" | "ge" {
  const t = strategyType ?? swotQuadrant;
  if (["FO", "FA", "DO", "DA"].includes(t)) return "foda_cruzado";
  if (t === "PEYEA") return "peyea";
  if (t === "BCG") return "bcg";
  if (t === "IE") return "ie";
  if (t === "GE") return "ge";
  return "foda_cruzado"; // fallback
}

export const mdRouter = router({
  // ───────────────────────────────────────────────────────────────────
  // getSetup: trae estrategias de las 5 matrices, OLPs y la consolidacion
  // actual. Si no hay consolidacion, propone una via clustering.
  // ───────────────────────────────────────────────────────────────────
  getSetup: protectedProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const cycleId = input.cycleId;
      const [strategies, olps, consolidated] = await Promise.all([
        db.strategy.findMany({
          where: { cycleId },
          orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
        }),
        db.olp.findMany({
          where: { cycleId },
          orderBy: { sortOrder: "asc" },
        }),
        db.consolidatedStrategy.findMany({
          where: { cycleId },
          orderBy: { sortOrder: "asc" },
          include: { origins: true, olpLinks: true },
        }),
      ]);

      // Codigos OLP1..N
      const olpsEnriched = olps.map((o, i) => ({
        ...o,
        olpCode: `OLP${i + 1}`,
      }));

      // Codigos a estrategias originales
      const strategiesEnriched = strategies.map((s, i) => ({
        ...s,
        eCode: s.code ?? `S${i + 1}`,
        sourceMatrix: inferSourceMatrix(s.type, s.swotQuadrant),
      }));

      // Estado de matrices completas
      const matricesCompleted = {
        foda_cruzado: strategies.some((s) => ["FO", "FA", "DO", "DA"].includes(s.swotQuadrant ?? "")),
        peyea: strategies.some((s) => s.type === "PEYEA"),
        bcg: strategies.some((s) => s.type === "BCG"),
        ie: strategies.some((s) => s.type === "IE"),
        ge: strategies.some((s) => s.type === "GE"),
      };

      // Si no hay consolidacion guardada, proponer una mediante clustering
      let proposedConsolidation: Array<{
        text: string;
        members: typeof strategiesEnriched;
      }> | null = null;
      if (consolidated.length === 0 && strategiesEnriched.length > 0) {
        const texts = strategiesEnriched.map((s) => s.description);
        const clusters = clusterStrategies(texts, DEFAULT_DUPLICATE_THRESHOLD);
        proposedConsolidation = clusters.map((c) => ({
          text: texts[c.representative],
          members: c.members.map((idx) => strategiesEnriched[idx]),
        }));
      }

      return {
        strategies: strategiesEnriched,
        olps: olpsEnriched,
        consolidated: consolidated.map((c, i) => ({
          ...c,
          eCode: c.code ?? `E${i + 1}`,
        })),
        proposedConsolidation,
        matricesCompleted,
      };
    }),

  // ───────────────────────────────────────────────────────────────────
  // saveConsolidation: persiste la consolidacion (propuesta o manual)
  // Reemplaza completamente la consolidacion existente.
  // ───────────────────────────────────────────────────────────────────
  saveConsolidation: editorProcedure
    .input(
      z.object({
        cycleId: z.string(),
        items: z.array(
          z.object({
            text: z.string().min(1),
            origins: z.array(
              z.object({
                sourceStrategyId: z.string(),
                sourceMatrix: SourceMatrixSchema,
                sourceText: z.string(),
                sourceCode: z.string().optional(),
                metadata: z.string().optional(),
              }),
            ),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      // Borrar la consolidacion actual y volver a crear
      await db.consolidatedStrategy.deleteMany({
        where: { cycleId: input.cycleId },
      });
      const created: { id: string }[] = [];
      for (let i = 0; i < input.items.length; i++) {
        const item = input.items[i];
        // Conteo de matrices distintas que aparece
        const matricesSet = new Set(item.origins.map((o) => o.sourceMatrix));
        const cs = await db.consolidatedStrategy.create({
          data: {
            cycleId: input.cycleId,
            code: `E${i + 1}`,
            text: item.text,
            totalAppearances: matricesSet.size,
            sortOrder: i,
            origins: {
              create: item.origins.map((o) => ({
                sourceStrategyId: o.sourceStrategyId,
                sourceMatrix: o.sourceMatrix,
                sourceText: o.sourceText,
                sourceCode: o.sourceCode,
                metadata: o.metadata,
              })),
            },
          },
        });
        created.push({ id: cs.id });
      }
      return { count: created.length };
    }),

  updateConsolidated: editorProcedure
    .input(
      z.object({
        id: z.string(),
        text: z.string().min(1).optional(),
        type: z.string().optional(),
        status: z.enum(["retenida", "contingencia", "retenida_manual", "descartada"]).optional(),
        justification: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.consolidatedStrategy.update({ where: { id }, data });
    }),

  deleteConsolidated: editorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.consolidatedStrategy.delete({ where: { id: input.id } });
    }),

  // ───────────────────────────────────────────────────────────────────
  // mergeManually: fusiona dos estrategias consolidadas en una nueva
  // ───────────────────────────────────────────────────────────────────
  mergeManually: editorProcedure
    .input(
      z.object({
        cycleId: z.string(),
        sourceIds: z.array(z.string()).min(2),
        newText: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const sources = await db.consolidatedStrategy.findMany({
        where: { id: { in: input.sourceIds } },
        include: { origins: true, olpLinks: true },
      });
      if (sources.length < 2) throw new Error("Se necesitan al menos 2 estrategias para fusionar");

      // Combinar todos los origins
      const allOrigins = sources.flatMap((s) => s.origins);
      const allOlpLinks = sources.flatMap((s) => s.olpLinks);
      const matricesSet = new Set(allOrigins.map((o) => o.sourceMatrix));

      const count = await db.consolidatedStrategy.count({ where: { cycleId: input.cycleId } });
      const merged = await db.consolidatedStrategy.create({
        data: {
          cycleId: input.cycleId,
          code: `E${count + 1}`,
          text: input.newText,
          totalAppearances: matricesSet.size,
          sortOrder: count,
          origins: {
            create: allOrigins.map((o) => ({
              sourceStrategyId: o.sourceStrategyId,
              sourceMatrix: o.sourceMatrix,
              sourceText: o.sourceText,
              sourceCode: o.sourceCode,
              metadata: o.metadata,
            })),
          },
          olpLinks: {
            create: Array.from(new Set(allOlpLinks.map((l) => l.olpId))).map((olpId) => ({
              olpId,
              origin: "user",
            })),
          },
        },
      });
      // Borrar los originales
      await db.consolidatedStrategy.deleteMany({ where: { id: { in: input.sourceIds } } });
      return merged;
    }),

  // ───────────────────────────────────────────────────────────────────
  // splitConsolidated: separa una estrategia consolidada en sus origenes
  // ───────────────────────────────────────────────────────────────────
  splitConsolidated: editorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const cs = await db.consolidatedStrategy.findUniqueOrThrow({
        where: { id: input.id },
        include: { origins: true },
      });
      if (cs.origins.length <= 1) {
        throw new Error("No hay nada que separar — esta estrategia tiene un solo origen");
      }
      const baseCount = await db.consolidatedStrategy.count({ where: { cycleId: cs.cycleId } });
      // Crear una nueva consolidada por cada origin
      for (let i = 0; i < cs.origins.length; i++) {
        const o = cs.origins[i];
        await db.consolidatedStrategy.create({
          data: {
            cycleId: cs.cycleId,
            code: `E${baseCount + i}`,
            text: o.sourceText,
            totalAppearances: 1,
            sortOrder: baseCount + i,
            origins: {
              create: {
                sourceStrategyId: o.sourceStrategyId,
                sourceMatrix: o.sourceMatrix,
                sourceText: o.sourceText,
                sourceCode: o.sourceCode,
                metadata: o.metadata,
              },
            },
          },
        });
      }
      // Borrar la original
      await db.consolidatedStrategy.delete({ where: { id: input.id } });
      return { count: cs.origins.length };
    }),

  // ───────────────────────────────────────────────────────────────────
  // setOlpLink: marcar/desmarcar relacion estrategia-OLP
  // ───────────────────────────────────────────────────────────────────
  setOlpLink: editorProcedure
    .input(
      z.object({
        consolidatedId: z.string(),
        olpId: z.string(),
        linked: z.boolean(),
        origin: z.enum(["suggested", "user"]).default("user"),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.linked) {
        await db.consolidatedStrategyOlp.upsert({
          where: { consolidatedId_olpId: { consolidatedId: input.consolidatedId, olpId: input.olpId } },
          create: {
            consolidatedId: input.consolidatedId,
            olpId: input.olpId,
            origin: input.origin,
          },
          update: { origin: input.origin },
        });
      } else {
        await db.consolidatedStrategyOlp.deleteMany({
          where: { consolidatedId: input.consolidatedId, olpId: input.olpId },
        });
      }
      return { ok: true };
    }),

  // Sugerir vinculaciones automaticas usando el comparador
  suggestOlpLinks: protectedProcedure
    .input(z.object({ consolidatedId: z.string(), threshold: z.number().default(0.20) }))
    .query(async ({ input }) => {
      const cs = await db.consolidatedStrategy.findUniqueOrThrow({
        where: { id: input.consolidatedId },
      });
      const olps = await db.olp.findMany({
        where: { cycleId: cs.cycleId },
        orderBy: { sortOrder: "asc" },
      });
      const sims = olps.map((o, i) => ({
        olpId: o.id,
        olpCode: `OLP${i + 1}`,
        text: o.description,
        similarity: compareStrategies(cs.text, o.description),
      }));
      return sims.filter((s) => s.similarity >= input.threshold).sort((a, b) => b.similarity - a.similarity);
    }),
});
