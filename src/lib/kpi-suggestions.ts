// ───────────────────────────────────────────────────────────────────────
// 4 dimensiones BSC con nombres usados en M3 (no terminología técnica clásica)
// ───────────────────────────────────────────────────────────────────────

export type BscDimension =
  | "resultados_economicos"
  | "posicion_mercado"
  | "como_opera_empresa"
  | "personas_cultura";

export interface BscDimensionDef {
  key: BscDimension;
  label: string;
  shortLabel: string;
  code: string; // 2-letter code para KPI-XX-NN
  description: string;
  classicLabel: string; // tooltip educacional
  icon: string;
  color: string;
  bg: string;
}

export const BSC_DIMENSIONS: BscDimensionDef[] = [
  {
    key: "resultados_economicos",
    label: "Resultados económicos",
    shortLabel: "Económicos",
    code: "RE",
    description: "Indicadores financieros: ingresos, márgenes, rentabilidad, capital.",
    classicLabel: "Perspectiva Financiera (Kaplan-Norton)",
    icon: "Coins",
    color: "#1e7f4f",
    bg: "rgba(74, 222, 128, 0.08)",
  },
  {
    key: "posicion_mercado",
    label: "Posición mercado",
    shortLabel: "Mercado",
    code: "PM",
    description: "Indicadores de cliente: participación, satisfacción, marca, fidelización.",
    classicLabel: "Perspectiva Cliente (Kaplan-Norton)",
    icon: "Target",
    color: "#185fa5",
    bg: "rgba(96, 165, 250, 0.08)",
  },
  {
    key: "como_opera_empresa",
    label: "Cómo opera la empresa",
    shortLabel: "Operación",
    code: "OP",
    description: "Indicadores de procesos: eficiencia, calidad, certificaciones, productividad.",
    classicLabel: "Perspectiva Procesos Internos (Kaplan-Norton)",
    icon: "Settings2",
    color: "#b45309",
    bg: "rgba(251, 191, 36, 0.08)",
  },
  {
    key: "personas_cultura",
    label: "Personas y cultura",
    shortLabel: "Personas",
    code: "PC",
    description: "Indicadores de talento: clima, rotación, capacitación, aprendizaje.",
    classicLabel: "Perspectiva Aprendizaje y Crecimiento (Kaplan-Norton)",
    icon: "Users",
    color: "#8B1510",
    bg: "rgba(139, 21, 16, 0.08)",
  },
];

export function getDimensionDef(key: string): BscDimensionDef | undefined {
  return BSC_DIMENSIONS.find((d) => d.key === key);
}

// Mapear BSC keys del OLP (que vienen de M3) a estas dimensiones de M5
// El campo Olp.bscPerspective probablemente usa: financiera, cliente, procesos_internos, aprendizaje_crecimiento
const OLP_BSC_TO_DIMENSION: Record<string, BscDimension> = {
  financiera: "resultados_economicos",
  cliente: "posicion_mercado",
  procesos_internos: "como_opera_empresa",
  procesos: "como_opera_empresa",
  aprendizaje_crecimiento: "personas_cultura",
  aprendizaje: "personas_cultura",
  // Si el cycle usa los nombres nuevos directamente:
  resultados_economicos: "resultados_economicos",
  posicion_mercado: "posicion_mercado",
  como_opera_empresa: "como_opera_empresa",
  personas_cultura: "personas_cultura",
  // Códigos que guarda M3 (Olp.bscPerspective)
  fin: "resultados_economicos",
  cli: "posicion_mercado",
  int: "como_opera_empresa",
  apr: "personas_cultura",
};

export function olpBscToDimension(olpBsc: string | null | undefined): BscDimension {
  if (!olpBsc) return "resultados_economicos";
  return OLP_BSC_TO_DIMENSION[olpBsc.toLowerCase().trim()] ?? "resultados_economicos";
}

// ───────────────────────────────────────────────────────────────────────
// Plantillas adicionales por dimensión (extra KPIs estándar)
// ───────────────────────────────────────────────────────────────────────

export interface ExtraKpiTemplate {
  dimension: BscDimension;
  name: string;
  description: string;
  formula: string;
  unit: string;
  frequency: "mensual" | "trimestral" | "semestral" | "anual";
  direction: "mayor_mejor" | "menor_mejor" | "objetivo_puntual";
  defaultSource: "educanet" | "manual";
}

