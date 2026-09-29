import { z } from "zod";
import { router, cycleProcedure, cycleEditorProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";

export const peiRouter = router({
  // getDocument: agregador que lee TODO el ciclo (M1, M2, M3) y lo entrega consolidado
  getDocument: cycleProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ input }) => {
      const cycleId = input.cycleId;
      const [
        cycle, peiDoc, vision, mission, values, interests,
        pestec, porter, mpcCompetitors, attractiveness, amofhitAreas, mefiFactors, mefeFactors, mefiState, mefeState,
        olps, consolidated, ethicsEvals, rumeltEvals,
      ] = await Promise.all([
        db.strategicCycle.findUnique({ where: { id: cycleId }, include: { organization: { select: { name: true, sector: true } } } }),
        db.peiDocument.findUnique({ where: { cycleId } }),
        db.vision.findFirst({ where: { cycleId }, orderBy: { createdAt: "desc" } }),
        db.mission.findFirst({ where: { cycleId }, orderBy: { createdAt: "desc" } }),
        db.value.findMany({ where: { cycleId }, orderBy: { sortOrder: "asc" } }),
        db.interest.findMany({ where: { cycleId }, orderBy: { createdAt: "asc" } }),
        db.pestecFactor.findMany({ where: { cycleId, confirmed: true } }),
        db.porterAnalysis.findUnique({ where: { cycleId } }),
        db.mpcCompetitor.findMany({ where: { cycleId }, orderBy: { totalScore: "desc" } }),
        db.industryAttractiveness.findUnique({ where: { cycleId } }),
        db.amofhitArea.findMany({ where: { cycleId } }),
        db.mefiFactor.findMany({ where: { cycleId } }),
        db.mefeFactor.findMany({ where: { cycleId } }),
        db.mefiState.findUnique({ where: { cycleId } }),
        db.mefeState.findUnique({ where: { cycleId } }),
        db.olp.findMany({ where: { cycleId }, orderBy: { sortOrder: "asc" } }),
        db.consolidatedStrategy.findMany({
          where: { cycleId },
          orderBy: { sortOrder: "asc" },
          include: { olpLinks: true, origins: true },
        }),
        db.ethicsEvaluation.findMany({ where: { cycleId }, include: { principles: true, mitigants: { include: { principle: true } } } }),
        db.rumeltEvaluation.findMany({ where: { cycleId } }),
      ]);

      // FODA Consolidado con codigos
      let fIdx = 0, dIdx = 0, oIdx = 0, aIdx = 0;
      const fortalezas = mefiFactors.filter((f) => f.type === "F").map((f) => ({ id: f.id, code: `F${++fIdx}`, text: f.description, weight: f.weight, rating: f.rating, score: f.score }));
      const debilidades = mefiFactors.filter((f) => f.type === "D").map((f) => ({ id: f.id, code: `D${++dIdx}`, text: f.description, weight: f.weight, rating: f.rating, score: f.score }));
      const oportunidades = mefeFactors.filter((f) => f.type === "O").map((f) => ({ id: f.id, code: `O${++oIdx}`, text: f.description, weight: f.weight, rating: f.rating, score: f.score }));
      const amenazas = mefeFactors.filter((f) => f.type === "A").map((f) => ({ id: f.id, code: `A${++aIdx}`, text: f.description, weight: f.weight, rating: f.rating, score: f.score }));

      // OLPs con cobertura
      const olpsEnriched = olps.map((o, i) => {
        const coverage = consolidated.filter((c) => c.olpLinks.some((l) => l.olpId === o.id)).length;
        return { ...o, olpCode: `OLP${i + 1}`, coverage };
      });

      // Estrategias retenidas finales
      const ethicsMap = new Map(ethicsEvals.map((e) => [e.consolidatedId, e]));
      const rumeltMap = new Map(rumeltEvals.map((e) => [e.consolidatedId, e]));
      const retained = consolidated.filter((c) => {
        const e = ethicsMap.get(c.id);
        const r = rumeltMap.get(c.id);
        const ethicsOk = e && (e.finalVerdict === "aprobada" || e.finalVerdict === "aprobada_con_mitigantes");
        const rumeltOk = r && (r.status === "aprobada" || r.status === "aprobada_manual");
        return ethicsOk && rumeltOk && c.status !== "descartada";
      }).map((c, i) => ({
        ...c,
        eCode: c.code ?? `E${i + 1}`,
        ethicsStatus: ethicsMap.get(c.id)?.finalVerdict ?? null,
        isEjemplar: (ethicsMap.get(c.id)?.principles.filter((p) => p.rating === "promueve").length ?? 0) >= 3 && (ethicsMap.get(c.id)?.principles.filter((p) => p.rating === "viola").length ?? 0) === 0,
      }));

      // Mitigantes
      const mitigants: Array<{ strategyCode: string; strategyId: string; principleLabel: string; text: string; responsible: string; deadline: string; indicator: string }> = [];
      for (const c of consolidated) {
        const ev = ethicsMap.get(c.id);
        if (!ev) continue;
        for (const m of ev.mitigants) {
          mitigants.push({
            strategyCode: c.code ?? "",
            strategyId: c.id,
            principleLabel: m.principle.principleKey,
            text: m.text,
            responsible: m.responsible,
            deadline: m.deadline,
            indicator: m.indicator,
          });
        }
      }

      // Completitud (M1 + M2 + M3 = 60-70%, M4 + M5 sumarian)
      const checks = {
        m1_vision: !!vision,
        m1_mission: !!mission,
        m1_values: values.length > 0,
        m2_pestec: pestec.length > 0,
        m2_porter: !!porter,
        m2_attractiveness: !!attractiveness,
        m2_amofhit: amofhitAreas.length > 0,
        m2_mefi: mefiFactors.length > 0,
        m2_mefe: mefeFactors.length > 0,
        m3_olps: olps.length > 0,
        m3_consolidated: consolidated.length > 0,
        m3_retained: retained.length > 0,
        // M4 y M5 sin datos aun
      };
      const completedChecks = Object.values(checks).filter(Boolean).length;
      const totalChecks = Object.keys(checks).length + 2; // +2 por M4 y M5
      const completionPct = Math.round((completedChecks / totalChecks) * 100);

      // Resumen ejecutivo auto-generado
      const autoSummary = generateExecutiveSummary({
        orgName: cycle?.organization?.name ?? "Tu empresa",
        visionText: vision?.text ?? null,
        visionYear: vision?.timeHorizon ?? null,
        olpCount: olps.length,
        retainedCount: retained.length,
        retainedTotal: consolidated.length,
        mitigantsCount: mitigants.length,
        sector: cycle?.organization?.sector ?? null,
      });

      return {
        cycle: cycle ? {
          id: cycle.id, name: cycle.name, yearStart: cycle.yearStart, yearEnd: cycle.yearEnd,
          orgName: cycle.organization?.name ?? "—",
          sector: cycle.organization?.sector ?? null,
        } : null,
        peiDoc,
        executiveSummary: peiDoc?.customExecutiveSummary ?? autoSummary,
        autoSummary,
        completionPct,
        m1: {
          vision: vision ? { text: vision.text, timeHorizon: vision.timeHorizon } : null,
          mission: mission ? { text: mission.text } : null,
          values: values.map((v) => ({ id: v.id, name: v.name, description: v.description })),
          interests: interests.map((i) => ({ id: i.id, description: i.description })),
        },
        m2: {
          pestec: pestec.map((p) => ({ id: p.id, variable: p.variable, type: p.type, rating: p.rating, hallazgo: p.hallazgo })),
          porter: porter ? { overallScore: porter.overallScore, data: porter.data } : null,
          mpc: mpcCompetitors.slice(0, 5).map((c) => ({ id: c.id, name: c.name, isOwnOrg: c.isOwnOrg, totalScore: c.totalScore })),
          attractiveness: attractiveness ? { data: attractiveness.data } : null,
          amofhit: amofhitAreas.map((a) => ({ id: a.id, area: a.area, score: a.score, findings: a.findings })),
          mefiPpt: mefiState?.pptFinal ?? mefiFactors.reduce((s, f) => s + f.score, 0),
          mefePpt: mefeState?.pptFinal ?? mefeFactors.reduce((s, f) => s + f.score, 0),
          foda: { fortalezas, oportunidades, debilidades, amenazas },
        },
        m3: {
          olps: olpsEnriched,
          retained,
          mitigants,
        },
        checks,
      };
    }),

  updateSummary: cycleEditorProcedure
    .input(z.object({ cycleId: z.string(), customSummary: z.string().nullable() }))
    .mutation(async ({ input }) => {
      return db.peiDocument.upsert({
        where: { cycleId: input.cycleId },
        create: { cycleId: input.cycleId, customExecutiveSummary: input.customSummary },
        update: { customExecutiveSummary: input.customSummary },
      });
    }),

  markExported: cycleEditorProcedure
    .input(z.object({ cycleId: z.string() }))
    .mutation(async ({ input }) => {
      return db.peiDocument.upsert({
        where: { cycleId: input.cycleId },
        create: { cycleId: input.cycleId, lastExportedAt: new Date() },
        update: { lastExportedAt: new Date() },
      });
    }),
});

function generateExecutiveSummary(ctx: {
  orgName: string; visionText: string | null; visionYear: number | null;
  olpCount: number; retainedCount: number; retainedTotal: number; mitigantsCount: number;
  sector: string | null;
}): string {
  const parts: string[] = [];
  parts.push(`${ctx.orgName} se proyecta`);
  if (ctx.visionYear) parts.push(`al ${ctx.visionYear}`);
  if (ctx.sector) parts.push(`en el sector ${ctx.sector}`);
  parts.push("con un plan estrategico que articula");
  if (ctx.olpCount > 0) parts.push(`${ctx.olpCount} Objetivos de Largo Plazo distribuidos en distintas dimensiones del negocio,`);
  if (ctx.retainedCount > 0 && ctx.retainedTotal > 0) parts.push(`${ctx.retainedCount} estrategias retenidas de ${ctx.retainedTotal} evaluadas,`);
  parts.push("validadas por convergencia entre matrices, atractivo cuantitativo, viabilidad estrategica y solidez etica.");
  if (ctx.mitigantsCount > 0) parts.push(`El plan incluye ${ctx.mitigantsCount} mitigante(s) etico(s) comprometido(s) con responsable y plazo.`);
  return parts.join(" ");
}
