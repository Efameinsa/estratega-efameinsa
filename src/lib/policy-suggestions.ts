import type { DalessioType } from "./dalessio-types";

// ───────────────────────────────────────────────────────────────────────
// 7 categorías estándar de políticas
// ───────────────────────────────────────────────────────────────────────

export type PolicyCategory =
  | "general"
  | "comercial"
  | "operacional"
  | "financiera"
  | "rrhh"
  | "tecnologia"
  | "etica_social";

export interface PolicyCategoryDef {
  key: PolicyCategory;
  label: string;
  shortLabel: string;
  code: string; // 3-letter code for POL-XXX-NN
  description: string;
  color: string;
  bg: string;
  icon: string; // lucide icon name
}

export const POLICY_CATEGORIES: PolicyCategoryDef[] = [
  {
    key: "general",
    label: "Generales / Transversales",
    shortLabel: "Generales",
    code: "GEN",
    description: "Aplican a toda la organización. Conectadas con valores y principios.",
    color: "#94a3b8",
    bg: "rgba(71,85,105,0.08)",
    icon: "Globe2",
  },
  {
    key: "comercial",
    label: "Comerciales / De mercado",
    shortLabel: "Comerciales",
    code: "COM",
    description: "Reglas para relación con clientes, precios, contratos, descuentos.",
    color: "#0EA5E9",
    bg: "rgba(14,165,233,0.08)",
    icon: "TrendingUp",
  },
  {
    key: "operacional",
    label: "Operacionales",
    shortLabel: "Operacionales",
    code: "OPE",
    description: "Lineamientos para producción, calidad, logística, abastecimiento.",
    color: "#F97316",
    bg: "rgba(249,115,22,0.08)",
    icon: "Factory",
  },
  {
    key: "financiera",
    label: "Financieras",
    shortLabel: "Financieras",
    code: "FIN",
    description: "Reglas para capital, deuda, inversión, dividendos.",
    color: "#4ade80",
    bg: "rgba(22,163,74,0.08)",
    icon: "Wallet",
  },
  {
    key: "rrhh",
    label: "Recursos Humanos",
    shortLabel: "RR.HH.",
    code: "RHU",
    description: "Reglas para selección, desarrollo, compensación, evaluación.",
    color: "#A855F7",
    bg: "rgba(168,85,247,0.08)",
    icon: "Users",
  },
  {
    key: "tecnologia",
    label: "Tecnología e Innovación",
    shortLabel: "Tecnología",
    code: "TEC",
    description: "Lineamientos para inversión tecnológica, ciberseguridad, PI.",
    color: "#60a5fa",
    bg: "rgba(37,99,235,0.08)",
    icon: "Cpu",
  },
  {
    key: "etica_social",
    label: "Éticas / Sociales / Ambientales",
    shortLabel: "Éticas/sociales",
    code: "ETI",
    description: "Mitigantes éticos, responsabilidad social, sostenibilidad.",
    color: "#fbbf24",
    bg: "rgba(217,119,6,0.08)",
    icon: "ShieldCheck",
  },
];

export function getCategoryDef(key: string): PolicyCategoryDef | undefined {
  return POLICY_CATEGORIES.find((c) => c.key === key);
}

// ───────────────────────────────────────────────────────────────────────
// Plantillas de políticas sugeridas por tipo D'Alessio
// ───────────────────────────────────────────────────────────────────────

export interface PolicyTemplate {
  category: PolicyCategory;
  name: string;
  enunciado: string;
  indicator: string;
  responsible: string;
  reviewFrequency: "mensual" | "trimestral" | "semestral" | "anual";
}