export const EXTRA_KPI_TEMPLATES: ExtraKpiTemplate[] = [
  // Resultados económicos
  {
    dimension: "resultados_economicos",
    name: "Ventas totales",
    description: "Ingresos consolidados del período.",
    formula: "SUM(ingresos_facturados)",
    unit: "USD",
    frequency: "mensual",
    direction: "mayor_mejor",
    defaultSource: "educanet",
  },
  {
    dimension: "resultados_economicos",
    name: "EBITDA",
    description: "Utilidad antes de intereses, impuestos, depreciación y amortización.",
    formula: "Ingresos - Costos operativos",
    unit: "USD",
    frequency: "mensual",
    direction: "mayor_mejor",
    defaultSource: "manual",
  },
  {
    dimension: "resultados_economicos",
    name: "Margen bruto",
    description: "Porcentaje de utilidad bruta sobre ventas.",
    formula: "(Ingresos - Costo de ventas) / Ingresos × 100",
    unit: "%",
    frequency: "mensual",
    direction: "mayor_mejor",
    defaultSource: "manual",
  },
  // Posición mercado
  {
    dimension: "posicion_mercado",
    name: "Cuota de mercado",
    description: "Participación de la empresa en el mercado total.",
    formula: "Ventas propias / Ventas totales del sector × 100",
    unit: "%",
    frequency: "trimestral",
    direction: "mayor_mejor",
    defaultSource: "manual",
  },
  {
    dimension: "posicion_mercado",
    name: "Net Promoter Score (NPS)",
    description: "Indicador de lealtad y satisfacción del cliente.",
    formula: "% Promotores - % Detractores",
    unit: "puntos",
    frequency: "trimestral",
    direction: "mayor_mejor",
    defaultSource: "manual",
  },
  {
    dimension: "posicion_mercado",
    name: "Top of mind",
    description: "Porcentaje de clientes que mencionan la marca primero en estudios.",
    formula: "Estudios de mercado",
    unit: "%",
    frequency: "anual",
    direction: "mayor_mejor",
    defaultSource: "manual",
  },
  // Cómo opera la empresa
  {
    dimension: "como_opera_empresa",
    name: "Certificaciones activas",
    description: "Número de certificaciones vigentes (ISO, HACCP, etc.).",
    formula: "COUNT(certificaciones_vigentes)",
    unit: "certificaciones",
    frequency: "trimestral",
    direction: "mayor_mejor",
    defaultSource: "manual",
  },
  {
    dimension: "como_opera_empresa",
    name: "Defectos por lote",
    description: "Tasa de defectos en producción.",
    formula: "Unidades defectuosas / Total producido × 1000",
    unit: "ppm",
    frequency: "mensual",
    direction: "menor_mejor",
    defaultSource: "educanet",
  },
  {
    dimension: "como_opera_empresa",
    name: "Productividad operativa",
    description: "Output por FTE.",
    formula: "Output total / FTEs activos",
    unit: "unidades/FTE",
    frequency: "mensual",
    direction: "mayor_mejor",
    defaultSource: "educanet",
  },
  // Personas y cultura
  {
    dimension: "personas_cultura",
    name: "Rotación de personal",
    description: "Porcentaje de salidas voluntarias en el período.",
    formula: "Salidas voluntarias / Plantilla promedio × 100",
    unit: "%",
    frequency: "trimestral",
    direction: "menor_mejor",
    defaultSource: "educanet",
  },
  {
    dimension: "personas_cultura",
    name: "Clima laboral",
    description: "Resultado de encuesta anual de clima.",
    formula: "Promedio ponderado de encuesta",
    unit: "puntos",
    frequency: "anual",
    direction: "mayor_mejor",
    defaultSource: "manual",
  },
  {
    dimension: "personas_cultura",
    name: "Horas de capacitación",
    description: "Promedio de horas de capacitación por colaborador.",
    formula: "Horas totales / Plantilla promedio",
    unit: "horas/persona",
    frequency: "trimestral",
    direction: "mayor_mejor",
    defaultSource: "educanet",
  },
];

// ───────────────────────────────────────────────────────────────────────
// Inferencia de fuente default por nombre del indicador
// ───────────────────────────────────────────────────────────────────────

const MANUAL_HINTS = [
  "nps", "clima", "top of mind", "encuesta", "estudio", "auditoría externa",
  "roi contable", "ebitda", "margen bruto", "margen neto", "satisfacción",
];

export function inferDefaultSource(
  name: string,
  description: string,
): "educanet" | "manual" {
  const text = `${name} ${description}`.toLowerCase();
  if (MANUAL_HINTS.some((h) => text.includes(h))) return "manual";
  return "educanet";
}

// ───────────────────────────────────────────────────────────────────────
// Generador de ID de vinculación EduCaNet
// ───────────────────────────────────────────────────────────────────────

