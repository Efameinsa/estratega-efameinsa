// Paleta central de colores semánticos. Importar desde aquí para mantener
// consistencia entre catálogos (alerts, reviews, kpis, etc).

export const SEMAFORO = {
  verde: { color: "#4ade80", bg: "transparent", label: "Verde" },
  ambar: { color: "#fbbf24", bg: "transparent", label: "Ámbar" },
  rojo: { color: "#f87171", bg: "transparent", label: "Rojo" },
  sin_dato: { color: "#a8a29e", bg: "transparent", label: "Sin dato" },
} as const;

export const URGENCY = {
  alta: { color: "#f87171", bg: "transparent", label: "Alta" },
  media: { color: "#fbbf24", bg: "transparent", label: "Media" },
  baja: { color: "#38bdf8", bg: "transparent", label: "Baja" },
} as const;

export const NEUTRAL_COLORS = {
  gray: { color: "#a8a29e", bg: "transparent" },
  blue: { color: "#38bdf8", bg: "transparent" },
  emerald: { color: "#4ade80", bg: "transparent" },
  amber: { color: "#fbbf24", bg: "transparent" },
  red: { color: "#f87171", bg: "transparent" },
  purple: { color: "#c084fc", bg: "transparent" },
} as const;
