import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, cycleProcedure, cycleEditorProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";
import { defaultConfig, parseConfig } from "@/lib/presentation";
import { celdaFromScores, regionFromCell, cellMeaning } from "@/lib/ie-catalog";
import { QUADRANT_INFO } from "@/lib/peyea-catalog";

const safeJson = <T,>(raw: string | null | undefined, fallback: T): T => {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const ownPresentation = async (cycleId: string, id: string) => {
  const p = await db.presentation.findFirst({ where: { id, cycleId } });
  if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Presentación no encontrada" });
  return p;
};

export const presentationRouter = router({
  list: cycleProcedure.input(z.object({ cycleId: z.string() })).query(async ({ input }) => {
    const rows = await db.presentation.findMany({ where: { cycleId: input.cycleId }, orderBy: { createdAt: "asc" } });
    return rows.map((r) => ({ id: r.id, name: r.name, updatedAt: r.updatedAt }));
  }),

  get: cycleProcedure.input(z.object({ cycleId: z.string(), id: z.string() })).query(async ({ input }) => {
    const p = await ownPresentation(input.cycleId, input.id);
    return { id: p.id, name: p.name, config: parseConfig(p.config), updatedAt: p.updatedAt };
  }),

  create: cycleEditorProcedure
    .input(z.object({ cycleId: z.string(), name: z.string().min(1).max(120), copyFrom: z.string().optional() }))
    .mutation(async ({ input }) => {
      const source = input.copyFrom ? await ownPresentation(input.cycleId, input.copyFrom) : null;
      const p = await db.presentation.create({
        data: { cycleId: input.cycleId, name: input.name, config: source?.config ?? JSON.stringify(defaultConfig()) },
      });
      return { id: p.id };
    }),

  update: cycleEditorProcedure
    .input(z.object({ cycleId: z.string(), id: z.string(), name: z.string().min(1).max(120).optional(), config: z.string().max(200_000).optional() }))
    .mutation(async ({ input }) => {
      await ownPresentation(input.cycleId, input.id);
      if (input.config) parseConfig(input.config); // valida que sea JSON utilizable
      const p = await db.presentation.update({
        where: { id: input.id },
        data: { ...(input.name ? { name: input.name } : {}), ...(input.config ? { config: input.config } : {}) },
      });
      return { updatedAt: p.updatedAt };
    }),

  remove: cycleEditorProcedure.input(z.object({ cycleId: z.string(), id: z.string() })).mutation(async ({ input }) => {
    await ownPresentation(input.cycleId, input.id);
    await db.presentation.delete({ where: { id: input.id } });
    return { ok: true };
  }),

  // Todo lo que necesitan las láminas automáticas, en una sola consulta.
  data: cycleProcedure.input(z.object({ cycleId: z.string() })).query(async ({ ctx, input }) => {
    const cycleId = input.cycleId;
    const [
      cycle, user, vision, mission, values, pestec, porter, mefe, mefi, mefeState, mefiState, mpcDefs, mpcComp, strategies,
      peyea, matrixStates, consolidated, mcpeRatings, olps, ocps, kpis, pei,
    ] = await Promise.all([
      db.strategicCycle.findUnique({ where: { id: cycleId }, include: { organization: true } }),
      db.user.findUnique({ where: { id: ctx.userId }, select: { name: true } }),
      db.vision.findFirst({ where: { cycleId, isActive: true }, orderBy: { createdAt: "desc" } }),
      db.mission.findFirst({ where: { cycleId }, orderBy: { createdAt: "desc" } }),
      db.value.findMany({ where: { cycleId }, orderBy: { sortOrder: "asc" } }),
      db.pestecFactor.findMany({ where: { cycleId, confirmed: true }, orderBy: [{ impact: "desc" }, { sortOrder: "asc" }] }),
      db.porterAnalysis.findUnique({ where: { cycleId } }),
      db.mefeFactor.findMany({ where: { cycleId }, orderBy: [{ type: "asc" }, { sortOrder: "asc" }] }),
      db.mefiFactor.findMany({ where: { cycleId }, orderBy: [{ type: "asc" }, { sortOrder: "asc" }] }),
      db.mefeState.findUnique({ where: { cycleId } }),
      db.mefiState.findUnique({ where: { cycleId } }),
      db.mpcFactorDef.findMany({ where: { cycleId }, orderBy: { sortOrder: "asc" } }),
      db.mpcCompetitor.findMany({ where: { cycleId }, orderBy: { sortOrder: "asc" }, include: { scores: true } }),
      db.strategy.findMany({ where: { cycleId, crossType: { in: ["FO", "FA", "DO", "DA"] } }, orderBy: { sortOrder: "asc" }, include: { origins: true } }),
      db.peyeaAnalysis.findUnique({ where: { cycleId } }),
      db.matrixState.findMany({ where: { cycleId } }),
      db.consolidatedStrategy.findMany({ where: { cycleId }, orderBy: { sortOrder: "asc" }, include: { olpLinks: true } }),
      db.mcpeRating.findMany({ where: { analysis: { cycleId } }, select: { consolidatedId: true, pta: true } }),
      db.olp.findMany({ where: { cycleId }, orderBy: { sortOrder: "asc" } }),
      db.ocp.findMany({ where: { cycleId }, orderBy: [{ year: "asc" }, { sortOrder: "asc" }], include: { actions: { orderBy: { sortOrder: "asc" } }, responsibleArea: { select: { name: true } } } }),
      db.kpi.findMany({ where: { cycleId }, orderBy: { sortOrder: "asc" }, include: { periods: true } }),
      db.peiDocument.findUnique({ where: { cycleId } }),
    ]);
    if (!cycle) throw new TRPCError({ code: "NOT_FOUND" });

    const ppt = (list: { score: number | null }[]) => Math.round(list.reduce((a, f) => a + (f.score ?? 0), 0) * 100) / 100;
    const mefePpt = mefeState?.pptFinal ?? ppt(mefe);
    const mefiPpt = mefiState?.pptFinal ?? ppt(mefi);
    const withCodes = <T extends { type: string }>(list: T[]) => {
      const n: Record<string, number> = {};
      return list.map((f) => ({ ...f, code: `${f.type}${(n[f.type] = (n[f.type] ?? 0) + 1)}` }));
    };
    const mefeC = withCodes(mefe).map((f) => ({ code: f.code, type: f.type, description: f.description, weight: f.weight, rating: f.rating, score: f.score }));
    const mefiC = withCodes(mefi).map((f) => ({ code: f.code, type: f.type, description: f.description, weight: f.weight, rating: f.rating, score: f.score }));

    const ieCell = mefe.length && mefi.length ? celdaFromScores(mefiPpt, mefePpt) : null;
    const bcgRaw = safeJson<{ productos?: { nombre: string; ventasPropias: string; ventasLider: string; mercadoActual: string; mercadoAnterior: string }[]; cortoY?: string; cortoX?: string; moneda?: string; unidades?: string; empresa?: string }>(
      matrixStates.find((m) => m.kind === "bcg")?.data, {},
    );
    const cortoY = Number(bcgRaw.cortoY ?? 10);
    const cortoX = Number(bcgRaw.cortoX ?? 1);
    const bcg = (bcgRaw.productos ?? []).map((p) => {
      const own = Number(p.ventasPropias) || 0;
      const lider = Number(p.ventasLider) || 0;
      const act = Number(p.mercadoActual) || 0;
      const ant = Number(p.mercadoAnterior) || 0;
      const share = lider > 0 ? own / lider : 0;
      const growth = ant > 0 ? ((act - ant) / ant) * 100 : 0;
      const quadrant = growth >= cortoY ? (share >= cortoX ? "Estrella" : "Interrogante") : share >= cortoX ? "Vaca lechera" : "Perro";
      return { name: p.nombre, sales: own, share: Math.round(share * 100) / 100, growth: Math.round(growth * 10) / 10, quadrant };
    });

    const mcpeTotals = new Map<string, number>();
    for (const r of mcpeRatings) mcpeTotals.set(r.consolidatedId, (mcpeTotals.get(r.consolidatedId) ?? 0) + (r.pta ?? 0));
    const olpCode = new Map(olps.map((o, i) => [o.id, `OLP${i + 1}`]));
    const ranking = consolidated
      .filter((c) => c.status !== "descartada")
      .map((c) => ({
        code: c.code, text: c.text, status: c.status, appearances: c.totalAppearances, responsible: c.responsible,
        score: Math.round((mcpeTotals.get(c.id) ?? c.priorityScore ?? 0) * 100) / 100,
        olps: c.olpLinks.map((l) => olpCode.get(l.olpId)).filter(Boolean) as string[],
      }))
      .sort((a, b) => b.score - a.score);

    const lastReal = (periods: { period: string; realValue: number | null }[]) =>
      [...periods].filter((p) => p.realValue != null).sort((a, b) => b.period.localeCompare(a.period))[0] ?? null;
    const kpiRows = kpis.map((k) => {
      const lr = lastReal(k.periods);
      const lastMeta = [...k.periods].sort((a, b) => b.period.localeCompare(a.period))[0];
      const cur = lr ? k.periods.find((p) => p.period === lr.period) : null;
      return {
        code: k.code, name: k.name, unit: k.unit, dimension: k.dimensionBsc, direction: k.direction,
        real: lr?.realValue ?? null, period: lr?.period ?? null, semaforo: cur?.semaforoActual ?? "sin_dato",
        finalMeta: lastMeta?.metaGreen ?? null, finalPeriod: lastMeta?.period ?? null, responsible: k.responsibleRole,
      };
    });

    const projects = await db.project.findMany({
      where: { orgId: cycle.organizationId, ocp: { cycleId } },
      include: { ocp: { select: { code: true, year: true, priority: true, olpId: true } }, _count: { select: { issues: true } } },
      orderBy: { createdAt: "asc" },
    });
    const prioRank: Record<string, number> = { alta: 0, media: 1, baja: 2 };
    const projectRows = projects
      .map((p) => ({ key: p.key, name: p.name, year: p.ocp?.year ?? null, ocp: p.ocp?.code ?? null, olp: p.ocp ? olpCode.get(p.ocp.olpId) ?? null : null, priority: p.ocp?.priority ?? "media", status: p.status, tasks: p._count.issues }))
      .sort((a, b) => (prioRank[a.priority] ?? 1) - (prioRank[b.priority] ?? 1) || (a.year ?? 0) - (b.year ?? 0));

    const peyeaQuadrant = peyea?.quadrant as keyof typeof QUADRANT_INFO | undefined;
    return {
      org: { name: cycle.organization.name, sector: cycle.organization.sector, color: cycle.organization.color, logoUrl: cycle.organization.logoUrl },
      cycle: { name: cycle.name, yearStart: cycle.yearStart, yearEnd: cycle.yearEnd },
      presenter: user?.name ?? null,
      summary: pei?.customExecutiveSummary ?? null,
      vision: vision ? { text: vision.text, horizon: vision.timeHorizon } : null,
      mission: mission?.text ?? null,
      values: values.map((v) => ({ name: v.name, description: v.description, behaviors: v.behaviors })),
      pestec: pestec.map((p) => ({ variable: p.variable, name: p.description, type: p.type, impact: p.impact, rating: p.rating, hallazgo: p.hallazgo })),
      porter: porter ? { overall: porter.overallScore, forces: safeJson<{ forces?: Record<string, { values: Record<string, number> }> }>(porter.data, {}).forces ?? {} } : null,
      mefe: { ppt: mefePpt, factors: mefeC },
      mefi: { ppt: mefiPpt, factors: mefiC },
      mpc: {
        factors: mpcDefs.map((f) => ({ id: f.id, name: f.name, weight: f.weight })),
        competitors: mpcComp.map((c) => ({ name: c.name, own: c.isOwnOrg, total: c.totalScore ?? 0, ratings: Object.fromEntries(c.scores.map((s) => [s.factorDefId, s.rating])) })),
      },
      foda: {
        F: mefiC.filter((f) => f.type === "F"), D: mefiC.filter((f) => f.type === "D"),
        O: mefeC.filter((f) => f.type === "O"), A: mefeC.filter((f) => f.type === "A"),
      },
      crossStrategies: strategies.map((s) => ({ code: s.code, quadrant: s.crossType, text: s.description, origins: s.origins.map((o) => o.factorCode).filter(Boolean) as string[] })),
      peyea: peyea
        ? { x: peyea.vectorX ?? 0, y: peyea.vectorY ?? 0, quadrant: peyea.quadrant, label: (peyeaQuadrant && QUADRANT_INFO[peyeaQuadrant]?.label) || peyea.quadrant || "—" }
        : null,
      ie: ieCell ? { cell: ieCell, region: regionFromCell(ieCell), meaning: cellMeaning(ieCell), mefi: mefiPpt, mefe: mefePpt } : null,
      bcg: { products: bcg, currency: bcgRaw.moneda ?? "", units: bcgRaw.unidades ?? "", note: bcgRaw.empresa ?? "" },
      ranking,
      olps: olps.map((o, i) => ({ code: `OLP${i + 1}`, text: o.description, metric: o.metric, current: o.currentValue, target: o.targetValue, unit: o.unit, perspective: o.bscPerspective, responsible: o.responsible, year: o.targetYear, priority: o.priority })),
      ocps: ocps.map((o) => ({ code: o.code, year: o.year, text: o.description, olp: olpCode.get(o.olpId) ?? null, area: o.responsibleArea?.name ?? null, priority: o.priority, status: o.status, actions: o.actions.map((a) => ({ quarter: a.quarter, text: a.description, status: a.status })) })),
      kpis: kpiRows,
      projects: projectRows,
    };
  }),
});
