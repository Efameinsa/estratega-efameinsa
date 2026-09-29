// ───────────────────────────────────────────────────────────────────────
// Catalogo de variables PEYEA y mapeo de origen a otros modulos
// El usuario SIEMPRE califica del 1 al 6 (positivo). El sistema invierte
// internamente las dimensiones VC y EE para los calculos del vector.
// ───────────────────────────────────────────────────────────────────────

export type PeyeaDimension = "FF" | "VC" | "EE" | "FI";

export type PeyeaOrigin =
  | "amofhit_finanzas"
  | "amofhit_marketing"
  | "amofhit_operaciones"
  | "amofhit_tecnologia"
  | "mpc"
  | "pestec"
  | "porter"
  | "atractividad"
  | "peyea";

export interface PeyeaVariableDef {
  key: string;
  dimension: PeyeaDimension;
  name: string;
  origin: PeyeaOrigin;
  /** Si origin es amofhit_finanzas, el key del RatioMaster */
  ratioKey?: string;
  /** Si origin es amofhit_*, el id de la pregunta cualitativa cuyo score se usa */
  amofhitVariableId?: string;
  /** True si el indicador deberia invertirse (ej. apalancamiento alto = mala FF) */
  invert?: boolean;
  /** Tooltip explicativo de la variable en lenguaje sencillo */
  hint?: string;
}

export const PEYEA_CATALOG: PeyeaVariableDef[] = [
  // ── FF · Fuerza Financiera ───────────────────────────────────────────
  { key: "FF.ROE", dimension: "FF", name: "Retorno sobre inversion (ROE)", origin: "amofhit_finanzas", ratioKey: "F.REN.ROE", hint: "Cuanto generas vs lo invertido por los socios" },
  { key: "FF.LEVERAGE", dimension: "FF", name: "Apalancamiento", origin: "amofhit_finanzas", ratioKey: "F.END.DEBT_TO_EQUITY", invert: true, hint: "Cuanta deuda tienes vs capital propio (menos = mejor para FF)" },
  { key: "FF.LIQUIDITY", dimension: "FF", name: "Liquidez", origin: "amofhit_finanzas", ratioKey: "F.LIQ.CURRENT_RATIO", hint: "Capacidad de cubrir obligaciones de corto plazo" },
  { key: "FF.CASH_FLOW", dimension: "FF", name: "Flujo de caja (EBITDA margin)", origin: "amofhit_finanzas", ratioKey: "F.REN.EBITDA_MARGIN", hint: "Generacion operativa de efectivo" },
  { key: "FF.WORKING_CAPITAL", dimension: "FF", name: "Capital de trabajo", origin: "amofhit_finanzas", ratioKey: "F.LIQ.QUICK_RATIO", hint: "Holgura de capital corriente" },
  { key: "FF.RISK", dimension: "FF", name: "Riesgo del negocio", origin: "peyea", hint: "Volatilidad y exposicion del modelo de negocio (mayor = peor)" },
  { key: "FF.EXIT", dimension: "FF", name: "Facilidad de salida del mercado", origin: "peyea", hint: "Que tan facil seria liquidar/vender activos" },

  // ── VC · Ventaja Competitiva ─────────────────────────────────────────
  { key: "VC.MARKET_SHARE", dimension: "VC", name: "Participacion de mercado", origin: "mpc", hint: "Tu cuota frente al lider del sector" },
  { key: "VC.QUALITY", dimension: "VC", name: "Calidad del producto/servicio", origin: "amofhit_operaciones", amofhitVariableId: "O-3-1", hint: "Cumplimiento de estandares y madurez del SGC" },
  { key: "VC.LOYALTY", dimension: "VC", name: "Lealtad de clientes", origin: "amofhit_marketing", amofhitVariableId: "M-5-1", hint: "Retencion y NPS — clientes que repiten" },
  { key: "VC.TECH_KNOW", dimension: "VC", name: "Conocimiento tecnologico", origin: "amofhit_tecnologia", amofhitVariableId: "T-2-1", hint: "Madurez de la tecnologia que dominas" },
  { key: "VC.SUPPLIER_CONTROL", dimension: "VC", name: "Control sobre proveedores", origin: "porter", hint: "Tu capacidad de negociacion con proveedores" },
  { key: "VC.LIFECYCLE", dimension: "VC", name: "Ciclo de vida del producto", origin: "peyea", hint: "Donde estan tus productos en su ciclo (introduccion = bajo, madurez = alto)" },
  { key: "VC.INNOVATION_SPEED", dimension: "VC", name: "Velocidad de innovacion", origin: "peyea", hint: "Que tan rapido lanzas nuevas versiones/productos" },

  // ── EE · Estabilidad del Entorno ─────────────────────────────────────
  { key: "EE.TECH_CHANGE", dimension: "EE", name: "Estabilidad ante cambios tecnologicos", origin: "pestec", hint: "Cambios tecnologicos disruptivos del sector (mas estable = mejor)" },
  { key: "EE.DEMAND_VAR", dimension: "EE", name: "Estabilidad de la demanda", origin: "pestec", hint: "Variabilidad de la demanda (mas estable = mejor)" },
  { key: "EE.COMPETITION", dimension: "EE", name: "Presion competitiva controlada", origin: "porter", hint: "Rivalidad del sector (menos rivalidad = mejor)" },
  { key: "EE.ENTRY_BARRIERS", dimension: "EE", name: "Barreras de entrada al mercado", origin: "porter", hint: "Que tan dificil es entrar al sector (mas barreras = mejor para los actuales)" },
  { key: "EE.INFLATION", dimension: "EE", name: "Estabilidad de precios (inflacion baja)", origin: "pestec", hint: "Inflacion controlada del entorno macroeconomico" },
  { key: "EE.FX_RISK", dimension: "EE", name: "Riesgo cambiario controlado", origin: "pestec", hint: "Estabilidad del tipo de cambio para tu operacion" },

  // ── FI · Fuerza de la Industria ──────────────────────────────────────
  { key: "FI.GROWTH", dimension: "FI", name: "Potencial de crecimiento", origin: "atractividad", hint: "Cuanto se proyecta que crezca el sector" },
  { key: "FI.PROFIT", dimension: "FI", name: "Potencial de utilidades", origin: "atractividad", hint: "Margenes promedio del sector" },
  { key: "FI.STABILITY", dimension: "FI", name: "Estabilidad financiera del sector", origin: "atractividad", hint: "Sectores volatiles vs sectores estables financieramente" },
  { key: "FI.TECH_KNOW", dimension: "FI", name: "Conocimiento tecnologico requerido", origin: "porter", hint: "Que tan especializado tecnologicamente es el sector" },
  { key: "FI.RESOURCE_USE", dimension: "FI", name: "Utilizacion de recursos del sector", origin: "atractividad", hint: "Aprovechamiento promedio de capacidad instalada" },
  { key: "FI.ENTRY_EASE", dimension: "FI", name: "Facilidad de entrada (oportunidad)", origin: "porter", hint: "Que tan facil es entrar al sector como oportunidad" },
];