const HEX_CHARS = "0123456789abcdef";

export function generateEducanetLinkId(): string {
  let suffix = "";
  for (let i = 0; i < 10; i++) {
    suffix += HEX_CHARS[Math.floor(Math.random() * HEX_CHARS.length)];
  }
  return `est_kpi_${suffix}`;
}

// ───────────────────────────────────────────────────────────────────────
// Código KPI: KPI-DIM-NN
// ───────────────────────────────────────────────────────────────────────

export function generateKpiCode(dimension: BscDimension, index: number): string {
  const code = getDimensionDef(dimension)?.code ?? "GE";
  return `KPI-${code}-${String(index).padStart(2, "0")}`;
}

// ───────────────────────────────────────────────────────────────────────
// Cálculo de umbrales semáforo
// ───────────────────────────────────────────────────────────────────────

export function computeThresholds(
  meta: number,
  direction: "mayor_mejor" | "menor_mejor" | "objetivo_puntual",
): { green: number; amber: number; red: number } {
  if (direction === "menor_mejor") {
    return {
      green: meta,
      amber: meta * 1.15, // hasta 15% sobre la meta es aceptable
      red: meta * 1.3, // 30% sobre la meta es crítico
    };
  }
  if (direction === "objetivo_puntual") {
    return {
      green: meta,
      amber: meta * 0.9,
      red: meta * 0.8,
    };
  }
  // mayor_mejor
  return {
    green: meta,
    amber: meta * 0.85, // 85% de la meta es aceptable
    red: meta * 0.7, // por debajo de 70% es crítico
  };
}

export function computeSemaforo(
  value: number,
  thresholds: { green: number; amber: number; red: number },
  direction: "mayor_mejor" | "menor_mejor" | "objetivo_puntual",
): "verde" | "ambar" | "rojo" {
  if (direction === "menor_mejor") {
    if (value <= thresholds.green) return "verde";
    if (value <= thresholds.amber) return "ambar";
    return "rojo";
  }
  if (direction === "objetivo_puntual") {
    if (value >= thresholds.green) return "verde";
    if (value >= thresholds.amber) return "ambar";
    return "rojo";
  }
  // mayor_mejor
  if (value >= thresholds.green) return "verde";
  if (value >= thresholds.amber) return "ambar";
  return "rojo";
}

export function computePercentCompletion(
  value: number,
  target: number,
  direction: "mayor_mejor" | "menor_mejor" | "objetivo_puntual",
): number {
  if (target === 0) return 0;
  if (direction === "menor_mejor") {
    // % = target / value (mientras menor el value, mejor)
    return Math.min(200, Math.round((target / Math.max(value, 0.0001)) * 100));
  }
  return Math.min(200, Math.round((value / target) * 100));
}

// ───────────────────────────────────────────────────────────────────────
// Generación de periodos del horizonte según frecuencia
// ───────────────────────────────────────────────────────────────────────

export function generatePeriods(
  frequency: "mensual" | "trimestral" | "semestral" | "anual",
  yearStart: number,
  yearEnd: number,
): string[] {
  const periods: string[] = [];
  for (let y = yearStart + 1; y <= yearEnd; y++) {
    if (frequency === "anual") {
      periods.push(String(y));
    } else if (frequency === "semestral") {
      periods.push(`${y}-H1`);
      periods.push(`${y}-H2`);
    } else if (frequency === "trimestral") {
      periods.push(`${y}-Q1`);
      periods.push(`${y}-Q2`);
      periods.push(`${y}-Q3`);
      periods.push(`${y}-Q4`);
    } else {
      // mensual
      for (let m = 1; m <= 12; m++) {
        periods.push(`${y}-${String(m).padStart(2, "0")}`);
      }
    }
  }
  return periods;
}

export function isValidPeriodForFrequency(
  period: string,
  frequency: "mensual" | "trimestral" | "semestral" | "anual",
): boolean {
  if (frequency === "anual") return /^\d{4}$/.test(period);
  if (frequency === "semestral") return /^\d{4}-H[12]$/.test(period);
  if (frequency === "trimestral") return /^\d{4}-Q[1-4]$/.test(period);
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

export const FREQUENCY_OPTIONS = [
  { value: "mensual", label: "Mensual" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
] as const;

export const DIRECTION_OPTIONS = [
  { value: "mayor_mejor", label: "Mayor es mejor" },
  { value: "menor_mejor", label: "Menor es mejor" },
  { value: "objetivo_puntual", label: "Objetivo puntual" },
] as const;
