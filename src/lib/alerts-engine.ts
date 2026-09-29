import { db } from "@/server/db";
import {
  ALERT_TYPES,
  getAlertTypeDef,
  type AlertType,
  type Priority,
  type AlertStatus,
} from "./alerts-catalog";

// Re-export para que callers no tengan que importar de dos sitios
export { ALERT_TYPES, getAlertTypeDef };
export type { AlertType, Priority, AlertStatus };

// ───────────────────────────────────────────────────────────────────────
// Seed reglas por defecto del cycle
// ───────────────────────────────────────────────────────────────────────

export async function ensureDefaultRules(cycleId: string): Promise<{ created: number }> {
  const existing = await db.alertRule.findMany({
    where: { cycleId, isDefault: true },
    select: { type: true },
  });
  const existingTypes = new Set(existing.map((r) => r.type));
  let created = 0;
  for (const def of ALERT_TYPES.filter((t) => t.key !== "personalizada")) {
    if (existingTypes.has(def.key)) continue;
    await db.alertRule.create({
      data: {
        cycleId,
        type: def.key,
        name: def.defaultRuleName,
        active: true,
        configuration: JSON.stringify(def.defaultConfig),
        appliesTo: "todos",
        appliesToIds: "[]",
        defaultPriority: def.defaultPriority,
        notifyTo: JSON.stringify(["responsible"]),
        channels: JSON.stringify(["in_app"]),
        isDefault: true,
      },
    });
    created++;
  }
  return { created };
}

// ───────────────────────────────────────────────────────────────────────
// Helpers comunes
// ───────────────────────────────────────────────────────────────────────

function buildDedupeKey(type: AlertType, objectType: string, objectId: string): string {
  return `${type}::${objectType}::${objectId}`;
}

async function findActiveAlert(
  cycleId: string,
  dedupeKey: string,
): Promise<{ id: string; status: string } | null> {
  return db.alert.findFirst({
    where: {
      cycleId,
      dedupeKey,
      status: { in: ["activa", "en_seguimiento", "reactivada"] },
    },
    select: { id: true, status: true },
  });
}

async function findRule(
  cycleId: string,
  type: AlertType,
): Promise<{ id: string; active: boolean; configuration: string; defaultPriority: string; notifyTo: string } | null> {
  return db.alertRule.findFirst({
    where: { cycleId, type, active: true },
    select: {
      id: true,
      active: true,
      configuration: true,
      defaultPriority: true,
      notifyTo: true,
    },
  });
}

async function ruleApplies(
  rule: { configuration: string },
  kpiId: string,
  cycleId: string,
): Promise<boolean> {
  void rule;
  void kpiId;
  void cycleId;
  return true; // simplificado por ahora: aplica a todos los KPIs/OLPs/OCPs
}

interface CreateAlertParams {
  cycleId: string;
  organizationId: string;
  type: AlertType;
  title: string;
  description: string;
  priority: Priority;
  objectType: "kpi" | "olp" | "ocp";
  objectId: string;
  ruleId: string | null;
  contextData: Record<string, unknown>;
  assigneeId?: string | null;
}

async function upsertAlert(params: CreateAlertParams): Promise<{ id: string; created: boolean }> {
  const dedupeKey = buildDedupeKey(params.type, params.objectType, params.objectId);
  const existing = await findActiveAlert(params.cycleId, dedupeKey);
  if (existing) {
    // Actualizar timestamp pero NO crear duplicado
    await db.alert.update({
      where: { id: existing.id },
      data: {
        contextData: JSON.stringify(params.contextData),
        updatedAt: new Date(),
      },
    });
    return { id: existing.id, created: false };
  }

  // Si hay alerta resuelta/ignorada con mismo dedupeKey antigua: marcar como reactivada
  const previouslyResolved = await db.alert.findFirst({
    where: {
      cycleId: params.cycleId,
      dedupeKey,
      status: { in: ["resuelta", "ignorada"] },
    },
    orderBy: { resolvedAt: "desc" },
    select: { id: true },
  });
  const initialStatus: AlertStatus = previouslyResolved ? "reactivada" : "activa";

  const created = await db.alert.create({
    data: {
      organizationId: params.organizationId,
      cycleId: params.cycleId,
      type: params.type,
      title: params.title,
      description: params.description,
      priority: params.priority,
      status: initialStatus,
      objectType: params.objectType,
      objectId: params.objectId,
      ruleId: params.ruleId,
      contextData: JSON.stringify(params.contextData),
      assigneeId: params.assigneeId ?? null,
      assignedAt: params.assigneeId ? new Date() : null,
      dedupeKey,
    },
  });

  await db.alertAction.create({
    data: {
      alertId: created.id,
      actionType: "generada",
      data: JSON.stringify({ type: params.type, dedupeKey }),
    },
  });

  if (params.ruleId) {
    await db.alertRule.update({
      where: { id: params.ruleId },
      data: {
        triggerCount: { increment: 1 },
        lastTriggeredAt: new Date(),
      },
    });
  }

  return { id: created.id, created: true };
}

