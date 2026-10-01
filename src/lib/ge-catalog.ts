// ───────────────────────────────────────────────────────────────────────
// Catalogo Matriz de la Gran Estrategia (GE) — 4 cuadrantes
// ───────────────────────────────────────────────────────────────────────

export type GeQuadrant = "I" | "II" | "III" | "IV";

export interface GeStrategy {
  code: string;
  name: string;
  description: string;
  priority: number; // 1 = mas prioritaria
}

export const GE_QUADRANT_INFO: Record<
  GeQuadrant,
  { label: string; subtitle: string; color: string; bg: string; border: string; description: string }
> = {
  I: {
    label: "Cuadrante I — Escenario ideal",
    subtitle: "Posicion fuerte + Mercado en crecimiento rapido",
    color: "#1e7f4f",
    bg: "rgba(22,163,74,0.12)",
    border: "rgba(22,163,74,0.45)",
    description:
      "Tu empresa tiene la suerte de operar en un mercado en rapido crecimiento y ademas contar con una posicion competitiva solida. Es momento de aprovechar la ventana de oportunidad e invertir en expansion.",
  },
  II: {
    label: "Cuadrante II — Mercado bueno, empresa debil",
    subtitle: "Posicion debil + Mercado en crecimiento rapido",
    color: "#2c2e35",
    bg: "rgba(44, 46, 53,0.12)",
    border: "rgba(44, 46, 53,0.45)",
    description:
      "El mercado donde compites esta creciendo, pero tu posicion competitiva es debil. Tienes una decision importante: invertir agresivamente para fortalecerte, o considerar salir antes de quemar mas recursos.",
  },
  III: {
    label: "Cuadrante III — Escenario critico",
    subtitle: "Posicion debil + Mercado lento",
    color: "#b3261e",
    bg: "rgba(220,38,38,0.12)",
    border: "rgba(220,38,38,0.45)",
    description:
      "Operas en un mercado que no crece y tu posicion es debil. Es el escenario mas complicado. Las estrategias defensivas y de salida bien ejecutadas pueden generar valor y financiar nuevas apuestas.",
  },
  IV: {
    label: "Cuadrante IV — Empresa solida en mercado maduro",
    subtitle: "Posicion fuerte + Mercado lento",
    color: "#b45309",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.45)",
    description:
      "Eres una empresa solida pero el mercado donde compites esta maduro. Tienes caja y capacidades, pero poco espacio para crecer en tu industria actual. Es momento de diversificar o expandirte.",
  },
};

export function quadrantFromScores(growth: number, position: number, growthThreshold: number, positionThreshold: number): GeQuadrant {
  const fastGrowth = growth >= growthThreshold;
  const strongPosition = position >= positionThreshold;
  if (fastGrowth && strongPosition) return "I";
  if (fastGrowth && !strongPosition) return "II";
  if (!fastGrowth && !strongPosition) return "III";
  return "IV";
}

