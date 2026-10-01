// Paleta central de colores semánticos. Importar desde aquí para mantener
// consistencia entre catálogos (alerts, reviews, kpis, etc).

export const SEMAFORO = {
  verde: { color: "#1e7f4f", bg: "transparent", label: "Verde" },
  ambar: { color: "#b45309", bg: "transparent", label: "Ámbar" },
  rojo: { color: "#b3261e", bg: "transparent", label: "Rojo" },
  sin_dato: { color: "#6b6b6b", bg: "transparent", label: "Sin dato" },
} as const;

export const URGENCY = {
  alta: { color: "#b3261e", bg: "transparent", label: "Alta" },
  media: { color: "#b45309", bg: "transparent", label: "Media" },
  baja: { color: "#0369a1", bg: "transparent", label: "Baja" },
} as const;

export const NEUTRAL_COLORS = {
  gray: { color: "#a8a29e", bg: "transparent" },
  blue: { color: "#0369a1", bg: "transparent" },
  emerald: { color: "#1e7f4f", bg: "transparent" },
  amber: { color: "#b45309", bg: "transparent" },
  red: { color: "#b3261e", bg: "transparent" },
  purple: { color: "#a14a3f", bg: "transparent" },
} as const;
