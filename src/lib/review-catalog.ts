// Catálogo cliente-safe. NO importa nada de server.

export type ReviewType = "mensual" | "trimestral" | "semestral" | "anual" | "extraordinaria";
export type ReviewStatus =
  | "programada"
  | "en_curso"
  | "completada"
  | "cancelada"
  | "reprogramada";
export type AttendanceStatus =
  | "invitado"
  | "confirmado"
  | "presente"
  | "ausente"
  | "ausente_justificado";
export type DecisionType = "estrategica" | "tactica" | "operativa";
export type ActionStatus = "pendiente" | "en_curso" | "completada" | "cancelada";
export type ActionPriority = "alta" | "media" | "baja";

export interface ReviewTypeDef {
  key: ReviewType;
  label: string;
  shortLabel: string;
  description: string;
  attendees: string;
  duration: string;
  color: string;
  bg: string;
  icon: string;
}

export const REVIEW_TYPES: ReviewTypeDef[] = [
  {
    key: "mensual",
    label: "Revisión Mensual",
    shortLabel: "Mensual",
    description: "OCPs y avances operativos del mes.",
    attendees: "Gerencias funcionales + Dirección operaciones",
    duration: "60-90 min",
    color: "#85B7EB",
    bg: "transparent",
    icon: "Calendar",
  },
  {
    key: "trimestral",
    label: "Revisión Trimestral",
    shortLabel: "Trimestral",
    description: "KPIs por dimensión BSC del trimestre.",
    attendees: "Comité ejecutivo (CEO + VPs)",
    duration: "2-3 horas",
    color: "#60a5fa",
    bg: "rgba(167, 139, 250, 0.08)",
    icon: "CalendarRange",
  },
  {
    key: "semestral",
    label: "Revisión Semestral",
    shortLabel: "Semestral",
    description: "Estrategias retenidas y políticas organizacionales.",
    attendees: "Directorio + Comité ejecutivo",
    duration: "Medio día",
    color: "#a78bfa",
    bg: "rgba(167, 139, 250, 0.08)",
    icon: "CalendarClock",
  },
  {
    key: "anual",
    label: "Revisión Anual",
    shortLabel: "Anual",
    description: "OLPs y visión completa del plan. Cierre del ciclo.",
    attendees: "Directorio completo + Comité ejecutivo",
    duration: "1-2 días",
    color: "#4ade80",
    bg: "transparent",
    icon: "CalendarHeart",
  },
  {
    key: "extraordinaria",
    label: "Revisión Extraordinaria",
    shortLabel: "Extraordinaria",
    description: "Convocada fuera del calendario regular.",
    attendees: "Definidos por la convocatoria",
    duration: "Variable",
    color: "#f87171",
    bg: "transparent",
    icon: "AlertCircle",
  },
];

export function getReviewTypeDef(key: string): ReviewTypeDef | undefined {
  return REVIEW_TYPES.find((t) => t.key === key);
}

import { URGENCY, NEUTRAL_COLORS } from "./colors";

export const STATUS_COLORS: Record<ReviewStatus, { color: string; bg: string; label: string }> = {
  programada: { color: "#0EA5E9", bg: "rgba(167, 139, 250, 0.08)", label: "Programada" },
  en_curso: { ...NEUTRAL_COLORS.emerald, label: "En curso" },
  completada: { ...NEUTRAL_COLORS.gray, label: "Completada" },
  cancelada: { ...NEUTRAL_COLORS.red, label: "Cancelada" },
  reprogramada: { ...NEUTRAL_COLORS.amber, label: "Reprogramada" },
};

export const PRIORITY_COLORS: Record<ActionPriority, { color: string; bg: string; label: string }> = {
  alta: URGENCY.alta,
  media: URGENCY.media,
  baja: URGENCY.baja,
};

export const ACTION_STATUS_COLORS: Record<ActionStatus, { color: string; bg: string; label: string }> = {
  pendiente: { ...NEUTRAL_COLORS.gray, label: "Pendiente" },
  en_curso: { ...NEUTRAL_COLORS.blue, label: "En curso" },
  completada: { ...NEUTRAL_COLORS.emerald, label: "Completada" },
  cancelada: { ...NEUTRAL_COLORS.red, label: "Cancelada" },
};

// ───────────────────────────────────────────────────────────────────────
// Plantillas estándar de agenda (estructura base; el engine añade dinámicas)
// ───────────────────────────────────────────────────────────────────────

export interface AgendaTemplateItem {
  title: string;
  description?: string;
  assignedMinutes: number;
  itemType:
    | "bienvenida"
    | "snapshot_bsc"
    | "alertas"
    | "kpis_dimension"
    | "ocps_incumplidos"
    | "estrategia"
    | "politica"
    | "decision"
    | "accion"
    | "otros";
  children?: AgendaTemplateItem[];
}

