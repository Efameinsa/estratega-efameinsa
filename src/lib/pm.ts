// Constantes compartidas de gestión de proyectos (cliente y servidor).

export type BscCode = "FIN" | "CLI" | "INT" | "APR";

export const BSC_PERSPECTIVES: Record<BscCode, { label: string; short: string; color: string }> = {
  FIN: { label: "Resultados económicos", short: "Financiera", color: "#1e7f4f" },
  CLI: { label: "Posición en el mercado", short: "Clientes", color: "#185fa5" },
  INT: { label: "Cómo opera la empresa", short: "Procesos", color: "#b45309" },
  APR: { label: "Las personas y la cultura", short: "Aprendizaje", color: "#8B1510" },
};

export const BSC_ORDER: BscCode[] = ["FIN", "CLI", "INT", "APR"];

export function toBscCode(value: string | null | undefined): BscCode {
  const v = (value ?? "").toUpperCase();
  if (v === "FIN" || v === "CLI" || v === "INT" || v === "APR") return v;
  const lower = (value ?? "").toLowerCase();
  if (lower.startsWith("clien") || lower.includes("mercado")) return "CLI";
  if (lower.startsWith("proces") || lower.includes("opera")) return "INT";
  if (lower.startsWith("aprend") || lower.includes("persona")) return "APR";
  return "FIN";
}

export type StatusCategory = "TODO" | "IN_PROGRESS" | "DONE";

export const PRIORITIES = [
  { value: "CRITICAL", label: "Urgente", color: "#b3261e" },
  { value: "HIGH", label: "Alta", color: "#c2410c" },
  { value: "MEDIUM", label: "Media", color: "#facc15" },
  { value: "LOW", label: "Baja", color: "#64748b" },
] as const;

export const PRIORITY_MAP = Object.fromEntries(PRIORITIES.map((p) => [p.value, p])) as Record<
  string,
  (typeof PRIORITIES)[number]
>;

export const PROJECT_STATUS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "En curso", color: "#1e7f4f" },
  ON_HOLD: { label: "En pausa", color: "#b45309" },
  COMPLETED: { label: "Completado", color: "#8B1510" },
  CANCELLED: { label: "Cancelado", color: "#64748b" },
};

export const DEFAULT_WORKFLOW: { name: string; category: StatusCategory; color: string }[] = [
  { name: "Por hacer", category: "TODO", color: "#64748b" },
  { name: "En progreso", category: "IN_PROGRESS", color: "#185fa5" },
  { name: "En revisión", category: "IN_PROGRESS", color: "#b45309" },
  { name: "Hecho", category: "DONE", color: "#1e7f4f" },
];

export const CATEGORY_COLOR: Record<StatusCategory, string> = {
  TODO: "#64748b",
  IN_PROGRESS: "#185fa5",
  DONE: "#1e7f4f",
};

export function statusColor(s: { color?: string | null; category?: string | null } | null | undefined) {
  if (!s) return CATEGORY_COLOR.TODO;
  return colorDeMarca(s.color) || CATEGORY_COLOR[(s.category as StatusCategory) ?? "TODO"] || CATEGORY_COLOR.TODO;
}

/** Trimestre (Q1..Q4) de un año → rango de fechas. */
export function quarterRange(year: number, quarter: string): { start: Date; end: Date } {
  const q = Math.min(4, Math.max(1, parseInt(quarter.replace(/\D/g, ""), 10) || 1));
  const start = new Date(Date.UTC(year, (q - 1) * 3, 1, 12));
  const end = new Date(Date.UTC(year, q * 3, 0, 12));
  return { start, end };
}

/**
 * Los colores ya guardados en la base (proyectos, estados, ejes) salieron de la
 * paleta del tema oscuro morado: pasteles que sobre blanco no se leen y un
 * lavanda que no es de la marca. Se traducen al mostrarlos, sin tocar los datos.
 */
const COLOR_HEREDADO: Record<string, string> = {
  "#a78bfa": "#8B1510", "#c084fc": "#a14a3f", "#8b5cf6": "#2c2e35", "#818cf8": "#475569",
  "#60a5fa": "#185fa5", "#4ade80": "#1e7f4f", "#34d399": "#1e7f4f", "#fbbf24": "#b45309",
  "#f472b6": "#be185d", "#22d3ee": "#0e7490", "#fb923c": "#c2410c", "#f87171": "#b3261e",
  "#94a3b8": "#64748b",
};
export function colorDeMarca<T extends string | null | undefined>(color: T): T | string {
  if (!color) return color;
  return COLOR_HEREDADO[color.toLowerCase()] ?? color;
}

export const PROJECT_COLORS = ["#8B1510", "#185fa5", "#1e7f4f", "#b45309", "#be185d", "#0e7490", "#c2410c", "#b3261e"];

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

const AVATAR_COLORS = ["#8B1510", "#185fa5", "#1e7f4f", "#b45309", "#be185d", "#0e7490", "#c2410c", "#a14a3f"];
export function avatarColor(id: string | null | undefined): string {
  if (!id) return "#6b7280";
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const STOPWORDS = new Set(["las", "los", "del", "con", "para", "por", "una", "uno", "que", "sus", "the", "and", "en", "de", "la", "el", "al", "y"]);

/** Iniciales para el ícono del proyecto (ignora el prefijo «OCP1.1 ·» de los generados). */
export function projectInitials(p: { name: string; key: string }): string {
  const clean = p.name.replace(/^[A-Z]+\d+(\.\d+)?\s*·\s*/, "").trim();
  const words = clean
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/\s+/)
    .filter((w) => !STOPWORDS.has(w.toLowerCase()) && (w.length > 2 || /^[A-Z0-9]+$/.test(w)));
  const ini = ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
  return ini || p.key.slice(0, 2);
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