export function variablesByDimension(dim: PeyeaDimension): PeyeaVariableDef[] {
  return PEYEA_CATALOG.filter((v) => v.dimension === dim);
}

// ───────────────────────────────────────────────────────────────────────
// Convertir scores de origen a escala PEYEA 1-6
// ───────────────────────────────────────────────────────────────────────

/** Convierte score 1-4 (AMOFHIT cualitativo) a escala 1-6 PEYEA */
export function score1to4to1to6(score: number): number {
  // 1 → 2, 2 → 3, 3 → 5, 4 → 6  (mapeo no lineal: refleja la curva real)
  const map: Record<number, number> = { 1: 2, 2: 3, 3: 5, 4: 6 };
  return map[Math.round(score)] ?? 3;
}

/** Convierte un delta vs sector (ratio cuantitativo) a escala 1-6 PEYEA */
export function ratioDeltaToScore(
  value: number,
  sector: number,
  higherIsBetter: boolean,
): number {
  if (!Number.isFinite(value) || !Number.isFinite(sector) || sector === 0)
    return 3.5;
  const deltaPct = ((value - sector) / Math.abs(sector)) * 100;
  const favorable = higherIsBetter ? deltaPct : -deltaPct;
  // Mapeo: <-40% → 1, [-40,-15) → 2, [-15,5) → 3, [5,20) → 4, [20,50) → 5, ≥50 → 6
  if (favorable < -40) return 1;
  if (favorable < -15) return 2;
  if (favorable < 5) return 3;
  if (favorable < 20) return 4;
  if (favorable < 50) return 5;
  return 6;
}

// ───────────────────────────────────────────────────────────────────────
// Calculo del vector y perfil PEYEA
// ───────────────────────────────────────────────────────────────────────

