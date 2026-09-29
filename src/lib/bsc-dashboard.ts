import {
  BSC_DIMENSIONS,
  computeSemaforo,
  computePercentCompletion,
} from "./kpi-suggestions";
import type { BscDimension } from "./kpi-suggestions";

// ───────────────────────────────────────────────────────────────────────
// Tipos compartidos para componentes del Tablero
// ───────────────────────────────────────────────────────────────────────

export type Semaforo = "verde" | "ambar" | "rojo" | "sin_dato";

export const SEMAFORO_COLORS: Record<Semaforo, { color: string; bg: string; label: string }> = {
  verde: { color: "#34d399", bg: "transparent", label: "EN META" },
  ambar: { color: "#FAC775", bg: "transparent", label: "ALERTA" },
  rojo: { color: "#fca5a5", bg: "transparent", label: "CRÍTICO" },
  sin_dato: { color: "#c4c1bb", bg: "transparent", label: "SIN DATO" },
};

export interface KpiSnapshot {
  id: string;
  code: string;
  name: string;
  description: string | null;
  dimensionBsc: BscDimension;
  unit: string | null;
  frequency: string;
  direction: "mayor_mejor" | "menor_mejor" | "objetivo_puntual";
  source: "educanet" | "manual";
  educanetLinkId: string | null;
  responsibleAreaName: string | null;
  responsibleRole: string | null;
  currentPeriod: string;
  currentValue: number | null;
  metaGreen: number | null;
  metaAmber: number | null;
  metaRed: number | null;
  semaforo: Semaforo;
  percentCompletion: number | null;
  trendDelta: number | null; // diferencia vs período anterior
  trendDirection: "up" | "down" | "flat" | null;
  sparkline: number[]; // últimos 6 valores
  lastReceivedAt: Date | null;
}

// ───────────────────────────────────────────────────────────────────────
// Computar cumplimiento global
// ───────────────────────────────────────────────────────────────────────

export function computeGlobalCompliance(snapshots: KpiSnapshot[]): {
  globalPct: number;
  byDimension: Record<BscDimension, number>;
  counts: Record<Semaforo, number>;
} {
  const counts: Record<Semaforo, number> = {
    verde: 0,
    ambar: 0,
    rojo: 0,
    sin_dato: 0,
  };
  const dimSums = new Map<BscDimension, { sum: number; count: number }>();
  let totalPct = 0;
  let withData = 0;

  for (const k of snapshots) {
    counts[k.semaforo]++;
    if (k.semaforo !== "sin_dato" && k.percentCompletion != null) {
      totalPct += Math.min(150, k.percentCompletion);
      withData++;
      const sums = dimSums.get(k.dimensionBsc) ?? { sum: 0, count: 0 };
      sums.sum += Math.min(150, k.percentCompletion);
      sums.count++;
      dimSums.set(k.dimensionBsc, sums);
    }
  }

  const byDimension: Record<BscDimension, number> = {
    resultados_economicos: 0,
    posicion_mercado: 0,
    como_opera_empresa: 0,
    personas_cultura: 0,
  };
  for (const [dim, sums] of dimSums) {
    byDimension[dim] = sums.count > 0 ? Math.round(sums.sum / sums.count) : 0;
  }

  return {
    globalPct: withData > 0 ? Math.round(totalPct / withData) : 0,
    byDimension,
    counts,
  };
}

// ───────────────────────────────────────────────────────────────────────
// Construir snapshot del KPI a partir de los datos del DB
// ───────────────────────────────────────────────────────────────────────

export interface RawKpiInput {
  id: string;
  code: string;
  name: string;
  description: string | null;
  dimensionBsc: string;
  unit: string | null;
  frequency: string;
  direction: string;
  source: string;
  educanetLinkId: string | null;
  educanetLastReceivedAt: Date | null;
  responsibleArea: { name: string } | null;
  responsibleRole: string | null;
  periods: {
    period: string;
    metaGreen: number | null;
    metaAmber: number | null;
    metaRed: number | null;
    realValue: number | null;
    semaforoActual: string | null;
    percentCompletion: number | null;
    dataReceivedAt: Date | null;
  }[];
}

