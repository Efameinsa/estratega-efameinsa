// ───────────────────────────────────────────────────────────────────────
// 6 tipos de estructura organizacional
// ───────────────────────────────────────────────────────────────────────

export type StructureType =
  | "funcional"
  | "divisional"
  | "matricial"
  | "por_procesos"
  | "en_red"
  | "hibrida";

export interface StructureTypeDef {
  key: StructureType;
  label: string;
  description: string;
  whenToUse: string;
  icon: string; // lucide icon name
  color: string;
}

export const STRUCTURE_TYPES: StructureTypeDef[] = [
  {
    key: "funcional",
    label: "Funcional",
    description: "Áreas tradicionales (Comercial, Operaciones, Finanzas, RR.HH.).",
    whenToUse: "Empresa estable, un solo negocio, mercado doméstico.",
    icon: "Network",
    color: "#185FA5",
  },
  {
    key: "divisional",
    label: "Divisional",
    description: "Unidades por producto, mercado o geografía.",
    whenToUse: "Expansión internacional, múltiples líneas de producto.",
    icon: "Building2",
    color: "#0EA5E9",
  },
  {
    key: "matricial",
    label: "Matricial",
    description: "Doble línea de reporte (funcional + por proyecto).",
    whenToUse: "Proyectos transversales complejos, alta colaboración.",
    icon: "Grid3X3",
    color: "#5e0d0b",
  },
  {
    key: "por_procesos",
    label: "Por procesos",
    description: "Estructura horizontal alrededor de cadenas de valor.",
    whenToUse: "Foco en eficiencia operativa, liderazgo en costos.",
    icon: "GitBranch",
    color: "#16A34A",
  },
  {
    key: "en_red",
    label: "En red",
    description: "Núcleo pequeño con alianzas externas.",
    whenToUse: "Empresa ágil, digital o startup, foco en partnerships.",
    icon: "Share2",
    color: "#F97316",
  },
  {
    key: "hibrida",
    label: "Híbrida",
    description: "Combina elementos de varios tipos.",
    whenToUse: "La estrategia requiere combinar fuerzas organizacionales.",
    icon: "Puzzle",
    color: "#8B1510",
  },
];

export function getStructureTypeDef(key: string): StructureTypeDef | undefined {
  return STRUCTURE_TYPES.find((t) => t.key === key);
}

// ───────────────────────────────────────────────────────────────────────
// Tipos de nodo y niveles jerárquicos
// ───────────────────────────────────────────────────────────────────────

export type NodeType =
  | "directorio"
  | "ceo"
  | "division"
  | "gerencia"
  | "jefatura"
  | "comite"
  | "auditoria"
  | "otro";

export interface NodeTypeDef {
  key: NodeType;
  label: string;
  hierarchyLevel: number;
  color: string;
  textColor: string;
}

export const NODE_TYPES: NodeTypeDef[] = [
  { key: "directorio", label: "Directorio", hierarchyLevel: 0, color: "#042C53", textColor: "#FFFFFF" },
  { key: "ceo", label: "CEO / Gerencia General", hierarchyLevel: 1, color: "#185FA5", textColor: "#FFFFFF" },
  { key: "division", label: "División", hierarchyLevel: 2, color: "#378ADD", textColor: "#FFFFFF" },
  { key: "gerencia", label: "Gerencia", hierarchyLevel: 2, color: "#639922", textColor: "#FFFFFF" },
  { key: "jefatura", label: "Jefatura", hierarchyLevel: 3, color: "#97C459", textColor: "#FFFFFF" },
  { key: "comite", label: "Comité", hierarchyLevel: 2, color: "#BA7517", textColor: "#FFFFFF" },
  { key: "auditoria", label: "Auditoría / Órgano especial", hierarchyLevel: 1, color: "#4B1528", textColor: "#FFFFFF" },
  { key: "otro", label: "Otro", hierarchyLevel: 3, color: "#6B7280", textColor: "#FFFFFF" },
];

export function getNodeTypeDef(key: string): NodeTypeDef | undefined {
  return NODE_TYPES.find((n) => n.key === key);
}

// ───────────────────────────────────────────────────────────────────────
// RACI
// ───────────────────────────────────────────────────────────────────────