function direction(kpiDirection: string): "mayor_mejor" | "menor_mejor" | "objetivo_puntual" {
  return kpiDirection === "menor_mejor"
    ? "menor_mejor"
    : kpiDirection === "objetivo_puntual"
    ? "objetivo_puntual"
    : "mayor_mejor";
}

function isWorseThan(
  a: number,
  b: number,
  dir: "mayor_mejor" | "menor_mejor" | "objetivo_puntual",
): boolean {
  if (dir === "menor_mejor") return a > b;
  return a < b;
}

// ───────────────────────────────────────────────────────────────────────
// Detección por KPI: se llama al recibir un valor
// ───────────────────────────────────────────────────────────────────────

export async function evaluateForKpi(
  kpiId: string,
  triggerPeriod: string,
): Promise<{ generated: number; alertIds: string[] }> {
  const kpi = await db.kpi.findUnique({
    where: { id: kpiId },
    include: {
      periods: { orderBy: { period: "asc" } },
      responsibleArea: { select: { id: true } },
      olps: { include: { olp: { select: { id: true, description: true, targetValue: true } } } },
      ocps: { include: { ocp: { select: { id: true, code: true } } } },
    },
  });
  if (!kpi) return { generated: 0, alertIds: [] };

  const dir = direction(kpi.direction);
  const triggered: string[] = [];

  // ─── Regla 1: semáforo crítico ──────────────────────────────
  const triggerPeriodData = kpi.periods.find((p) => p.period === triggerPeriod);
  const semCriticoRule = await findRule(kpi.cycleId, "semaforo_critico");
  if (semCriticoRule && triggerPeriodData?.semaforoActual === "rojo") {
    if (await ruleApplies(semCriticoRule, kpiId, kpi.cycleId)) {
      const r = await upsertAlert({
        cycleId: kpi.cycleId,
        organizationId: kpi.organizationId,
        type: "semaforo_critico",
        title: `KPI ${kpi.name} en estado crítico`,
        description: `${kpi.code} cerró ${triggerPeriod} con valor ${triggerPeriodData.realValue ?? "—"} (meta ${triggerPeriodData.metaGreen ?? "—"}). Semáforo: rojo.`,
        priority: (semCriticoRule.defaultPriority ?? "alta") as Priority,
        objectType: "kpi",
        objectId: kpi.id,
        ruleId: semCriticoRule.id,
        contextData: {
          kpiCode: kpi.code,
          period: triggerPeriod,
          realValue: triggerPeriodData.realValue,
          metaGreen: triggerPeriodData.metaGreen,
          metaRed: triggerPeriodData.metaRed,
        },
      });
      if (r.created) triggered.push(r.id);
    }
  }

  // ─── Regla 2: tendencia negativa sostenida ──────────────────
  const tendRule = await findRule(kpi.cycleId, "tendencia_negativa");
  if (tendRule) {
    const config = JSON.parse(tendRule.configuration || "{}") as {
      consecutivePeriods?: number;
    };
    const N = config.consecutivePeriods ?? 3;
    const periodsWithData = kpi.periods
      .filter((p) => p.realValue != null)
      .slice(-(N + 1));
    if (periodsWithData.length >= N + 1) {
      let allWorsening = true;
      for (let i = 1; i < periodsWithData.length; i++) {
        const curr = periodsWithData[i].realValue!;
        const prev = periodsWithData[i - 1].realValue!;
        if (!isWorseThan(curr, prev, dir)) {
          allWorsening = false;
          break;
        }
      }
      if (allWorsening) {
        const r = await upsertAlert({
          cycleId: kpi.cycleId,
          organizationId: kpi.organizationId,
          type: "tendencia_negativa",
          title: `Tendencia negativa de ${kpi.name} por ${N} períodos`,
          description: `${kpi.code} ha empeorado durante ${N} períodos consecutivos. Último valor: ${periodsWithData[periodsWithData.length - 1].realValue}.`,
          priority: (tendRule.defaultPriority ?? "media") as Priority,
          objectType: "kpi",
          objectId: kpi.id,
          ruleId: tendRule.id,
          contextData: {
            kpiCode: kpi.code,
            consecutivePeriods: N,
            recentValues: periodsWithData.map((p) => ({
              period: p.period,
              value: p.realValue,
            })),
          },
        });
        if (r.created) triggered.push(r.id);
      }
    }
  }

  // ─── Regla 4: cumplimiento OLP en riesgo ────────────────────
  const olpRule = await findRule(kpi.cycleId, "olp_en_riesgo");
  if (olpRule && kpi.olps.length > 0) {
    const config = JSON.parse(olpRule.configuration || "{}") as {
      riskThresholdPct?: number;
    };
    const thresholdPct = config.riskThresholdPct ?? 10;
    const valuesForProjection = kpi.periods.filter((p) => p.realValue != null);

    if (valuesForProjection.length >= 2) {
      // Proyección lineal simple (último - primer) / (n-1) extrapolando
      const first = valuesForProjection[0].realValue!;
      const last = valuesForProjection[valuesForProjection.length - 1].realValue!;
      const periodsElapsed = valuesForProjection.length - 1;
      const slope = (last - first) / Math.max(1, periodsElapsed);
      const remainingPeriods = Math.max(0, kpi.periods.length - valuesForProjection.length);
      const projected = last + slope * remainingPeriods;

      for (const link of kpi.olps) {
        const olp = link.olp;
        if (olp.targetValue == null) continue;
        const target = olp.targetValue;
        const desviationPct = ((target - projected) / target) * 100;
        const desviationDir =
          dir === "menor_mejor" ? desviationPct < -thresholdPct : desviationPct > thresholdPct;
        if (desviationDir) {
          const r = await upsertAlert({
            cycleId: kpi.cycleId,
            organizationId: kpi.organizationId,
            type: "olp_en_riesgo",
            title: `OLP en riesgo (medido por ${kpi.code})`,
            description: `Proyección lineal: ${projected.toFixed(2)} vs meta ${target}. Desviación ${desviationPct.toFixed(1)}% por encima del umbral de ${thresholdPct}%.`,
            priority: (olpRule.defaultPriority ?? "alta") as Priority,
            objectType: "olp",
            objectId: olp.id,
            ruleId: olpRule.id,
            contextData: {
              kpiId: kpi.id,
              kpiCode: kpi.code,
              projected,
              target,
              desviationPct,
              olpDescription: olp.description,
            },
          });
          if (r.created) triggered.push(r.id);
        }
      }
    }
  }

  // ─── Regla 5: hito incumplido (OCP) ─────────────────────────
  const hitoRule = await findRule(kpi.cycleId, "hito_incumplido");
  if (hitoRule && triggerPeriodData?.realValue != null && triggerPeriodData.metaGreen != null) {
    const config = JSON.parse(hitoRule.configuration || "{}") as { tolerancePct?: number };
    const tolerance = (config.tolerancePct ?? 0) / 100;
    const meta = triggerPeriodData.metaGreen;
    const real = triggerPeriodData.realValue;
    const ocps = kpi.ocps;
    for (const link of ocps) {
      const ocp = link.ocp;
      // Detectar si el período del valor incluye el año del OCP
      // El "year" del OCP no está en la consulta — usar el período del KPI como aproximación
      const yearMatch = triggerPeriod.match(/^(\d{4})/);
      if (!yearMatch) continue;
      const periodYear = Number(yearMatch[1]);
      const ocpYear = await db.ocp.findUnique({
        where: { id: ocp.id },
        select: { year: true, metaValue: true },
      });
      if (!ocpYear || ocpYear.year !== periodYear) continue;
      const target = ocpYear.metaValue ?? meta;
      const failed =
        dir === "menor_mejor" ? real > target * (1 + tolerance) : real < target * (1 - tolerance);
      if (failed) {
        const r = await upsertAlert({
          cycleId: kpi.cycleId,
          organizationId: kpi.organizationId,
          type: "hito_incumplido",
          title: `OCP ${ocp.code} no se cumplió en ${triggerPeriod}`,
          description: `Valor real ${real} vs meta del OCP ${target}. Tolerancia configurada: ${(tolerance * 100).toFixed(1)}%.`,
          priority: (hitoRule.defaultPriority ?? "media") as Priority,
          objectType: "ocp",
          objectId: ocp.id,
          ruleId: hitoRule.id,
          contextData: {
            kpiId: kpi.id,
            kpiCode: kpi.code,
            ocpCode: ocp.code,
            period: triggerPeriod,
            real,
            target,
          },
        });
        if (r.created) triggered.push(r.id);
      }
    }
  }

  return { generated: triggered.length, alertIds: triggered };
}

