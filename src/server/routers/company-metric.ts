import { z } from "zod";
import { router, protectedProcedure, editorProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";

export const companyMetricRouter = router({
  /**
   * Devuelve el setup completo para renderizar el bloque "Respaldo cuantitativo"
   * de un area: catalogo de indicadores + benchmark sectorial + metricas guardadas.
   */
  getAreaSetup: protectedProcedure
    .input(
      z.object({
        cycleId: z.string(),
        area: z.string(),
        year: z.number().int().optional(),
      })
    )
    .query(async ({ input }) => {
      const year = input.year ?? new Date().getFullYear() - 1;

      const cycle = await db.strategicCycle.findUnique({
        where: { id: input.cycleId },
        select: { organization: { select: { sector: true } } },
      });
      const sector = (cycle?.organization?.sector ?? "").toLowerCase().trim();

      const masters = await db.ratioMaster.findMany({
        where: { area: input.area },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      });

      const ratioKeys = masters.map((m) => m.key);

      const [benchmarks, savedMetrics] = await Promise.all([
        sector
          ? db.ratioIndustria.findMany({
              where: { sector, ratioKey: { in: ratioKeys }, year },
            })
          : Promise.resolve([]),
        db.companyMetric.findMany({
          where: { cycleId: input.cycleId, ratioKey: { in: ratioKeys }, year },
        }),
      ]);

      const benchmarkByKey = new Map(benchmarks.map((b) => [b.ratioKey, b]));
      const metricByKey = new Map(savedMetrics.map((m) => [m.ratioKey, m]));

      return {
        sector,
        year,
        items: masters.map((m) => {
          const benchmark = benchmarkByKey.get(m.key);
          const saved = metricByKey.get(m.key);
          return {
            key: m.key,
            area: m.area,
            category: m.category,
            name: m.name,
            formula: m.formula,
            unit: m.unit,
            higherIsBetter: m.higherIsBetter,
            defaultActive: m.defaultActive,
            sectorBenchmark: benchmark?.value ?? null,
            sectorBenchmarkSource: benchmark?.source ?? null,
            companyValue: saved?.value ?? null,
            sectorOverride: saved?.sectorOverride ?? null,
          };
        }),
      };
    }),

  upsert: editorProcedure
    .input(
      z.object({
        cycleId: z.string(),
        ratioKey: z.string(),
        year: z.number().int(),
        value: z.number().nullable(),
        sectorOverride: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Si value es null y no hay sectorOverride, eliminar la metrica
      if (input.value === null && (input.sectorOverride === null || input.sectorOverride === undefined)) {
        await db.companyMetric.deleteMany({
          where: {
            cycleId: input.cycleId,
            ratioKey: input.ratioKey,
            year: input.year,
          },
        });
        return { deleted: true };
      }

      const existing = await db.companyMetric.findUnique({
        where: {
          cycleId_ratioKey_year: {
            cycleId: input.cycleId,
            ratioKey: input.ratioKey,
            year: input.year,
          },
        },
      });

      const data = {
        value: input.value ?? existing?.value ?? 0,
        sectorOverride: input.sectorOverride ?? existing?.sectorOverride ?? null,
        updatedById: ctx.userId,
      };

      if (existing) {
        return db.companyMetric.update({
          where: { id: existing.id },
          data,
        });
      }
      return db.companyMetric.create({
        data: {
          cycleId: input.cycleId,
          ratioKey: input.ratioKey,
          year: input.year,
          ...data,
        },
      });
    }),
});