export function buildKpiSnapshot(
  kpi: RawKpiInput,
  currentPeriod: string,
): KpiSnapshot {
  const direction = kpi.direction as
    | "mayor_mejor"
    | "menor_mejor"
    | "objetivo_puntual";
  const sortedPeriods = [...kpi.periods].sort((a, b) =>
    a.period.localeCompare(b.period),
  );
  const periodMap = new Map(sortedPeriods.map((p) => [p.period, p]));
  const current = periodMap.get(currentPeriod);

  let semaforo: Semaforo = "sin_dato";
  let percentCompletion: number | null = null;
  if (current?.realValue != null) {
    if (current.metaGreen != null) {
      const thresholds = {
        green: current.metaGreen,
        amber: current.metaAmber ?? current.metaGreen * 0.85,
        red: current.metaRed ?? current.metaGreen * 0.7,
      };
      semaforo = computeSemaforo(current.realValue, thresholds, direction);
      percentCompletion = computePercentCompletion(
        current.realValue,
        current.metaGreen,
        direction,
      );
    } else if (current.semaforoActual) {
      semaforo = (current.semaforoActual as Semaforo) ?? "sin_dato";
      percentCompletion = current.percentCompletion;
    }
  }

  // Trend: comparar con el período anterior (con valor real)
  const idx = sortedPeriods.findIndex((p) => p.period === currentPeriod);
  let trendDelta: number | null = null;
  let trendDirection: "up" | "down" | "flat" | null = null;
  if (idx > 0 && current?.realValue != null) {
    // Buscar el período inmediatamente anterior con realValue
    for (let i = idx - 1; i >= 0; i--) {
      const prev = sortedPeriods[i];
      if (prev.realValue != null) {
        trendDelta = current.realValue - prev.realValue;
        if (Math.abs(trendDelta) < 1e-6) trendDirection = "flat";
        else if (direction === "menor_mejor") {
          trendDirection = trendDelta < 0 ? "up" : "down"; // valor menor = mejor
        } else {
          trendDirection = trendDelta > 0 ? "up" : "down";
        }
        break;
      }
    }
  }

  // Sparkline: últimos 6 valores reales hasta el período actual (incluido)
  const periodsUpToCurrent = sortedPeriods.slice(0, idx + 1);
  const sparkline = periodsUpToCurrent
    .filter((p) => p.realValue != null)
    .slice(-6)
    .map((p) => p.realValue!);

  return {
    id: kpi.id,
    code: kpi.code,
    name: kpi.name,
    description: kpi.description,
    dimensionBsc: kpi.dimensionBsc as BscDimension,
    unit: kpi.unit,
    frequency: kpi.frequency,
    direction,
    source: kpi.source as "educanet" | "manual",
    educanetLinkId: kpi.educanetLinkId,
    responsibleAreaName: kpi.responsibleArea?.name ?? null,
    responsibleRole: kpi.responsibleRole,
    currentPeriod,
    currentValue: current?.realValue ?? null,
    metaGreen: current?.metaGreen ?? null,
    metaAmber: current?.metaAmber ?? null,
    metaRed: current?.metaRed ?? null,
    semaforo,
    percentCompletion,
    trendDelta,
    trendDirection,
    sparkline,
    lastReceivedAt: current?.dataReceivedAt ?? kpi.educanetLastReceivedAt,
  };
}

// ───────────────────────────────────────────────────────────────────────
// Período por defecto: el más reciente con datos, o el último del horizonte
// ───────────────────────────────────────────────────────────────────────

export function getDefaultPeriod(
  kpis: RawKpiInput[],
  cycleYearStart: number,
  cycleYearEnd: number,
): string {
  // Buscar el período más reciente con al menos un valor real
  const allWithData = kpis
    .flatMap((k) => k.periods.filter((p) => p.realValue != null).map((p) => p.period))
    .sort((a, b) => b.localeCompare(a));
  if (allWithData.length > 0) return allWithData[0];

  // Fallback: período actual aproximado
  const now = new Date();
  const currentYear = Math.max(
    cycleYearStart + 1,
    Math.min(cycleYearEnd, now.getFullYear()),
  );
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
  return `${currentYear}-${currentMonth}`;
}

// ───────────────────────────────────────────────────────────────────────
// Inferencia de relaciones causa-efecto para el mapa estratégico
// ───────────────────────────────────────────────────────────────────────

// Cadena Kaplan-Norton: Personas → Procesos → Mercado → Resultados
const DIMENSION_ORDER: BscDimension[] = [
  "personas_cultura",
  "como_opera_empresa",
  "posicion_mercado",
  "resultados_economicos",
];