export type RaciRole = "R" | "A" | "C" | "I" | "S";

export const RACI_OPTIONS: { value: RaciRole; label: string; description: string; color: string; bg: string }[] = [
  { value: "R", label: "Responsable", description: "Hace el trabajo", color: "#FFFFFF", bg: "#16A34A" },
  { value: "A", label: "Accountable", description: "Rinde cuentas", color: "#FFFFFF", bg: "#0EA5E9" },
  { value: "C", label: "Consultado", description: "Aporta criterio antes de decidir", color: "#FFFFFF", bg: "#8B1510" },
  { value: "I", label: "Informado", description: "Solo recibe noticias", color: "#FFFFFF", bg: "#6B7280" },
  { value: "S", label: "Apoyo", description: "Colabora con el responsable", color: "#FFFFFF", bg: "#b45309" },
];

// ───────────────────────────────────────────────────────────────────────
// Plantillas base por tipo de estructura
// ───────────────────────────────────────────────────────────────────────

export interface TemplateNode {
  code: string;
  name: string;
  nodeType: NodeType;
  parent?: string; // code of parent
}

const COMMON_TOP: TemplateNode[] = [
  { code: "DIR", name: "Directorio", nodeType: "directorio" },
  { code: "CEO", name: "CEO / Gerencia General", nodeType: "ceo", parent: "DIR" },
];

export const STRUCTURE_TEMPLATES: Record<StructureType, TemplateNode[]> = {
  funcional: [
    ...COMMON_TOP,
    { code: "COM", name: "Gerencia Comercial", nodeType: "gerencia", parent: "CEO" },
    { code: "OPE", name: "Gerencia de Operaciones", nodeType: "gerencia", parent: "CEO" },
    { code: "FIN", name: "Gerencia de Finanzas", nodeType: "gerencia", parent: "CEO" },
    { code: "RHU", name: "Gerencia de RR.HH.", nodeType: "gerencia", parent: "CEO" },
  ],
  divisional: [
    ...COMMON_TOP,
    { code: "OPE", name: "Operaciones Corporativas", nodeType: "gerencia", parent: "CEO" },
    { code: "FIN", name: "Finanzas Corporativas", nodeType: "gerencia", parent: "CEO" },
    { code: "RHU", name: "RR.HH. Corporativos", nodeType: "gerencia", parent: "CEO" },
  ],
  matricial: [
    ...COMMON_TOP,
    { code: "COM", name: "Gerencia Comercial", nodeType: "gerencia", parent: "CEO" },
    { code: "OPE", name: "Gerencia de Operaciones", nodeType: "gerencia", parent: "CEO" },
    { code: "FIN", name: "Gerencia de Finanzas", nodeType: "gerencia", parent: "CEO" },
    { code: "RHU", name: "Gerencia de RR.HH.", nodeType: "gerencia", parent: "CEO" },
    { code: "PMO", name: "PMO · Oficina de Proyectos", nodeType: "comite", parent: "CEO" },
  ],
  por_procesos: [
    ...COMMON_TOP,
    { code: "P-CLIENTE", name: "Proceso · Atención al cliente", nodeType: "gerencia", parent: "CEO" },
    { code: "P-PRODUCCION", name: "Proceso · Producción", nodeType: "gerencia", parent: "CEO" },
    { code: "P-LOGISTICA", name: "Proceso · Logística", nodeType: "gerencia", parent: "CEO" },
    { code: "P-SOPORTE", name: "Procesos de soporte", nodeType: "gerencia", parent: "CEO" },
  ],
  en_red: [
    ...COMMON_TOP,
    { code: "CORE", name: "Núcleo operativo", nodeType: "gerencia", parent: "CEO" },
    { code: "ALIANZAS", name: "Gestión de alianzas", nodeType: "gerencia", parent: "CEO" },
    { code: "FIN", name: "Finanzas y administración", nodeType: "gerencia", parent: "CEO" },
  ],
  hibrida: [
    ...COMMON_TOP,
    { code: "COM", name: "Gerencia Comercial", nodeType: "gerencia", parent: "CEO" },
    { code: "OPE", name: "Gerencia de Operaciones", nodeType: "gerencia", parent: "CEO" },
    { code: "FIN", name: "Gerencia de Finanzas", nodeType: "gerencia", parent: "CEO" },
  ],
};