// ───────────────────────────────────────────────────────────────────────
// Detección on-demand de "datos atrasados" para todos los KPIs del cycle
// ───────────────────────────────────────────────────────────────────────

const FREQUENCY_DAYS: Record<string, number> = {
  mensual: 30,
  trimestral: 90,
  semestral: 180,
  anual: 365,
};

export async function evaluateDelayedDataForCycle(
  cycleId: string,
): Promise<{ generated: number }> {
  const rule = await findRule(cycleId, "datos_atrasados");
  if (!rule) return { generated: 0 };
  const config = JSON.parse(rule.configuration || "{}") as {
    delayMultiplier?: number;
    escalateAfterDays?: number;
  };
  const mult = config.delayMultiplier ?? 1.5;

  const kpis = await db.kpi.findMany({
    where: {
      cycleId,
      status: { in: ["aceptado", "en_edicion", "confirmado"] },
    },
    select: {
      id: true,
      code: true,
      name: true,
      organizationId: true,
      frequency: true,
      source: true,
      educanetLastReceivedAt: true,
      periods: {
        orderBy: { dataReceivedAt: "desc" },
        take: 1,
        select: { dataReceivedAt: true },
      },
    },
  });

  let generated = 0;
  const now = new Date();
  for (const k of kpis) {
    const lastReceived = k.periods[0]?.dataReceivedAt ?? k.educanetLastReceivedAt ?? null;
    if (!lastReceived) continue; // KPI nuevo, no aplica
    const daysSince = (now.getTime() - lastReceived.getTime()) / (1000 * 60 * 60 * 24);
    const expectedDays = (FREQUENCY_DAYS[k.frequency] ?? 30) * mult;
    if (daysSince <= expectedDays) continue;
    const escalate = config.escalateAfterDays && daysSince > config.escalateAfterDays;
    const priority: Priority = escalate ? "alta" : (rule.defaultPriority ?? "media") as Priority;
    const r = await upsertAlert({
      cycleId,
      organizationId: k.organizationId,
      type: "datos_atrasados",
      title: `Datos atrasados: ${k.name} sin actualizar en ${Math.floor(daysSince)} días`,
      description: `Último valor recibido hace ${Math.floor(daysSince)} días (esperado: ${Math.floor(expectedDays)}). Fuente: ${k.source === "educanet" ? "EduCaNet (posible problema técnico)" : "Manual (carga abandonada)"}.`,
      priority,
      objectType: "kpi",
      objectId: k.id,
      ruleId: rule.id,
      contextData: {
        kpiCode: k.code,
        source: k.source,
        daysSince: Math.floor(daysSince),
        expectedDays: Math.floor(expectedDays),
        lastReceivedAt: lastReceived.toISOString(),
      },
    });
    if (r.created) generated++;
  }
  return { generated };
}