export function inferRelations(
  kpis: { id: string; dimensionBsc: string; olpIds: string[] }[],
): { sourceKpiId: string; targetKpiId: string; intensity: "alta" | "media" | "baja" }[] {
  const out: { sourceKpiId: string; targetKpiId: string; intensity: "alta" | "media" | "baja" }[] = [];
  const seen = new Set<string>();

  // Regla 1: KPIs que comparten OLPs en dimensiones adyacentes de la cadena
  for (const source of kpis) {
    const srcIdx = DIMENSION_ORDER.indexOf(source.dimensionBsc as BscDimension);
    if (srcIdx < 0 || srcIdx >= DIMENSION_ORDER.length - 1) continue;
    const nextDim = DIMENSION_ORDER[srcIdx + 1];
    const targets = kpis.filter((t) => t.dimensionBsc === nextDim);
    for (const t of targets) {
      const key = `${source.id}::${t.id}`;
      if (seen.has(key)) continue;
      // Intensidad: alta si comparten OLPs, media si solo dimensiones adyacentes
      const sharedOlps = source.olpIds.filter((o) => t.olpIds.includes(o));
      const intensity: "alta" | "media" | "baja" =
        sharedOlps.length >= 2
          ? "alta"
          : sharedOlps.length === 1
          ? "media"
          : "baja";
      if (intensity === "baja") continue; // skip relaciones débiles
      out.push({ sourceKpiId: source.id, targetKpiId: t.id, intensity });
      seen.add(key);
    }
  }

  return out;
}

// ───────────────────────────────────────────────────────────────────────
// Narrativa automática del KPI
// ───────────────────────────────────────────────────────────────────────

export function buildKpiNarrative(snapshot: KpiSnapshot, history: number[]): string {
  if (history.length === 0) {
    return "Sin datos históricos suficientes para análisis.";
  }
  const parts: string[] = [];

  // Detectar tendencia consistente
  if (history.length >= 3) {
    let worsening = 0;
    let improving = 0;
    for (let i = 1; i < history.length; i++) {
      const delta = history[i] - history[i - 1];
      const isWorse = snapshot.direction === "menor_mejor" ? delta > 0 : delta < 0;
      const isBetter = snapshot.direction === "menor_mejor" ? delta < 0 : delta > 0;
      if (isWorse) worsening++;
      if (isBetter) improving++;
    }
    if (worsening >= history.length - 1) {
      parts.push(
        `Tendencia: ha empeorado durante ${worsening} períodos consecutivos.`,
      );
    } else if (improving >= history.length - 1) {
      parts.push(
        `Tendencia: ha mejorado durante ${improving} períodos consecutivos.`,
      );
    } else {
      parts.push(`Tendencia mixta en los últimos ${history.length} períodos.`);
    }
  }

  // Pronóstico simple
  if (snapshot.metaGreen != null && snapshot.currentValue != null) {
    const gap = snapshot.metaGreen - snapshot.currentValue;
    if (Math.abs(gap) > snapshot.metaGreen * 0.05) {
      const direction = snapshot.direction === "menor_mejor" ? -1 : 1;
      const onTrack = gap * direction <= 0;
      if (onTrack) {
        parts.push("Actualmente por encima de la meta para el período.");
      } else {
        parts.push(
          `Brecha actual vs meta: ${Math.abs(gap).toFixed(2)} ${snapshot.unit ?? ""}.`,
        );
      }
    }
  }

  // Acción sugerida según semáforo
  if (snapshot.semaforo === "rojo") {
    parts.push(
      "Acción inmediata sugerida: convocar al responsable y revisar causas raíz antes del próximo ciclo de medición.",
    );
  } else if (snapshot.semaforo === "ambar") {
    parts.push(
      "Acción sugerida: monitorear de cerca, identificar drivers de mejora y considerar plan de contingencia.",
    );
  } else if (snapshot.semaforo === "verde") {
    parts.push(
      "Mantener el ritmo. Documentar buenas prácticas para replicar en otros KPIs.",
    );
  }

  return parts.join(" ");
}

// ───────────────────────────────────────────────────────────────────────
// Sparkline path (SVG)
// ───────────────────────────────────────────────────────────────────────

export function buildSparklinePath(
  values: number[],
  width = 60,
  height = 20,
): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

// ───────────────────────────────────────────────────────────────────────
// Formato
// ───────────────────────────────────────────────────────────────────────

export function formatKpiValue(value: number | null, unit: string | null): string {
  if (value == null) return "—";
  if (unit === "USD" || unit === "$") {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  }
  if (unit === "%") return `${value.toFixed(1)}%`;
  if (Math.abs(value) >= 1000) return value.toLocaleString("es-PE");
  if (Math.abs(value) < 1 && value !== 0) return value.toFixed(2);
  return value.toFixed(value % 1 === 0 ? 0 : 1) + (unit ? ` ${unit}` : "");
}

export function getDimensionPalette(dim: BscDimension): {
  color: string;
  bg: string;
  pastel: string;
} {
  const def = BSC_DIMENSIONS.find((d) => d.key === dim);
  return {
    color: def?.color ?? "#475569",
    bg: def?.bg ?? "transparent",
    pastel: def?.bg ?? "transparent",
  };
}