export interface PeyeaVectorResult {
  ffAvg: number;          // promedio FF (positivo, 1 a 6)
  vcAvg: number;          // promedio VC (positivo, 1 a 6)
  eeAvg: number;          // promedio EE (positivo, 1 a 6)
  fiAvg: number;          // promedio FI (positivo, 1 a 6)
  ffSigned: number;       // FF con signo (FF +)
  vcSigned: number;       // VC con signo (VC -)
  eeSigned: number;       // EE con signo (EE -)
  fiSigned: number;       // FI con signo (FI +)
  x: number;              // VC + FI (puede ser negativo)
  y: number;              // FF + EE (puede ser negativo)
  magnitude: number;      // sqrt(x^2 + y^2)
  angleDeg: number;       // 0-360
  quadrant: "agresivo" | "conservador" | "competitivo" | "defensivo";
}

export function computeVector(scores: {
  FF: number[];
  VC: number[];
  EE: number[];
  FI: number[];
}): PeyeaVectorResult {
  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

  const ffAvg = avg(scores.FF);
  const vcAvg = avg(scores.VC);
  const eeAvg = avg(scores.EE);
  const fiAvg = avg(scores.FI);

  // El usuario califica positivo 1-6. Para el calculo:
  // FF, FI son positivas (+)
  // VC, EE invierten signo: VC y EE bajos significan ventaja competitiva fuerte
  // y entorno estable. La convencion D'Alessio es que VC y EE usan eje negativo.
  // Si el usuario califico VC = 6 (excelente), eso es VC = -1 en escala clasica
  // (cerca de 0). Si VC = 1 (muy mal), eso es VC = -6 (lejos del centro).
  // Asi: ffSigned = ffAvg, vcSigned = -(7 - vcAvg), eeSigned = -(7 - eeAvg), fiSigned = fiAvg
  const ffSigned = ffAvg;
  const fiSigned = fiAvg;
  const vcSigned = -(7 - vcAvg); // vcAvg=6 → vcSigned=-1; vcAvg=1 → vcSigned=-6
  const eeSigned = -(7 - eeAvg);

  const x = vcSigned + fiSigned; // eje horizontal
  const y = ffSigned + eeSigned; // eje vertical

  const magnitude = Math.sqrt(x * x + y * y);
  const angleDeg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

  let quadrant: PeyeaVectorResult["quadrant"];
  if (x >= 0 && y >= 0) quadrant = "agresivo";
  else if (x < 0 && y >= 0) quadrant = "conservador";
  else if (x < 0 && y < 0) quadrant = "defensivo";
  else quadrant = "competitivo";

  return { ffAvg, vcAvg, eeAvg, fiAvg, ffSigned, vcSigned, eeSigned, fiSigned, x, y, magnitude, angleDeg, quadrant };
}

// ───────────────────────────────────────────────────────────────────────
// Estrategias recomendadas por perfil
// ───────────────────────────────────────────────────────────────────────

export interface PeyeaStrategy {
  code: string;
  name: string;
  description: string;
}

export const STRATEGIES_BY_QUADRANT: Record<
  PeyeaVectorResult["quadrant"],
  PeyeaStrategy[]
> = {
  agresivo: [
    { code: "PM", name: "Penetracion de mercado", description: "Aumenta tu cuota en mercados donde ya operas con productos actuales: mas marketing, fuerza de ventas y promociones." },
    { code: "DM", name: "Desarrollo de mercado", description: "Lleva tus productos actuales a nuevos territorios geograficos o segmentos." },
    { code: "DP", name: "Desarrollo de producto", description: "Crea nuevas versiones o productos complementarios para los clientes que ya tienes." },
    { code: "IB", name: "Integracion hacia atras", description: "Adquiere o controla a tus proveedores para asegurar suministro y reducir costos." },
    { code: "IA", name: "Integracion hacia adelante", description: "Toma control de canales/distribuidores para llegar mejor al cliente final." },
    { code: "IH", name: "Integracion horizontal", description: "Adquiere a competidores directos para consolidar mercado." },
    { code: "DC", name: "Diversificacion concentrica", description: "Lanza productos relacionados en mercados afines aprovechando capacidades existentes." },
  ],
  conservador: [
    { code: "PM-C", name: "Penetracion de mercado cuidadosa", description: "Crece en lo que ya conoces sin asumir grandes riesgos de inversion." },
    { code: "DP", name: "Desarrollo de productos", description: "Mejora gradualmente tu oferta actual con menos riesgo que entrar a nuevos mercados." },
    { code: "DC", name: "Diversificacion concentrica", description: "Diversifica selectivamente en lineas relacionadas que aprovechen tu fortaleza financiera." },
    { code: "RC", name: "Reduccion de costos", description: "Optimiza estructura para preservar la solidez financiera ante turbulencia externa." },
    { code: "DS", name: "Desinversion selectiva", description: "Sal de unidades poco rentables para concentrar recursos en las mas competitivas." },
  ],
  competitivo: [
    { code: "IH", name: "Integracion horizontal", description: "Adquiere o alianza con competidores para fortalecer posicion en una industria atractiva." },
    { code: "IB", name: "Integracion hacia atras", description: "Asegura proveedores para no perder competitividad en una industria fuerte." },
    { code: "IA", name: "Integracion hacia adelante", description: "Toma canales para diferenciarte mejor frente a competidores." },
    { code: "PM-A", name: "Penetracion de mercado agresiva", description: "Compite duro por cuota usando tu fuerza en una industria con potencial." },
    { code: "DM", name: "Desarrollo de mercado", description: "Expande geografica o segmentariamente para ganar terreno." },
    { code: "DP", name: "Desarrollo de producto", description: "Innova producto para diferenciarte de competidores actuales." },
    { code: "AE", name: "Alianzas estrategicas / joint ventures", description: "Une fuerzas con socios complementarios para compensar debilidades." },
  ],
  defensivo: [
    { code: "AT", name: "Atrincheramiento", description: "Concentrate en lo esencial, recorta lo no rentable y sobrevive el corto plazo." },
    { code: "DI", name: "Desinversion", description: "Vende unidades de negocio para liberar caja y enfocar recursos." },
    { code: "LQ", name: "Liquidacion", description: "Si la situacion es muy critica, considera liquidacion ordenada antes de quiebra." },
    { code: "RC-D", name: "Reduccion de costos drastica", description: "Aplica recortes profundos para mantener viabilidad mientras decides el rumbo." },
    { code: "RE", name: "Reestructuracion", description: "Replantea la organizacion (deuda, accionariado, modelo) para volver a competir." },
  ],
};