export const STRATEGIES_BY_QUADRANT: Record<GeQuadrant, GeStrategy[]> = {
  I: [
    { code: "DM",  priority: 1, name: "Desarrollo de mercado",       description: "Lleva tus productos actuales a nuevos territorios o segmentos. Aprovecha el momento favorable del mercado para escalar." },
    { code: "PM",  priority: 2, name: "Penetracion de mercado",      description: "Aumenta tu cuota en mercados donde ya operas: refuerza marketing, fuerza de ventas, promociones y lealtad de clientes." },
    { code: "DP",  priority: 3, name: "Desarrollo de producto",      description: "Lanza nuevos productos o versiones mejoradas para clientes actuales. Apoyate en tu posicion para innovar." },
    { code: "IA",  priority: 4, name: "Integracion hacia adelante",  description: "Toma control de canales/distribuidores para llegar mejor al cliente final y capturar mas margen." },
    { code: "IB",  priority: 5, name: "Integracion hacia atras",     description: "Adquiere o controla a tus proveedores criticos para asegurar suministro y mejorar margenes." },
    { code: "IH",  priority: 6, name: "Integracion horizontal",      description: "Adquiere o aliate con competidores directos para consolidar mercado y aumentar poder de negociacion." },
    { code: "DC",  priority: 7, name: "Diversificacion concentrica", description: "Lanza productos relacionados en mercados afines aprovechando capacidades existentes." },
  ],
  II: [
    { code: "DM",  priority: 1, name: "Desarrollo de mercado",       description: "El mercado crece. Llevar lo que ya tienes a nuevos segmentos puede darte tiempo para fortalecerte." },
    { code: "PM",  priority: 2, name: "Penetracion de mercado",      description: "Refuerza tu cuota en lo que ya conoces antes de buscar nuevos frentes." },
    { code: "DP",  priority: 3, name: "Desarrollo de producto",      description: "Mejora tu oferta actual para diferenciarte y reducir la brecha competitiva." },
    { code: "IH",  priority: 4, name: "Integracion horizontal",      description: "Aliate o adquiere competidores para ganar masa critica rapidamente." },
    { code: "DI",  priority: 5, name: "Desinversion",                description: "Vende unidades poco rentables para concentrar recursos en donde tengas mas chance de competir." },
    { code: "LQ",  priority: 6, name: "Liquidacion",                 description: "Si fortalecerse no es viable, considera liquidacion ordenada antes de quemar mas recursos." },
  ],
  III: [
    { code: "RC",  priority: 1, name: "Reduccion / atrincheramiento", description: "Recorta gastos no esenciales y concentrate en lo nuclear para mantener viabilidad." },
    { code: "DR",  priority: 2, name: "Diversificacion relacionada",  description: "Busca nuevos negocios afines que aprovechen tus capacidades existentes." },
    { code: "DNR", priority: 3, name: "Diversificacion no relacionada", description: "Si lo afin no funciona, evalua entrar a sectores totalmente nuevos donde puedas ganar." },
    { code: "DI",  priority: 4, name: "Desinversion",                description: "Vende unidades para liberar caja y reasignar recursos a apuestas con mejor futuro." },
    { code: "LQ",  priority: 5, name: "Liquidacion",                 description: "En el escenario mas critico, liquidacion ordenada antes de que la situacion empeore." },
  ],
  IV: [
    { code: "DR",  priority: 1, name: "Diversificacion relacionada",   description: "Aprovecha tu fortaleza para entrar a negocios afines que ofrezcan mas crecimiento." },
    { code: "DNR", priority: 2, name: "Diversificacion no relacionada",description: "Considera sectores totalmente nuevos para reducir dependencia del mercado maduro." },
    { code: "DH",  priority: 3, name: "Diversificacion horizontal",   description: "Lanza productos para tus mismos clientes en lineas adyacentes." },
    { code: "JV",  priority: 4, name: "Joint ventures / alianzas",    description: "Asocia con otros para entrar a nuevos negocios o geografias compartiendo riesgo." },
    { code: "EI",  priority: 5, name: "Expansion internacional",      description: "Lleva tu posicion solida a mercados externos donde la industria aun crezca." },
  ],
};

export function compareWithOtherMatrices(
  geQuadrant: GeQuadrant,
  peyeaQuadrant: string | null,
): { aligned: boolean; message: string } {
  if (!peyeaQuadrant) return { aligned: true, message: "Sin datos PEYEA para comparar" };
  // Matrix de coherencia simple
  const aligned: Record<GeQuadrant, string[]> = {
    I: ["agresivo"],
    II: ["competitivo", "conservador"],
    III: ["defensivo"],
    IV: ["conservador"],
  };
  const isAligned = aligned[geQuadrant].includes(peyeaQuadrant);
  return {
    aligned: isAligned,
    message: isAligned
      ? `GE (${geQuadrant}) y PEYEA (${peyeaQuadrant}) son coherentes`
      : `GE sugiere cuadrante ${geQuadrant} pero PEYEA sugirio postura ${peyeaQuadrant}. Revisar inconsistencia.`,
  };
}