export const AGENDA_TEMPLATES: Record<Exclude<ReviewType, "extraordinaria">, AgendaTemplateItem[]> = {
  mensual: [
    { title: "Bienvenida y verificación de quórum", assignedMinutes: 5, itemType: "bienvenida" },
    { title: "Aprobación de acta anterior", assignedMinutes: 5, itemType: "otros" },
    {
      title: "Avances del mes",
      assignedMinutes: 30,
      itemType: "ocps_incumplidos",
      children: [
        { title: "OCPs cumplidos", assignedMinutes: 10, itemType: "otros" },
        { title: "OCPs en alerta o críticos", assignedMinutes: 15, itemType: "ocps_incumplidos" },
        { title: "Hitos incumplidos del mes anterior", assignedMinutes: 5, itemType: "otros" },
      ],
    },
    { title: "Acciones pendientes de revisión anterior", assignedMinutes: 10, itemType: "accion" },
    { title: "Análisis de causas y planes de contención", assignedMinutes: 20, itemType: "otros" },
    { title: "Nuevas acciones correctivas", assignedMinutes: 10, itemType: "accion" },
    { title: "Cierre y próxima revisión", assignedMinutes: 5, itemType: "otros" },
  ],
  trimestral: [
    { title: "Bienvenida y verificación de quórum", assignedMinutes: 10, itemType: "bienvenida" },
    { title: "Aprobación de acta anterior", assignedMinutes: 10, itemType: "otros" },
    { title: "Snapshot del Tablero BSC", assignedMinutes: 20, itemType: "snapshot_bsc" },
    {
      title: "Revisión por dimensión BSC",
      assignedMinutes: 60,
      itemType: "kpis_dimension",
      children: [
        { title: "Resultados económicos", assignedMinutes: 15, itemType: "kpis_dimension" },
        { title: "Posición mercado", assignedMinutes: 15, itemType: "kpis_dimension" },
        { title: "Cómo opera la empresa", assignedMinutes: 15, itemType: "kpis_dimension" },
        { title: "Personas y cultura", assignedMinutes: 15, itemType: "kpis_dimension" },
      ],
    },
    { title: "Alertas estratégicas críticas", assignedMinutes: 20, itemType: "alertas" },
    { title: "KPIs con tendencia negativa sostenida", assignedMinutes: 15, itemType: "alertas" },
    { title: "OCPs trimestrales no cumplidos", assignedMinutes: 15, itemType: "ocps_incumplidos" },
    { title: "Acciones pendientes acumuladas", assignedMinutes: 10, itemType: "accion" },
    { title: "Decisiones del comité", assignedMinutes: 15, itemType: "decision" },
    { title: "Nuevas acciones correctivas", assignedMinutes: 10, itemType: "accion" },
    { title: "Cierre y próxima revisión", assignedMinutes: 5, itemType: "otros" },
  ],
  semestral: [
    { title: "Bienvenida y verificación de quórum", assignedMinutes: 15, itemType: "bienvenida" },
    { title: "Aprobación de acta anterior", assignedMinutes: 10, itemType: "otros" },
    {
      title: "Cumplimiento por estrategia retenida",
      assignedMinutes: 60,
      itemType: "estrategia",
      children: [],
    },
    { title: "Validación: ¿siguen vigentes las estrategias?", assignedMinutes: 30, itemType: "estrategia" },
    { title: "Políticas con bajo cumplimiento", assignedMinutes: 20, itemType: "politica" },
    { title: "OLPs con proyección en riesgo", assignedMinutes: 30, itemType: "alertas" },
    { title: "Discusión de ajustes estratégicos", assignedMinutes: 45, itemType: "otros" },
    { title: "Decisiones del directorio + comité", assignedMinutes: 30, itemType: "decision" },
    { title: "Nuevas acciones correctivas", assignedMinutes: 15, itemType: "accion" },
    { title: "Cierre y próxima revisión", assignedMinutes: 10, itemType: "otros" },
  ],
  anual: [
    { title: "Bienvenida y verificación de quórum", assignedMinutes: 20, itemType: "bienvenida" },
    { title: "Aprobación de acta anterior", assignedMinutes: 15, itemType: "otros" },
    {
      title: "Cumplimiento anual completo",
      assignedMinutes: 90,
      itemType: "snapshot_bsc",
      children: [
        { title: "Por OLP", assignedMinutes: 40, itemType: "otros" },
        { title: "Por dimensión BSC", assignedMinutes: 30, itemType: "kpis_dimension" },
        { title: "Resultados financieros", assignedMinutes: 20, itemType: "otros" },
      ],
    },
    { title: "Análisis real vs plan", assignedMinutes: 45, itemType: "otros" },
    { title: "Lecciones aprendidas del año", assignedMinutes: 60, itemType: "otros" },
    {
      title: "Estado del horizonte estratégico",
      assignedMinutes: 60,
      itemType: "estrategia",
      children: [
        { title: "¿Sigue vigente el plan?", assignedMinutes: 20, itemType: "estrategia" },
        { title: "¿Se requiere ajustar OLPs?", assignedMinutes: 20, itemType: "estrategia" },
        { title: "¿Iniciar nuevo ciclo?", assignedMinutes: 20, itemType: "estrategia" },
      ],
    },
    { title: "Decisiones del directorio", assignedMinutes: 60, itemType: "decision" },
    { title: "Plan del siguiente año", assignedMinutes: 45, itemType: "otros" },
    { title: "Acciones correctivas", assignedMinutes: 20, itemType: "accion" },
    { title: "Cierre y proyección del próximo año", assignedMinutes: 15, itemType: "otros" },
  ],
};

export function periodLabel(type: ReviewType, date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  if (type === "mensual") return `${y}-${String(m).padStart(2, "0")}`;
  if (type === "trimestral") return `${y}-Q${Math.ceil(m / 3)}`;
  if (type === "semestral") return `${y}-H${m <= 6 ? 1 : 2}`;
  if (type === "anual") return String(y);
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function defaultTitle(type: ReviewType, date: Date): string {
  const def = getReviewTypeDef(type);
  const period = periodLabel(type, date);
  return `${def?.label ?? "Revisión"} ${period}`;
}
