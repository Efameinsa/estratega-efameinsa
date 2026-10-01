// Catálogo + constantes puras. NO importa nada de server.

export type AlertType =
  | "semaforo_critico"
  | "tendencia_negativa"
  | "datos_atrasados"
  | "olp_en_riesgo"
  | "hito_incumplido"
  | "personalizada";

export type Priority = "alta" | "media" | "baja";
export type AlertStatus =
  | "activa"
  | "en_seguimiento"
  | "resuelta"
  | "ignorada"
  | "reactivada";

export interface AlertTypeDef {
  key: AlertType;
  label: string;
  description: string;
  icon: string;
  color: string;
  bg: string;
  defaultPriority: Priority;
  defaultRuleName: string;
  defaultConfig: Record<string, unknown>;
}

export const ALERT_TYPES: AlertTypeDef[] = [
  {
    key: "semaforo_critico",
    label: "Semáforo crítico",
    description:
      "Un KPI entra en estado rojo al recibir un valor por debajo del umbral crítico.",
    icon: "AlertCircle",
    color: "#b3261e",
    bg: "transparent",
    defaultPriority: "alta",
    defaultRuleName: "Alertar cuando un KPI entre en estado rojo",
    defaultConfig: {},
  },
  {
    key: "tendencia_negativa",
    label: "Tendencia negativa sostenida",
    description:
      "Un KPI empeora durante N períodos consecutivos antes de llegar a rojo.",
    icon: "TrendingDown",
    color: "#b45309",
    bg: "transparent",
    defaultPriority: "media",
    defaultRuleName: "Alertar cuando un KPI empeore 3 períodos consecutivos",
    defaultConfig: { consecutivePeriods: 3, sensitivityPct: 0 },
  },
  {
    key: "datos_atrasados",
    label: "Datos atrasados",
    description:
      "Un KPI no recibe nuevos valores en más tiempo del esperado según su frecuencia.",
    icon: "ClockAlert",
    color: "#a8a29e",
    bg: "transparent",
    defaultPriority: "media",
    defaultRuleName: "Alertar cuando un KPI no reciba datos en 1.5x su frecuencia",
    defaultConfig: { delayMultiplier: 1.5, escalateAfterDays: 21 },
  },
  {
    key: "olp_en_riesgo",
    label: "Cumplimiento de OLP en riesgo",
    description:
      "La proyección lineal del KPI principal no alcanzará la meta del OLP en su fecha objetivo.",
    icon: "TargetX",
    color: "#b3261e",
    bg: "transparent",
    defaultPriority: "alta",
    defaultRuleName: "Alertar cuando la proyección de un OLP no alcance su meta",
    defaultConfig: { projectionMethod: "lineal", riskThresholdPct: 10 },
  },
  {
    key: "hito_incumplido",
    label: "Hito incumplido",
    description:
      "Un OCP no alcanzó su meta en el período en que debía cumplirse.",
    icon: "XCircle",
    color: "#b45309",
    bg: "transparent",
    defaultPriority: "media",
    defaultRuleName: "Alertar cuando un OCP no se cumpla en su período",
    defaultConfig: { tolerancePct: 0 },
  },
];

export function getAlertTypeDef(key: string): AlertTypeDef | undefined {
  return ALERT_TYPES.find((t) => t.key === key);
}

import { URGENCY, NEUTRAL_COLORS } from "./colors";

export const PRIORITY_COLORS: Record<Priority, { color: string; bg: string; label: string }> = {
  alta: URGENCY.alta,
  media: URGENCY.media,
  baja: URGENCY.baja,
};

export const STATUS_COLORS: Record<AlertStatus, { color: string; bg: string; label: string }> = {
  activa: { ...NEUTRAL_COLORS.red, label: "Activa" },
  en_seguimiento: { ...NEUTRAL_COLORS.blue, label: "En seguimiento" },
  resuelta: { ...NEUTRAL_COLORS.emerald, label: "Resuelta" },
  ignorada: { ...NEUTRAL_COLORS.gray, label: "Ignorada" },
  reactivada: { ...NEUTRAL_COLORS.purple, label: "Reactivada" },
};