const TEMPLATES_BY_TYPE: Record<DalessioType, PolicyTemplate[]> = {
  penetracion_mercado: [
    {
      category: "comercial",
      name: "Política de posicionamiento de marca",
      enunciado:
        "Toda comunicación comercial debe reforzar los atributos diferenciadores de la marca, evitando promesas que no podamos sostener operativamente.",
      indicator: "Porcentaje de campañas alineadas al posicionamiento (revisión trimestral por Marketing)",
      responsible: "Gerencia Comercial",
      reviewFrequency: "trimestral",
    },
    {
      category: "comercial",
      name: "Política de precios",
      enunciado:
        "Mantener una estructura de precios que preserve el margen objetivo del segmento. Descuentos mayores a 10% requieren aprobación de gerencia comercial.",
      indicator: "Margen promedio por canal y desviación de precios autorizados",
      responsible: "Gerencia Comercial",
      reviewFrequency: "trimestral",
    },
    {
      category: "comercial",
      name: "Política de gestión de canales",
      enunciado:
        "Cada canal debe operar bajo reglas claras de precios, márgenes y promesa de servicio para evitar canibalización y conflicto interno.",
      indicator: "Participación de cada canal en ventas y nivel de quejas por conflicto",
      responsible: "Gerencia Comercial",
      reviewFrequency: "semestral",
    },
  ],
  desarrollo_mercado: [
    {
      category: "comercial",
      name: "Política de expansión geográfica",
      enunciado:
        "La entrada a un nuevo mercado requiere un estudio de viabilidad aprobado por dirección y un plan de salida que limite pérdidas máximas aceptables.",
      indicator: "Mercados nuevos con plan aprobado y cumplimiento de hitos a 6 meses",
      responsible: "Dirección Estratégica",
      reviewFrequency: "semestral",
    },
    {
      category: "operacional",
      name: "Política de adaptación cultural y regulatoria",
      enunciado:
        "Cada nuevo mercado debe contar con asesoría legal local y un protocolo de adaptación cultural antes del lanzamiento.",
      indicator: "Mercados con compliance y adaptación cultural validados antes del lanzamiento",
      responsible: "Legal y Operaciones",
      reviewFrequency: "anual",
    },
  ],
  desarrollo_producto: [
    {
      category: "tecnologia",
      name: "Política de I+D",
      enunciado:
        "Toda iniciativa de I+D debe contar con un caso de negocio, un equipo asignado y un punto de decisión cada 90 días sobre continuidad o cierre.",
      indicator: "Proyectos I+D activos con revisión trimestral y tasa de éxito vs. lanzados",
      responsible: "Dirección de I+D",
      reviewFrequency: "trimestral",
    },
    {
      category: "operacional",
      name: "Política de calidad de producto",
      enunciado:
        "Todo producto antes de salir al mercado debe superar un test de calidad documentado. Un producto que falle dos lanzamientos consecutivos requiere revisión profunda.",
      indicator: "Porcentaje de productos lanzados con cero incidencias críticas en 90 días",
      responsible: "Calidad",
      reviewFrequency: "trimestral",
    },
    {
      category: "tecnologia",
      name: "Política de propiedad intelectual",
      enunciado:
        "Todo desarrollo interno con potencial competitivo debe protegerse con patente, registro de marca o secreto industrial documentado.",
      indicator: "Activos intelectuales registrados por año",
      responsible: "Legal y Dirección I+D",
      reviewFrequency: "anual",
    },
  ],
  integracion_adelante: [
    {
      category: "comercial",
      name: "Política de canales propios vs. terceros",
      enunciado:
        "Los canales propios deben mantener estándares uniformes de experiencia. Conflictos con canales de terceros se resuelven priorizando la rentabilidad total y no la del canal individual.",
      indicator: "NPS por canal y cumplimiento de estándares",
      responsible: "Gerencia Comercial",
      reviewFrequency: "trimestral",
    },
  ],
  integracion_atras: [
    {
      category: "operacional",
      name: "Política de proveedores estratégicos",
      enunciado:
        "Los proveedores críticos deben someterse a auditorías anuales de calidad, cumplimiento y solvencia. Ningún proveedor puede concentrar más del 30% de un insumo clave.",
      indicator: "Auditorías completadas y dispersión de concentración por insumo",
      responsible: "Cadena de Suministro",
      reviewFrequency: "anual",
    },
    {
      category: "financiera",
      name: "Política de inversiones de integración",
      enunciado:
        "Adquisiciones o inversiones en la cadena de suministro requieren payback máximo de 5 años y aprobación del directorio.",
      indicator: "Payback efectivo vs. estimado de inversiones aprobadas",
      responsible: "CFO",
      reviewFrequency: "anual",
    },
  ],
  integracion_horizontal: [
    {
      category: "financiera",
      name: "Política de fusiones y adquisiciones",
      enunciado:
        "Toda M&A debe pasar por due diligence externo independiente y debe demostrar sinergias cuantificadas antes del cierre.",
      indicator: "M&A cerradas con sinergias verificadas a 12 meses",
      responsible: "CFO y Dirección Estratégica",
      reviewFrequency: "anual",
    },
  ],
  diversificacion_concentrica: [
    {
      category: "financiera",
      name: "Política de portafolio de negocios",
      enunciado:
        "Ningún negocio puede consumir más del 25% del capital operativo si no genera flujo positivo en 18 meses.",
      indicator: "Distribución de capital por unidad de negocio y rentabilidad por línea",
      responsible: "CFO",
      reviewFrequency: "semestral",
    },
  ],
  diversificacion_conglomerada: [
    {
      category: "financiera",
      name: "Política de inversión en negocios no relacionados",
      enunciado:
        "Inversiones en sectores no relacionados requieren un comité independiente de revisión y un máximo del 15% del balance.",
      indicator: "Exposición de capital fuera del core y rentabilidad comparada",
      responsible: "Directorio",
      reviewFrequency: "anual",
    },
  ],
  diversificacion_horizontal: [
    {
      category: "comercial",
      name: "Política de extensión de línea",
      enunciado:
        "Una nueva línea adyacente solo procede si comparte al menos un canal o un atributo de marca con la línea actual.",
      indicator: "Líneas nuevas con cumplimiento de criterio de sinergia",
      responsible: "Dirección Comercial",
      reviewFrequency: "anual",
    },
  ],
  aventura_conjunta: [
    {
      category: "general",
      name: "Política de alianzas estratégicas",
      enunciado:
        "Toda alianza debe tener objetivos medibles a 12 meses, gobernanza definida y una cláusula clara de salida.",
      indicator: "Alianzas con plan de gobernanza activo y cumplimiento de hitos",
      responsible: "Dirección Estratégica",
      reviewFrequency: "semestral",
    },
  ],
  atrincheramiento: [
    {
      category: "financiera",
      name: "Política de control de gastos",
      enunciado:
        "Todo gasto discrecional por encima de un umbral definido requiere aprobación de la gerencia financiera. Los gastos recurrentes se revisan trimestralmente.",
      indicator: "Gasto discrecional como porcentaje de ingresos vs. objetivo",
      responsible: "CFO",
      reviewFrequency: "trimestral",
    },
    {
      category: "rrhh",
      name: "Política de gestión de talento crítico",
      enunciado:
        "Durante períodos de ajuste, el talento clave del core de negocio se protege mediante planes de retención específicos.",
      indicator: "Rotación de talento crítico en períodos de ajuste",
      responsible: "RR.HH.",
      reviewFrequency: "trimestral",
    },
  ],
  desinversion: [
    {
      category: "financiera",
      name: "Política de desinversión ordenada",
      enunciado:
        "La salida de una unidad de negocio debe planificarse con al menos 6 meses de anticipación, asegurando continuidad para clientes y trabajadores afectados.",
      indicator: "Desinversiones con plan formal aprobado",
      responsible: "Directorio",
      reviewFrequency: "anual",
    },
  ],
  liquidacion: [
    {
      category: "general",
      name: "Política de liquidación responsable",
      enunciado:
        "Un cierre operativo debe garantizar el cumplimiento de obligaciones laborales, fiscales y con proveedores antes de cualquier distribución de remanentes.",
      indicator: "Obligaciones cumplidas al 100% antes del cierre",
      responsible: "Dirección General",
      reviewFrequency: "anual",
    },
  ],
};

