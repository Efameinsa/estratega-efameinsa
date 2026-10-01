// ───────────────────────────────────────────────────────────────────────
// Clasificacion D'Alessio de estrategias (4 grupos, 13 tipos)
// ───────────────────────────────────────────────────────────────────────

export type DalessioGroup = "intensivas" | "integracion" | "diversificacion" | "defensivas";

export type DalessioType =
  | "penetracion_mercado"
  | "desarrollo_mercado"
  | "desarrollo_producto"
  | "integracion_adelante"
  | "integracion_atras"
  | "integracion_horizontal"
  | "diversificacion_concentrica"
  | "diversificacion_conglomerada"
  | "diversificacion_horizontal"
  | "aventura_conjunta"
  | "atrincheramiento"
  | "desinversion"
  | "liquidacion";

export interface DalessioTypeDef {
  key: DalessioType;
  group: DalessioGroup;
  label: string;
  description: string;
}

export const DALESSIO_TYPES: DalessioTypeDef[] = [
  // Intensivas
  { key: "penetracion_mercado",   group: "intensivas", label: "Penetracion de mercado",   description: "Ganar mas cuota con productos actuales en mercados actuales." },
  { key: "desarrollo_mercado",    group: "intensivas", label: "Desarrollo de mercado",    description: "Llevar productos actuales a nuevos mercados o segmentos." },
  { key: "desarrollo_producto",   group: "intensivas", label: "Desarrollo de producto",   description: "Lanzar nuevos productos o versiones mejoradas para clientes actuales." },
  // Integracion
  { key: "integracion_adelante",  group: "integracion", label: "Integracion hacia adelante",  description: "Tomar control de canales/distribuidores." },
  { key: "integracion_atras",     group: "integracion", label: "Integracion hacia atras",     description: "Adquirir o controlar proveedores criticos." },
  { key: "integracion_horizontal",group: "integracion", label: "Integracion horizontal",      description: "Adquirir o aliarse con competidores directos." },
  // Diversificacion
  { key: "diversificacion_concentrica",  group: "diversificacion", label: "Diversificacion concentrica",   description: "Lanzar productos relacionados en mercados afines." },
  { key: "diversificacion_conglomerada", group: "diversificacion", label: "Diversificacion conglomerada",  description: "Entrar a sectores totalmente nuevos." },
  { key: "diversificacion_horizontal",   group: "diversificacion", label: "Diversificacion horizontal",    description: "Nuevos productos para clientes actuales en lineas adyacentes." },
  // Defensivas
  { key: "aventura_conjunta", group: "defensivas", label: "Aventura conjunta / Joint venture", description: "Asociarse para compartir riesgo y recursos." },
  { key: "atrincheramiento",  group: "defensivas", label: "Atrincheramiento",                  description: "Reducir gastos y concentrarse en lo nuclear." },
  { key: "desinversion",      group: "defensivas", label: "Desinversion",                      description: "Vender unidades de negocio para liberar caja." },
  { key: "liquidacion",       group: "defensivas", label: "Liquidacion",                       description: "Cierre ordenado de la operacion." },
];

export const GROUP_INFO: Record<DalessioGroup, { label: string; color: string; bg: string; border: string }> = {
  intensivas:      { label: "Intensivas",      color: "#1e7f4f", bg: "rgba(22,163,74,0.08)",  border: "rgba(22,163,74,0.35)" },
  integracion:     { label: "De integracion",  color: "#185fa5", bg: "rgba(37,99,235,0.08)",  border: "rgba(37,99,235,0.35)" },
  diversificacion: { label: "De diversificacion", color: "#2c2e35", bg: "rgba(44, 46, 53,0.08)", border: "rgba(44, 46, 53,0.35)" },
  defensivas:      { label: "Defensivas",      color: "#b45309", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.35)" },
};

export function getTypeDef(key: string | null | undefined): DalessioTypeDef | null {
  if (!key) return null;
  return DALESSIO_TYPES.find((t) => t.key === key) ?? null;
}

export function typesByGroup(group: DalessioGroup): DalessioTypeDef[] {
  return DALESSIO_TYPES.filter((t) => t.group === group);
}

// ───────────────────────────────────────────────────────────────────────
// Inferencia automatica: analizar texto/codigo para sugerir tipo
// ───────────────────────────────────────────────────────────────────────

const KEYWORD_MAP: Array<{ type: DalessioType; keywords: string[] }> = [
  { type: "penetracion_mercado",   keywords: ["penetracion", "penetrar", "ganar cuota", "aumentar cuota", "fidelizar", "lealtad"] },
  { type: "desarrollo_mercado",    keywords: ["nuevos mercados", "nuevo segmento", "expandir geografic", "internacional", "exportar"] },
  { type: "desarrollo_producto",   keywords: ["nuevo producto", "nueva version", "innovar producto", "lanzar producto", "linea nueva"] },
  { type: "integracion_adelante",  keywords: ["adelante", "canal", "distribucion propia", "tienda propia", "directo al consumidor"] },
  { type: "integracion_atras",     keywords: ["atras", "proveedor", "suministro", "materia prima"] },
  { type: "integracion_horizontal",keywords: ["horizontal", "competidor", "adquirir empresa", "fusion", "merger"] },
  { type: "diversificacion_concentrica",  keywords: ["concentric", "producto relacionado", "sinergia", "afin"] },
  { type: "diversificacion_conglomerada", keywords: ["conglomerada", "sector nuevo", "negocio nuevo", "no relacionado"] },
  { type: "diversificacion_horizontal",   keywords: ["diversificacion horizontal", "linea adyacente", "complementario"] },
  { type: "aventura_conjunta", keywords: ["joint venture", "aventura conjunta", "alianza", "asociar", "partner"] },
  { type: "atrincheramiento",  keywords: ["atrincher", "reducir gastos", "recortar", "concentrar", "reestructur"] },
  { type: "desinversion",      keywords: ["desinver", "vender unidad", "vender negocio", "spin off"] },
  { type: "liquidacion",       keywords: ["liquid", "cerrar"] },
];

export function inferDalessioType(text: string, currentType?: string | null): DalessioType | null {
  // Si el tipo viene del catalogo PEYEA/GE/etc., mapear
  if (currentType) {
    const normalized = currentType.toLowerCase();
    if (normalized.includes("penetracion")) return "penetracion_mercado";
    if (normalized.includes("desarrollo de mercado")) return "desarrollo_mercado";
    if (normalized.includes("desarrollo de producto")) return "desarrollo_producto";
    if (normalized.includes("integracion hacia adelante")) return "integracion_adelante";
    if (normalized.includes("integracion hacia atras")) return "integracion_atras";
    if (normalized.includes("integracion horizontal")) return "integracion_horizontal";
    if (normalized.includes("diversificacion concentrica")) return "diversificacion_concentrica";
    if (normalized.includes("diversificacion conglomerada")) return "diversificacion_conglomerada";
    if (normalized.includes("diversificacion horizontal")) return "diversificacion_horizontal";
    if (normalized.includes("alianza") || normalized.includes("joint")) return "aventura_conjunta";
    if (normalized.includes("atrincheramiento") || normalized.includes("reduccion")) return "atrincheramiento";
    if (normalized.includes("desinversion")) return "desinversion";
    if (normalized.includes("liquidacion")) return "liquidacion";
  }

  // Inferencia por keywords del texto
  const lower = text.toLowerCase();
  let best: { type: DalessioType; score: number } | null = null;
  for (const m of KEYWORD_MAP) {
    let score = 0;
    for (const kw of m.keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > 0 && (!best || score > best.score)) best = { type: m.type, score };
  }
  return best?.type ?? null;
}