export const QUADRANT_INFO: Record<
  PeyeaVectorResult["quadrant"],
  { label: string; color: string; bg: string; border: string; description: string }
> = {
  agresivo: { label: "Agresivo", color: "#4ade80", bg: "rgba(22, 163, 74, 0.08)", border: "rgba(22, 163, 74, 0.35)", description: "Tu empresa es solida en una industria atractiva. Es momento de expandir y consolidar liderazgo." },
  conservador: { label: "Conservador", color: "#8B5CF6", bg: "rgba(139, 92, 246, 0.08)", border: "rgba(139, 92, 246, 0.35)", description: "Tu empresa es solida pero el sector es turbulento. Crece con cautela y diversifica con prudencia." },
  competitivo: { label: "Competitivo", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.08)", border: "rgba(245, 158, 11, 0.35)", description: "El sector es atractivo pero tu posicion es debil. Compite duro o alianza para reforzarte." },
  defensivo: { label: "Defensivo", color: "#F43F5E", bg: "rgba(244, 63, 94, 0.08)", border: "rgba(244, 63, 94, 0.35)", description: "Posicion debil en sector adverso. Reduce, reestructura o desinvierte antes de que sea tarde." },
};

export const DIMENSION_INFO: Record<
  PeyeaDimension,
  { label: string; color: string; bg: string; border: string; question: string }
> = {
  FF: { label: "Fuerza Financiera", color: "#4ade80", bg: "rgba(22, 163, 74, 0.08)", border: "rgba(22, 163, 74, 0.35)", question: "¿Que tan solida esta tu empresa financieramente?" },
  VC: { label: "Ventaja Competitiva", color: "#F43F5E", bg: "rgba(244, 63, 94, 0.08)", border: "rgba(244, 63, 94, 0.35)", question: "¿Que tan fuerte es tu posicion vs competidores?" },
  EE: { label: "Estabilidad del Entorno", color: "#FB923C", bg: "rgba(251, 146, 60, 0.08)", border: "rgba(251, 146, 60, 0.35)", question: "¿Que tan estable o turbulento es el sector?" },
  FI: { label: "Fuerza de la Industria", color: "#60a5fa", bg: "rgba(37, 99, 235, 0.08)", border: "rgba(37, 99, 235, 0.35)", question: "¿Que tan atractiva y potente es la industria?" },
};

export const ORIGIN_LABEL: Record<PeyeaOrigin, string> = {
  amofhit_finanzas: "AMOFHIT-Finanzas",
  amofhit_marketing: "AMOFHIT-Marketing",
  amofhit_operaciones: "AMOFHIT-Operaciones",
  amofhit_tecnologia: "AMOFHIT-Tecnologia",
  mpc: "MPC",
  pestec: "PESTEC",
  porter: "Porter",
  atractividad: "Atractividad",
  peyea: "Especifica de PEYEA",
};
