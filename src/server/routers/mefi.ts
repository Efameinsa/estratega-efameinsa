import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, protectedProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";
import { AMOFHIT_EVALUATION_DATA, RATING_CONFIG } from "@/lib/amofhit-evaluation-data";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface EvalEntry {
  score: 1 | 2 | 3 | 4;
  hallazgo: string;
  evidenceChips: string[];
  evidenceNotes: string;
  evidenceFiles: string[];
  confirmed: boolean;
  includeInMefi?: boolean;
}

function extractHallazgoCorto(hallazgo: string): string {
  // Take text before " — " or before ". " (first sentence)
  const dashIdx = hallazgo.indexOf(" — ");
  if (dashIdx > 0) return hallazgo.substring(0, dashIdx);
  const dotIdx = hallazgo.indexOf(". ");
  if (dotIdx > 0) return hallazgo.substring(0, dotIdx + 1);
  return hallazgo.length > 120 ? hallazgo.substring(0, 117) + "..." : hallazgo;
}

function shouldAutoInclude(score: number): boolean {
  return score === 1 || score === 4;
}

function suggestWeight(totalFactors: number): number {
  if (totalFactors === 0) return 0.05;
  const base = 1 / totalFactors;
  return Math.round(base * 100) / 100;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const mefiRouter = router({
  // List all MEFI factors for a cycle
  list: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      return db.mefiFactor.findMany({
        where: { cycleId: input.cycleId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  // Get MEFI summary with PPT, weight validation, and state
  getSummary: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const [factors, state] = await Promise.all([
        db.mefiFactor.findMany({ where: { cycleId: input.cycleId } }),
        db.mefiState.findUnique({ where: { cycleId: input.cycleId } }),
      ]);

      const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
      const ppt = factors.reduce((sum, f) => sum + f.score, 0);
      const fortalezas = factors.filter((f) => f.type === "F").length;
      const debilidades = factors.filter((f) => f.type === "D").length;

      return {
        totalWeight,
        ppt,
        isWeightValid: Math.abs(totalWeight - 1) < 0.005,
        weightDiff: 1 - totalWeight,
        count: factors.length,
        fortalezas,
        debilidades,
        status: state?.status ?? "en_construccion",
        pptFinal: state?.pptFinal ?? null,
      };
    }),

  // Get MEFI state
  getState: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      return db.mefiState.findUnique({ where: { cycleId: input.cycleId } });
    }),

  // Sync MEFI factors from AMOFHIT evaluations (new evaluation format)
  syncFromAmofhit: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const areas = await db.amofhitArea.findMany({
        where: { cycleId: input.cycleId },
      });

      // Collect all confirmed evaluations that should be in MEFI
      const newFactors: Array<{
        variableId: string;
        description: string;
        type: "F" | "D";
        rating: number;
        area: string;
      }> = [];

      for (const area of areas) {
        let findings: Record<string, unknown>;
        try {
          findings = JSON.parse(area.findings);
        } catch {
          continue;
        }

        // Skip legacy array format
        if (Array.isArray(findings)) continue;

        for (const [key, val] of Object.entries(findings)) {
          if (key === "_legacy" || !val || typeof val !== "object") continue;
          const ev = val as EvalEntry;
          if (!ev.confirmed || !ev.score) continue;

          // Inclusion rule: 1 and 4 auto-include, 2 and 3 only if user toggled
          const include = shouldAutoInclude(ev.score) || ev.includeInMefi === true;
          if (!include) continue;

          newFactors.push({
            variableId: key,
            description: extractHallazgoCorto(ev.hallazgo),
            type: ev.score >= 3 ? "F" : "D",
            rating: ev.score,
            area: area.area,
          });
        }
      }

      // Get existing factors to avoid duplicates
      const existing = await db.mefiFactor.findMany({
        where: { cycleId: input.cycleId },
      });
      const existingSourceIds = new Set(
        existing.filter((f) => f.sourceVariableId).map((f) => f.sourceVariableId),
      );
      // Also track manual factors (no sourceVariableId)
      const manualFactors = existing.filter((f) => !f.sourceVariableId);

      // Calculate weight for all factors (new + manual)
      const totalFactorCount = newFactors.length + manualFactors.length;
      const defaultWeight = totalFactorCount > 0 ? Math.round((1 / totalFactorCount) * 100) / 100 : 0.05;

      // Delete existing auto-imported factors (preserve manual ones)
      await db.mefiFactor.deleteMany({
        where: {
          cycleId: input.cycleId,
          sourceVariableId: { not: null },
        },
      });

      // Create new factors from evaluations
      let sortOrder = 0;
      const creates = newFactors.map((f) => {
        const order = sortOrder++;
        return db.mefiFactor.create({
          data: {
            cycleId: input.cycleId,
            description: f.description,
            originalDescription: f.description,
            sourceVariableId: f.variableId,
            type: f.type,
            weight: defaultWeight,
            rating: f.rating,
            score: defaultWeight * f.rating,
            area: f.area,
            sortOrder: order,
            organizationId: ctx.organizationId,
          },
        });
      });

      // Update sort order for manual factors
      const manualUpdates = manualFactors.map((f) => {
        const order = sortOrder++;
        return db.mefiFactor.update({
          where: { id: f.id },
          data: { sortOrder: order, weight: defaultWeight, score: defaultWeight * f.rating },
        });
      });

      await Promise.all([...creates, ...manualUpdates]);

      // Upsert MEFI state
      await db.mefiState.upsert({
        where: { cycleId: input.cycleId },
        create: { cycleId: input.cycleId, status: "en_construccion", organizationId: ctx.organizationId },
        update: { organizationId: ctx.organizationId },
      });

      return { imported: newFactors.length, manual: manualFactors.length };
    }),

  // Legacy import (keep for backwards compat)
  importFromAmofhit: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const areas = await db.amofhitArea.findMany({
        where: { cycleId: input.cycleId },
      });

      const items: Array<{ description: string; type: "F" | "D"; area: string }> = [];
      for (const area of areas) {
        const findings = JSON.parse(area.findings) as Array<{
          description?: string;
          type?: string;
        }>;
        if (!Array.isArray(findings)) continue;
        for (const f of findings) {
          if (!f.description || !f.type) continue;
          const type = f.type === "fortaleza" ? "F" : "D";
          items.push({ description: f.description, type, area: area.area });
        }
      }

      if (items.length === 0) return { count: 0 };

      const defaultWeight = 1 / items.length;
      const existingCount = await db.mefiFactor.count({
        where: { cycleId: input.cycleId },
      });

      const creates = items.map((item, i) => {
        const rating = item.type === "F" ? 3 : 2;
        return db.mefiFactor.create({
          data: {
            cycleId: input.cycleId,
            description: item.description,
            type: item.type,
            weight: defaultWeight,
            rating,
            score: defaultWeight * rating,
            area: item.area,
            sortOrder: existingCount + i,
            organizationId: ctx.organizationId,
          },
        });
      });

      await Promise.all(creates);
      return { count: items.length };
    }),

  // Create a manual factor
  create: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        description: z.string().min(1),
        type: z.enum(["F", "D"]),
        weight: z.number().min(0.01).max(0.30),
        rating: z.number().int().min(1).max(4),
        area: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const count = await db.mefiFactor.count({ where: { cycleId: input.cycleId } });

      // Business rule: max 20 factors
      if (count >= 20) {
        throw new Error("No se pueden tener mas de 20 factores en la MEFI");
      }

      const score = input.weight * input.rating;
      return db.mefiFactor.create({
        data: {
          ...input,
          score,
          sortOrder: count,
          originalDescription: input.description,
          organizationId: ctx.organizationId,
        },
      });
    }),

  // Update a factor (weight, rating, description)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string().min(1).optional(),
        type: z.enum(["F", "D"]).optional(),
        weight: z.number().min(0.01).max(0.30).optional(),
        rating: z.number().int().min(1).max(4).optional(),
        area: z.string().optional(),
        sortOrder: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const record = await db.mefiFactor.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      const weight = data.weight ?? record.weight;
      const rating = data.rating ?? record.rating;
      return db.mefiFactor.update({
        where: { id },
        data: { ...data, score: weight * rating },
      });
    }),

  // Delete a factor
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await db.mefiFactor.findUniqueOrThrow({
        where: { id: input.id },
        include: { cycle: { select: { organizationId: true } } },
      });
      if (record.cycle.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      return db.mefiFactor.delete({ where: { id: input.id } });
    }),

  // Finalize MEFI
  finalize: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const factors = await db.mefiFactor.findMany({
        where: { cycleId: input.cycleId },
      });

      // Validations
      if (factors.length < 5) {
        throw new Error("La MEFI debe tener al menos 5 factores para finalizarse");
      }
      if (factors.length > 20) {
        throw new Error("La MEFI no puede tener mas de 20 factores");
      }

      const fortalezas = factors.filter((f) => f.type === "F").length;
      const debilidades = factors.filter((f) => f.type === "D").length;
      if (fortalezas === 0 || debilidades === 0) {
        throw new Error("La MEFI debe tener al menos 1 fortaleza y 1 debilidad");
      }

      const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
      if (Math.abs(totalWeight - 1) > 0.005) {
        throw new Error(`La suma de pesos debe ser 1.00 (actual: ${totalWeight.toFixed(3)})`);
      }

      const ppt = factors.reduce((sum, f) => sum + f.score, 0);

      await db.mefiState.upsert({
        where: { cycleId: input.cycleId },
        create: {
          cycleId: input.cycleId,
          status: "finalizada",
          pptFinal: ppt,
          finalizedAt: new Date(),
          finalizedBy: ctx.userId,
          organizationId: ctx.organizationId,
        },
        update: {
          status: "finalizada",
          pptFinal: ppt,
          finalizedAt: new Date(),
          finalizedBy: ctx.userId,
          organizationId: ctx.organizationId,
        },
      });

      return { ppt, count: factors.length };
    }),

  // Unlock (reopen) MEFI
  unlock: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .mutation(async ({ input }) => {
      await db.mefiState.update({
        where: { cycleId: input.cycleId },
        data: { status: "lista_para_ajuste", pptFinal: null, finalizedAt: null },
      });
    }),

  // Get factors formatted for FODA cruzado
  getForFoda: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const factors = await db.mefiFactor.findMany({
        where: { cycleId: input.cycleId },
        orderBy: { score: "desc" },
      });

      const fortalezas = factors
        .filter((f) => f.type === "F")
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5)
        .map((f) => ({
          id: f.sourceVariableId ?? f.id,
          texto: f.description,
          score: f.rating,
        }));

      const debilidades = factors
        .filter((f) => f.type === "D")
        .sort((a, b) => a.rating - b.rating)
        .slice(0, 5)
        .map((f) => ({
          id: f.sourceVariableId ?? f.id,
          texto: f.description,
          score: f.rating,
        }));

      return { fortalezas, debilidades };
    }),

  // Get area synthesis
  getAreaSynthesis: cycleProcedure
    .input(z.object({ cycleId: z.string(), area: z.string() }))
    .query(async ({ input }) => {
      const syntheses = await db.areaSynthesis.findMany({
        where: { cycleId: input.cycleId, area: input.area },
        orderBy: { version: "desc" },
      });
      return syntheses;
    }),

  // Save area synthesis (from AI or manual)
  saveAreaSynthesis: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        area: z.string(),
        text: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Check version limit (max 5 per area)
      const existing = await db.areaSynthesis.findMany({
        where: { cycleId: input.cycleId, area: input.area },
        orderBy: { version: "desc" },
      });

      if (existing.length >= 5) {
        throw new Error("Se alcanzo el limite de 5 versiones de sintesis para esta area");
      }

      const nextVersion = existing.length > 0 ? existing[0].version + 1 : 1;

      return db.areaSynthesis.create({
        data: {
          cycleId: input.cycleId,
          area: input.area,
          text: input.text,
          version: nextVersion,
          organizationId: ctx.organizationId,
        },
      });
    }),

  // Get internal report
  getInternalReport: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const report = await db.internalReport.findFirst({
        where: { cycleId: input.cycleId },
        orderBy: { version: "desc" },
      });
      if (!report) return null;
      return {
        ...report,
        principalesFortalezas: JSON.parse(report.principalesFortalezas) as string[],
        principalesDebilidades: JSON.parse(report.principalesDebilidades) as string[],
      };
    }),

  // Save internal report
  saveInternalReport: cycleProcedure
    .input(
      z.object({
        cycleId: z.string(),
        diagnosticoGeneral: z.string(),
        principalesFortalezas: z.array(z.string()),
        principalesDebilidades: z.array(z.string()),
        patronesTransversales: z.string(),
        implicanciasFormulacion: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await db.internalReport.findMany({
        where: { cycleId: input.cycleId },
        orderBy: { version: "desc" },
      });
      const nextVersion = existing.length > 0 ? existing[0].version + 1 : 1;

      return db.internalReport.create({
        data: {
          cycleId: input.cycleId,
          diagnosticoGeneral: input.diagnosticoGeneral,
          principalesFortalezas: JSON.stringify(input.principalesFortalezas),
          principalesDebilidades: JSON.stringify(input.principalesDebilidades),
          patronesTransversales: input.patronesTransversales,
          implicanciasFormulacion: input.implicanciasFormulacion,
          version: nextVersion,
          organizationId: ctx.organizationId,
        },
      });
    }),
});
