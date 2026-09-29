// ───────────────────────────────────────────────────────────────────────
// Catalogo Matriz IE (Interna-Externa) — 9 celdas, 3 regiones
// ───────────────────────────────────────────────────────────────────────

export type IeCell =
  | "I" | "II" | "III"
  | "IV" | "V" | "VI"
  | "VII" | "VIII" | "IX";

export type IeRegion = "crecer" | "conservar" | "cosechar";

export interface IeStrategy {
  code: string;
  name: string;
  description: string;
  priority: "alta" | "media" | "baja";
}

export const REGION_INFO: Record<
  IeRegion,
  { label: string; color: string; bg: string; border: string; subtitle: string; description: string }
> = {
  crecer: {
    label: "Crecer y construir",
    color: "#16A34A",
    bg: "rgba(22,163,74,0.10)",
    border: "rgba(22,163,74,0.40)",
    subtitle: "Estrategias intensivas e integrativas",
    description:
      "Estas en una posicion favorable. Aprovecha las condiciones para crecer agresivamente, ganar cuota y consolidar capacidades.",
  },
  conservar: {
    label: "Conservar y mantener",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.40)",
    subtitle: "Estrategias de cautela",
    description:
      "Posicion intermedia. Crece selectivamente y refuerza tu base antes de mover apuestas grandes.",
  },
  cosechar: {
    label: "Cosechar o desinvertir",
    color: "#DC2626",
    bg: "rgba(220,38,38,0.10)",
    border: "rgba(220,38,38,0.40)",
    subtitle: "Estrategias defensivas",
    description:
      "Posicion debil en entorno adverso. Reduce, recupera caja y reasigna recursos hacia donde tengas mejor chance.",
  },
};

// Tramo segun puntaje 1-4
export function tramo(score: number): "bajo" | "medio" | "alto" {
  if (score < 2) return "bajo";
  if (score < 3) return "medio";
  return "alto";
}

export function tramoLabel(t: "bajo" | "medio" | "alto"): string {
  return t === "bajo" ? "Bajo (1.0 - 1.99)" : t === "medio" ? "Medio (2.0 - 2.99)" : "Alto (3.0 - 4.0)";
}

// Mapeo de (mefi tramo, mefe tramo) → celda
export function celdaFromScores(mefi: number, mefe: number): IeCell {
  const i = tramo(mefi); // x
  const e = tramo(mefe); // y
  // Convencion del spec:
  //          MEFI Alto    MEFI Medio   MEFI Bajo
  // MEFE Alto    I            II           III
  // MEFE Medio   IV           V            VI
  // MEFE Bajo    VII          VIII         IX
  const map: Record<string, IeCell> = {
    "alto-alto": "I",
    "medio-alto": "II",
    "bajo-alto": "III",
    "alto-medio": "IV",
    "medio-medio": "V",
    "bajo-medio": "VI",
    "alto-bajo": "VII",
    "medio-bajo": "VIII",
    "bajo-bajo": "IX",
  };
  return map[`${i}-${e}`] ?? "V";
}

export function regionFromCell(cell: IeCell): IeRegion {
  // I, II, IV → crecer
  // III, V, VII → conservar
  // VI, VIII, IX → cosechar
  if (["I", "II", "IV"].includes(cell)) return "crecer";
  if (["III", "V", "VII"].includes(cell)) return "conservar";
  return "cosechar";
}

export function cellMeaning(cell: IeCell): string {
  const map: Record<IeCell, string> = {
    I: "Posicion interna fuerte en entorno externo alto — escenario optimo",
    II: "Posicion interna media en entorno externo alto — gran oportunidad",
    III: "Posicion interna debil en entorno externo alto — protege oportunidades",
    IV: "Posicion interna fuerte en entorno externo medio — base para crecer",
    V: "Posicion interna media en entorno externo medio — selectividad",
    VI: "Posicion interna debil en entorno externo medio — cosecha selectiva",
    VII: "Posicion interna fuerte en entorno externo bajo — defiende ventajas",
    VIII: "Posicion interna media en entorno externo bajo — cosecha",
    IX: "Posicion interna debil en entorno externo bajo — cosecha o desinvierte",
  };
  return map[cell];
}

// Estrategias por region
export const STRATEGIES_BY_REGION: Record<IeRegion, IeStrategy[]> = {
  crecer: [
    { code: "PM", name: "Penetracion de mercado", priority: "alta", description: "Aumenta tu cuota en mercados donde ya operas con productos actuales: refuerza marketing, fuerza de ventas, promociones y lealtad de clientes existentes." },
    { code: "DM", name: "Desarrollo de mercado", priority: "alta", description: "Lleva tus productos actuales a nuevos territorios geograficos o nuevos segmentos de clientes. Aprovecha el momento favorable del entorno." },
    { code: "DP", name: "Desarrollo de producto", priority: "alta", description: "Lanza nuevos productos o versiones mejoradas para los clientes que ya tienes. Apoyate en tu posicion para innovar." },
    { code: "IB", name: "Integracion hacia atras", priority: "media", description: "Adquiere o controla a tus proveedores criticos para asegurar suministro, mejorar margenes y reducir dependencia." },
    { code: "IA", name: "Integracion hacia adelante", priority: "media", description: "Toma control de canales/distribuidores para llegar mejor al cliente final y capturar mas margen del valor entregado." },
    { code: "IH", name: "Integracion horizontal", priority: "media", description: "Adquiere o aliate con competidores directos para consolidar mercado y aumentar poder de negociacion." },
  ],
  conservar: [
    { code: "PM-C", name: "Penetracion de mercado (cuidadosa)", priority: "alta", description: "Crece en lo que ya conoces sin asumir grandes riesgos. Optimiza la operacion existente antes de buscar nuevos frentes." },
    { code: "DP-C", name: "Desarrollo de productos (selectivo)", priority: "media", description: "Mejora tu oferta actual con cambios incrementales que refuercen tu posicion sin compromenter recursos." },
  ],
  cosechar: [
    { code: "RC", name: "Reduccion de costos / atrincheramiento", priority: "alta", description: "Recorta gastos no esenciales y concentrate en lo nuclear para mantener viabilidad mientras decides el rumbo." },
    { code: "DI", name: "Desinversion", priority: "alta", description: "Vende unidades de negocio o activos no rentables para liberar caja y reasignar recursos a donde si tengas chance." },
    { code: "LQ", name: "Liquidacion", priority: "media", description: "En el escenario mas critico, considera liquidacion ordenada antes que la situacion se deteriore mas." },
  ],
};

// Tooltip celda (para el hover sobre la matriz)
export const CELL_TOOLTIPS: Record<IeCell, { region: IeRegion; meaning: string }> = {
  I:    { region: "crecer",    meaning: "MEFI fuerte + MEFE alto · Region I" },
  II:   { region: "crecer",    meaning: "MEFI medio + MEFE alto · Region I" },
  III:  { region: "conservar", meaning: "MEFI debil + MEFE alto · Region II" },
  IV:   { region: "crecer",    meaning: "MEFI fuerte + MEFE medio · Region I" },
  V:    { region: "conservar", meaning: "MEFI medio + MEFE medio · Region II" },
  VI:   { region: "cosechar",  meaning: "MEFI debil + MEFE medio · Region III" },
  VII:  { region: "conservar", meaning: "MEFI fuerte + MEFE bajo · Region II" },
  VIII: { region: "cosechar",  meaning: "MEFI medio + MEFE bajo · Region III" },
  IX:   { region: "cosechar",  meaning: "MEFI debil + MEFE bajo · Region III" },
};