// ───────────────────────────────────────────────────────────────────────
// Heurística de sugerencia de tipo
// ───────────────────────────────────────────────────────────────────────

const COUNTRY_KEYWORDS = [
  "estados unidos", "usa", "ee.uu.", "eeuu", "europa", "asia", "china",
  "japón", "japon", "mexico", "méxico", "brasil", "argentina", "chile",
  "colombia", "perú", "peru", "lima", "bogota", "bogotá", "santiago",
  "nuevo mercado", "internacional", "exportar", "expansión geográfica",
  "expansion geografica",
];

const PROJECT_KEYWORDS = [
  "proyecto transversal", "multifuncional", "equipo multidisciplinario",
  "innovación", "innovacion", "i+d", "investigación", "investigacion",
];

const COST_KEYWORDS = [
  "reducir costo", "minimizar costo", "eficiencia operativa", "lean",
  "automatizar proceso", "optimizar cadena",
];

const ALLIANCE_KEYWORDS = [
  "alianza", "partnership", "joint venture", "co-creación", "ecosistema",
  "marketplace", "plataforma digital",
];

export interface StructureRecommendation {
  type: StructureType;
  reason: string;
  detectedSignals: string[];
}

export function recommendStructure(
  strategies: { description: string; type?: string | null; code?: string | null }[],
): StructureRecommendation {
  const allText = strategies.map((s) => s.description.toLowerCase()).join("  ");
  const signals: string[] = [];

  const countryHits = COUNTRY_KEYWORDS.filter((k) => allText.includes(k));
  const projectHits = PROJECT_KEYWORDS.filter((k) => allText.includes(k));
  const costHits = COST_KEYWORDS.filter((k) => allText.includes(k));
  const allianceHits = ALLIANCE_KEYWORDS.filter((k) => allText.includes(k));

  // Decision tree
  if (countryHits.length >= 2) {
    signals.push(`Múltiples mercados detectados (${countryHits.slice(0, 3).join(", ")})`);
    return {
      type: "divisional",
      reason:
        "Tus estrategias mencionan múltiples mercados geográficos. Una estructura divisional permite que cada unidad opere con autonomía local y mantenga áreas funcionales centrales.",
      detectedSignals: signals,
    };
  }

  if (allianceHits.length >= 1) {
    signals.push(`Foco en alianzas (${allianceHits.slice(0, 2).join(", ")})`);
    return {
      type: "en_red",
      reason:
        "Tus estrategias dependen de alianzas externas. Una estructura en red mantiene un núcleo pequeño y aprovecha capacidades de socios.",
      detectedSignals: signals,
    };
  }

  if (projectHits.length >= 2) {
    signals.push(`Proyectos transversales múltiples (${projectHits.slice(0, 2).join(", ")})`);
    return {
      type: "matricial",
      reason:
        "Tus estrategias requieren proyectos transversales con varias áreas colaborando. La matricial habilita doble línea de reporte funcional + por proyecto.",
      detectedSignals: signals,
    };
  }

  if (costHits.length >= 2) {
    signals.push(`Foco en eficiencia (${costHits.slice(0, 2).join(", ")})`);
    return {
      type: "por_procesos",
      reason:
        "Tus estrategias priorizan eficiencia y costos. Una estructura por procesos elimina silos y optimiza la cadena de valor.",
      detectedSignals: signals,
    };
  }

  if (countryHits.length === 1) {
    signals.push("Un mercado adicional detectado");
  }

  return {
    type: "funcional",
    reason:
      "Tus estrategias se concentran en un solo negocio y mercado. Una estructura funcional con áreas tradicionales es lo más simple y eficaz.",
    detectedSignals: signals,
  };
}

// ───────────────────────────────────────────────────────────────────────
// Parseo de mercados / regiones mencionadas
// ───────────────────────────────────────────────────────────────────────