// Plantillas comunes que se sugieren siempre (independientes del tipo)
const ALWAYS_SUGGEST: PolicyTemplate[] = [
  {
    category: "general",
    name: "Política de transparencia y reporte",
    enunciado:
      "La información estratégica y financiera relevante se reporta al directorio con la frecuencia acordada, en formato estándar y trazable.",
    indicator: "Reportes entregados a tiempo vs. cronograma",
    responsible: "Dirección General",
    reviewFrequency: "anual",
  },
  {
    category: "general",
    name: "Política de comunicación interna",
    enunciado:
      "Toda decisión estratégica relevante se comunica a las áreas afectadas dentro de los 5 días hábiles posteriores a su aprobación.",
    indicator: "Tiempo promedio entre decisión y comunicación",
    responsible: "Dirección General",
    reviewFrequency: "anual",
  },
];

// ───────────────────────────────────────────────────────────────────────
// API pública: generar sugerencias para una estrategia
// ───────────────────────────────────────────────────────────────────────

export function suggestionsForType(type: DalessioType | null | undefined): PolicyTemplate[] {
  if (!type) return [];
  return TEMPLATES_BY_TYPE[type] ?? [];
}

export function alwaysSuggestedTemplates(): PolicyTemplate[] {
  return ALWAYS_SUGGEST;
}