// ───────────────────────────────────────────────────────────────────────
// Evaluación completa on-demand del cycle (botón "Evaluar ahora")
// ───────────────────────────────────────────────────────────────────────

export async function evaluateCycleNow(cycleId: string): Promise<{
  generated: number;
  byType: Record<string, number>;
}> {
  await ensureDefaultRules(cycleId);

  const kpis = await db.kpi.findMany({
    where: {
      cycleId,
      status: { in: ["aceptado", "en_edicion", "confirmado"] },
    },
    select: { id: true, periods: { select: { period: true, realValue: true } } },
  });

  const byType: Record<string, number> = {};
  let total = 0;

  for (const k of kpis) {
    const lastWithValue = [...k.periods]
      .filter((p) => p.realValue != null)
      .sort((a, b) => b.period.localeCompare(a.period))[0];
    if (!lastWithValue) continue;
    const res = await evaluateForKpi(k.id, lastWithValue.period);
    total += res.generated;
  }

  const delayed = await evaluateDelayedDataForCycle(cycleId);
  if (delayed.generated > 0) byType["datos_atrasados"] = delayed.generated;
  total += delayed.generated;

  return { generated: total, byType };
}

// ───────────────────────────────────────────────────────────────────────
// Generación de título descriptivo según tipo
// ───────────────────────────────────────────────────────────────────────

export function inferAssignee(
  responsibleAreaId: string | null,
  organizationId: string,
): Promise<string | null> {
  if (!responsibleAreaId) return Promise.resolve(null);
  // Buscar un usuario que pertenezca a la org. Por ahora retorna null y el usuario asigna manualmente.
  // En el futuro: buscar por OrganizationMember + role para sugerir asignación automática.
  void organizationId;
  return Promise.resolve(null);
}