const MARKET_PATTERNS: Array<{ key: string; label: string; regex: RegExp }> = [
  { key: "USA", label: "EE.UU.", regex: /\b(estados unidos|usa|ee\.uu\.|eeuu)\b/i },
  { key: "EU", label: "Europa", regex: /\b(europa|union europea|euro)\b/i },
  { key: "ASIA", label: "Asia", regex: /\b(asia|china|japón|japon|corea)\b/i },
  { key: "MX", label: "México", regex: /\b(mexico|méxico)\b/i },
  { key: "BR", label: "Brasil", regex: /\b(brasil|brazil)\b/i },
  { key: "AR", label: "Argentina", regex: /\bargentina\b/i },
  { key: "CL", label: "Chile", regex: /\bchile\b/i },
  { key: "CO", label: "Colombia", regex: /\bcolombia\b/i },
  { key: "PE", label: "Perú", regex: /\b(perú|peru|lima)\b/i },
  { key: "RETAIL", label: "Retail", regex: /\bretail\b/i },
  { key: "B2B", label: "B2B / Empresarial", regex: /\b(b2b|empresarial|corporativo)\b/i },
  { key: "PREMIUM", label: "Segmento premium", regex: /\bpremium\b/i },
];

export function extractMarkets(
  strategies: { description: string }[],
): { key: string; label: string }[] {
  const allText = strategies.map((s) => s.description).join("  ");
  const found = new Map<string, string>();
  for (const p of MARKET_PATTERNS) {
    if (p.regex.test(allText)) found.set(p.key, p.label);
  }
  return Array.from(found.entries()).map(([key, label]) => ({ key, label }));
}

// ───────────────────────────────────────────────────────────────────────
// Detección de comités a partir de mitigantes éticos
// ───────────────────────────────────────────────────────────────────────

const COMMITTEE_REGEX = /(comit[eé]|consejo|junta|task force|panel)\s+(de\s+|del\s+)?([a-zñáéíóú]+(?:\s+[a-zñáéíóú]+)?)/gi;

export interface DetectedCommittee {
  rawText: string;
  name: string;
  source: { type: "mitigant" | "responsible"; reference: string };
}

export function extractCommittees(
  mitigants: { id: string; text: string; responsible: string }[],
): DetectedCommittee[] {
  const out: DetectedCommittee[] = [];
  const seen = new Set<string>();

  function pushFromText(text: string, source: DetectedCommittee["source"]) {
    let m: RegExpExecArray | null;
    const regex = new RegExp(COMMITTEE_REGEX);
    while ((m = regex.exec(text)) !== null) {
      const fullMatch = m[0];
      const normalized = fullMatch.toLowerCase().trim();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      out.push({
        rawText: fullMatch,
        name: fullMatch.charAt(0).toUpperCase() + fullMatch.slice(1).toLowerCase(),
        source,
      });
    }
  }

  for (const m of mitigants) {
    pushFromText(m.responsible, { type: "responsible", reference: m.id });
    pushFromText(m.text, { type: "mitigant", reference: m.id });
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────
// Áreas detectadas desde OCPs (responsible + support areas)
// ───────────────────────────────────────────────────────────────────────

export interface DetectedArea {
  id: string;
  name: string;
  ocpIds: string[];
}

export function extractAreasFromOcps(
  ocps: {
    id: string;
    responsibleArea: { id: string; name: string } | null;
    supportAreas: { area: { id: string; name: string } }[];
  }[],
): DetectedArea[] {
  const map = new Map<string, DetectedArea>();
  for (const o of ocps) {
    if (o.responsibleArea) {
      const a = o.responsibleArea;
      if (!map.has(a.id)) map.set(a.id, { id: a.id, name: a.name, ocpIds: [] });
      map.get(a.id)!.ocpIds.push(o.id);
    }
    for (const s of o.supportAreas) {
      if (!map.has(s.area.id)) {
        map.set(s.area.id, { id: s.area.id, name: s.area.name, ocpIds: [] });
      }
    }
  }
  return Array.from(map.values());
}

// ───────────────────────────────────────────────────────────────────────
// Layout helper: posiciones por defecto por nivel
// ───────────────────────────────────────────────────────────────────────

export function defaultPositionForLevel(
  level: number,
  indexInLevel: number,
  totalInLevel: number,
): { x: number; y: number } {
  const ySpacing = 140;
  const xSpacing = 240;
  const baseY = 60 + level * ySpacing;
  const baseX = (indexInLevel - (totalInLevel - 1) / 2) * xSpacing;
  return { x: baseX, y: baseY };
}
