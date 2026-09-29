// Constantes compartidas de gestión de proyectos (cliente y servidor).

export type BscCode = "FIN" | "CLI" | "INT" | "APR";

export const BSC_PERSPECTIVES: Record<BscCode, { label: string; short: string; color: string }> = {
  FIN: { label: "Resultados económicos", short: "Financiera", color: "#4ade80" },
  CLI: { label: "Posición en el mercado", short: "Clientes", color: "#60a5fa" },
  INT: { label: "Cómo opera la empresa", short: "Procesos", color: "#fbbf24" },
  APR: { label: "Las personas y la cultura", short: "Aprendizaje", color: "#a78bfa" },
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
  { value: "CRITICAL", label: "Urgente", color: "#f87171" },
  { value: "HIGH", label: "Alta", color: "#fb923c" },
  { value: "MEDIUM", label: "Media", color: "#facc15" },
  { value: "LOW", label: "Baja", color: "#94a3b8" },
] as const;

export const PRIORITY_MAP = Object.fromEntries(PRIORITIES.map((p) => [p.value, p])) as Record<
  string,
  (typeof PRIORITIES)[number]
>;

export const PROJECT_STATUS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "En curso", color: "#4ade80" },
  ON_HOLD: { label: "En pausa", color: "#fbbf24" },
  COMPLETED: { label: "Completado", color: "#a78bfa" },
  CANCELLED: { label: "Cancelado", color: "#94a3b8" },
};

export const DEFAULT_WORKFLOW: { name: string; category: StatusCategory; color: string }[] = [
  { name: "Por hacer", category: "TODO", color: "#94a3b8" },
  { name: "En progreso", category: "IN_PROGRESS", color: "#60a5fa" },
  { name: "En revisión", category: "IN_PROGRESS", color: "#fbbf24" },
  { name: "Hecho", category: "DONE", color: "#4ade80" },
];

export const CATEGORY_COLOR: Record<StatusCategory, string> = {
  TODO: "#94a3b8",
  IN_PROGRESS: "#60a5fa",
  DONE: "#4ade80",
};

export function statusColor(s: { color?: string | null; category?: string | null } | null | undefined) {
  if (!s) return CATEGORY_COLOR.TODO;
  return s.color || CATEGORY_COLOR[(s.category as StatusCategory) ?? "TODO"] || CATEGORY_COLOR.TODO;
}

/** Trimestre (Q1..Q4) de un año → rango de fechas. */
export function quarterRange(year: number, quarter: string): { start: Date; end: Date } {
  const q = Math.min(4, Math.max(1, parseInt(quarter.replace(/\D/g, ""), 10) || 1));
  const start = new Date(Date.UTC(year, (q - 1) * 3, 1, 12));
  const end = new Date(Date.UTC(year, q * 3, 0, 12));
  return { start, end };
}

export const PROJECT_COLORS = ["#a78bfa", "#60a5fa", "#4ade80", "#fbbf24", "#f472b6", "#22d3ee", "#fb923c", "#f87171"];

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

const AVATAR_COLORS = ["#a78bfa", "#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#22d3ee", "#fb923c", "#c084fc"];
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