// Helper para generar código POL-CAT-NN
export function generatePolicyCode(category: PolicyCategory, index: number): string {
  const cat = getCategoryDef(category)?.code ?? "GEN";
  return `POL-${cat}-${String(index).padStart(2, "0")}`;
}

// ───────────────────────────────────────────────────────────────────────
// Detección simple de contradicciones (heurística por keywords opuestas)
// ───────────────────────────────────────────────────────────────────────

interface ContradictionRule {
  keyword: string;
  opposite: string;
  description: string;
}

const CONTRADICTION_RULES: ContradictionRule[] = [
  {
    keyword: "minimizar costos",
    opposite: "calidad premium",
    description: "Una política prioriza costo bajo y otra calidad premium; puede generar tensión operativa.",
  },
  {
    keyword: "minimizar costos",
    opposite: "calidad superior",
    description: "Una política prioriza costo bajo y otra calidad superior; revisar balance.",
  },
  {
    keyword: "minimizar costos",
    opposite: "inversión en",
    description: "Una política restringe costos y otra exige inversión; revisar criterios.",
  },
  {
    keyword: "prohibir descuento",
    opposite: "descuento",
    description: "Una política prohibe descuentos mientras otra los permite; revisar criterios y excepciones.",
  },
  {
    keyword: "centralizar",
    opposite: "descentralizar",
    description: "Tensión entre centralización y descentralización en distintas políticas.",
  },
  {
    keyword: "no permitir",
    opposite: "permitir",
    description: "Una política prohibe lo que otra permite; revisar coherencia.",
  },
  {
    keyword: "evitar deuda",
    opposite: "apalancarse",
    description: "Política financiera contradictoria sobre uso de deuda.",
  },
];

export interface DetectedContradiction {
  description: string;
}

export function detectContradiction(
  enunciadoA: string,
  enunciadoB: string,
): DetectedContradiction | null {
  const a = enunciadoA.toLowerCase();
  const b = enunciadoB.toLowerCase();
  for (const rule of CONTRADICTION_RULES) {
    if (
      (a.includes(rule.keyword) && b.includes(rule.opposite)) ||
      (b.includes(rule.keyword) && a.includes(rule.opposite))
    ) {
      return { description: rule.description };
    }
  }
  return null;
}

// ───────────────────────────────────────────────────────────────────────
// Helpers de validación de enunciados
// ───────────────────────────────────────────────────────────────────────

const VAGUE_VERBS = ["tratar de", "intentar", "procurar", "esforzarse", "buscar lograr", "tratar"];

export function isVagueEnunciado(enunciado: string): boolean {
  const lower = enunciado.toLowerCase();
  return VAGUE_VERBS.some((v) => lower.includes(v));
}

const GENERIC_INDICATORS = ["se cumple", "se respeta", "ser cumplido", "respetar"];

export function isGenericIndicator(indicator: string | null | undefined): boolean {
  if (!indicator) return false;
  const lower = indicator.toLowerCase().trim();
  return GENERIC_INDICATORS.some((g) => lower === g || lower.startsWith(g));
}

export const FREQUENCY_OPTIONS = [
  { value: "mensual", label: "Mensual" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
] as const;

export const SCOPE_OPTIONS = [
  { value: "toda_organizacion", label: "Toda la organización" },
  { value: "area", label: "Área específica" },
  { value: "producto", label: "Producto específico" },
  { value: "mercado", label: "Mercado específico" },
  { value: "situacion", label: "Situación específica" },
] as const;

export const POLICY_STATUSES = [
  { value: "sugerida", label: "Sugerida" },
  { value: "aceptada", label: "Aceptada" },
  { value: "en_edicion", label: "En edición" },
  { value: "confirmada", label: "Confirmada" },
  { value: "descartada", label: "Descartada" },
] as const;
