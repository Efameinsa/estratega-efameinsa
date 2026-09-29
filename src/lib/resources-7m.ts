// ───────────────────────────────────────────────────────────────────────
// 7 categorías D'Alessio
// ───────────────────────────────────────────────────────────────────────

export type ResourceCategory =
  | "money"
  | "manpower"
  | "materials"
  | "machines"
  | "methods"
  | "mentality"
  | "medio_ambiente";

export interface CategoryDef {
  key: ResourceCategory;
  label: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  bgPastel: string;
  metricLabel: string;
  unit: string;
}

export const CATEGORIES: CategoryDef[] = [
  {
    key: "money",
    label: "Money",
    subtitle: "Capital",
    description: "Capital de trabajo, CAPEX, OPEX, financiamiento y reservas.",
    icon: "Coins",
    color: "#173404",
    bgPastel: "transparent",
    metricLabel: "Inversión total",
    unit: "USD",
  },
  {
    key: "manpower",
    label: "Manpower",
    subtitle: "Personas",
    description: "Cantidad de personas, perfiles, competencias y plan de contrataciones.",
    icon: "Users",
    color: "#042C53",
    bgPastel: "transparent",
    metricLabel: "FTEs adicionales",
    unit: "FTEs",
  },
  {
    key: "materials",
    label: "Materials",
    subtitle: "Insumos",
    description: "Materias primas, insumos críticos, suministros y proveedores.",
    icon: "Box",
    color: "#412402",
    bgPastel: "#FAEEDA",
    metricLabel: "Categorías de insumos",
    unit: "tipos",
  },
  {
    key: "machines",
    label: "Machines",
    subtitle: "Equipos",
    description: "Maquinaria, equipos industriales, vehículos e infraestructura productiva.",
    icon: "Settings",
    color: "#4B1528",
    bgPastel: "transparent",
    metricLabel: "CAPEX",
    unit: "USD",
  },
  {
    key: "methods",
    label: "Methods",
    subtitle: "Procesos",
    description: "Procesos operativos, procedimientos, certificaciones y sistemas de gestión.",
    icon: "ListChecks",
    color: "#3C3489",
    bgPastel: "#EAE7F8",
    metricLabel: "Certificaciones / procesos",
    unit: "ítems",
  },
  {
    key: "mentality",
    label: "Mentality",
    subtitle: "Cultura",
    description: "Cambios culturales, gestión del cambio, comunicación interna.",
    icon: "Brain",
    color: "#712B13",
    bgPastel: "#FBE6E0",
    metricLabel: "Cambios culturales",
    unit: "programas",
  },
  {
    key: "medio_ambiente",
    label: "Medio Ambiente",
    subtitle: "Entorno",
    description: "Infraestructura tecnológica, oficinas, sostenibilidad, ambiente operativo.",
    icon: "Building",
    color: "#04342C",
    bgPastel: "#DEF1EC",
    metricLabel: "Infraestructura",
    unit: "USD",
  },
];

export function getCategoryDef(key: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.key === key);
}

export const PROVISION_STATUSES = [
  { value: "planeada", label: "Planeada", color: "#6B7280" },
  { value: "comprometida", label: "Comprometida", color: "#0EA5E9" },
  { value: "en_gestion", label: "En gestión", color: "#F59E0B" },
  { value: "asegurada", label: "Asegurada", color: "#16A34A" },
  { value: "faltante", label: "Faltante", color: "#DC2626" },
] as const;

export const RISK_LEVELS = [
  { value: "bajo", label: "Bajo", color: "#16A34A", bg: "transparent" },
  { value: "medio", label: "Medio", color: "#D97706", bg: "#FAEEDA" },
  { value: "alto", label: "Alto", color: "#DC2626", bg: "transparent" },
] as const;

// ───────────────────────────────────────────────────────────────────────
// Plantillas por industria
// ───────────────────────────────────────────────────────────────────────

export type Industry = "agro" | "manufactura" | "retail" | "servicios" | "tecnologia" | "generic";

export interface IndustryTemplate {
  industry: Industry;
  label: string;
  needs: { category: ResourceCategory; description: string; unit?: string; defaultQty?: number }[];
}

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    industry: "agro",
    label: "Agro / Agroindustria",
    needs: [
      { category: "materials", description: "Semillas y material de propagación", unit: "tipos" },
      { category: "materials", description: "Fertilizantes y agroquímicos", unit: "tipos" },
      { category: "materials", description: "Empaques y embalajes", unit: "tipos" },
      { category: "machines", description: "Maquinaria de cosecha", unit: "unidades" },
      { category: "machines", description: "Sistemas de riego y bombeo", unit: "unidades" },
      { category: "machines", description: "Cámaras frigoríficas / cadena de frío", unit: "unidades" },
      { category: "methods", description: "Certificación Global GAP", unit: "certificaciones" },
      { category: "methods", description: "Certificación HACCP", unit: "certificaciones" },
      { category: "methods", description: "Buenas prácticas agrícolas (BPA)", unit: "certificaciones" },
      { category: "medio_ambiente", description: "Centro de acopio y procesamiento", unit: "instalaciones" },
    ],
  },
  {
    industry: "manufactura",
    label: "Manufactura",
    needs: [
      { category: "materials", description: "Materia prima principal", unit: "tipos" },
      { category: "materials", description: "Componentes y partes", unit: "tipos" },
      { category: "materials", description: "Empaques", unit: "tipos" },
      { category: "machines", description: "Línea de producción", unit: "unidades" },
      { category: "machines", description: "Equipo de control de calidad", unit: "unidades" },
      { category: "machines", description: "Vehículos logísticos", unit: "unidades" },
      { category: "methods", description: "Certificación ISO 9001", unit: "certificaciones" },
      { category: "methods", description: "Certificación ISO 14001 (ambiental)", unit: "certificaciones" },
      { category: "methods", description: "Lean manufacturing implementado", unit: "procesos" },
      { category: "medio_ambiente", description: "Planta industrial", unit: "instalaciones" },
    ],
  },
  {
    industry: "retail",
    label: "Retail",
    needs: [
      { category: "materials", description: "Inventario inicial", unit: "categorías" },
      { category: "materials", description: "Materiales POP y merchandising", unit: "tipos" },
      { category: "machines", description: "Sistemas POS y autoservicio", unit: "unidades" },
      { category: "machines", description: "Mobiliario de tienda", unit: "instalaciones" },
      { category: "methods", description: "Sistema de gestión de inventario", unit: "sistemas" },
      { category: "methods", description: "Programa de fidelización", unit: "programas" },
      { category: "medio_ambiente", description: "Tiendas físicas", unit: "instalaciones" },
      { category: "medio_ambiente", description: "Centro de distribución", unit: "instalaciones" },
    ],
  },
  {
    industry: "servicios",
    label: "Servicios profesionales",
    needs: [
      { category: "methods", description: "Metodología de entrega de servicios", unit: "procesos" },
      { category: "methods", description: "Certificación ISO 9001 (calidad)", unit: "certificaciones" },
      { category: "methods", description: "Sistema de gestión documental", unit: "sistemas" },
      { category: "machines", description: "Equipos de cómputo y oficina", unit: "unidades" },
      { category: "medio_ambiente", description: "Oficinas comerciales y operativas", unit: "instalaciones" },
      { category: "mentality", description: "Cultura de servicio al cliente", unit: "programas" },
    ],
  },
  {
    industry: "tecnologia",
    label: "Tecnología / SaaS",
    needs: [
      { category: "methods", description: "Metodología ágil (Scrum/Kanban)", unit: "procesos" },
      { category: "methods", description: "Certificación ISO 27001 (seguridad)", unit: "certificaciones" },
      { category: "methods", description: "DevOps y CI/CD pipelines", unit: "procesos" },
      { category: "machines", description: "Infraestructura cloud", unit: "ambientes" },
      { category: "machines", description: "Equipos de desarrollo", unit: "unidades" },
      { category: "medio_ambiente", description: "Oficinas o coworking", unit: "instalaciones" },
      { category: "mentality", description: "Cultura de aprendizaje continuo", unit: "programas" },
      { category: "mentality", description: "Cultura ágil", unit: "programas" },
    ],
  },
  {
    industry: "generic",
    label: "Genérica",
    needs: [
      { category: "methods", description: "Sistema de gestión de calidad", unit: "sistemas" },
      { category: "machines", description: "Equipos de oficina", unit: "unidades" },
      { category: "medio_ambiente", description: "Oficinas operativas", unit: "instalaciones" },
    ],
  },
];

export function detectIndustry(sector: string | null | undefined): Industry {
  if (!sector) return "generic";
  const s = sector.toLowerCase();
  if (/agro|agric|alimento|ganad|forest/.test(s)) return "agro";
  if (/manufactur|industri|fábric|fabric|produccion/.test(s)) return "manufactura";
  if (/retail|comerci|venta|tienda/.test(s)) return "retail";
  if (/servicio|consult|asesor|profesional/.test(s)) return "servicios";
  if (/tecnolog|software|saas|digital|tech/.test(s)) return "tecnologia";
  return "generic";
}

// ───────────────────────────────────────────────────────────────────────
// Heurística: detección de certificaciones en texto
// ───────────────────────────────────────────────────────────────────────

const CERT_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "HACCP", regex: /\bHACCP\b/i },
  { name: "ISO 9001", regex: /\bISO\s*9001\b/i },
  { name: "ISO 14001", regex: /\bISO\s*14001\b/i },
  { name: "ISO 22000", regex: /\bISO\s*22000\b/i },
  { name: "ISO 27001", regex: /\bISO\s*27001\b/i },
  { name: "ISO 45001", regex: /\bISO\s*45001\b/i },
  { name: "BRC", regex: /\bBRC\b/i },
  { name: "Global GAP", regex: /\b(global\s*gap|globalgap)\b/i },
  { name: "B Corp", regex: /\bB\s*Corp\b/i },
  { name: "Fair Trade", regex: /\bfair\s*trade\b/i },
  { name: "Kosher", regex: /\bkosher\b/i },
  { name: "Orgánico", regex: /\borg[áa]nic[oa]\b/i },
];

export function detectCertifications(text: string): string[] {
  const found = new Set<string>();
  for (const p of CERT_PATTERNS) {
    if (p.regex.test(text)) found.add(p.name);
  }
  return Array.from(found);
}

// ───────────────────────────────────────────────────────────────────────
// Heurística: detección de equipos/maquinaria en texto
// ───────────────────────────────────────────────────────────────────────

const MACHINE_KEYWORDS = [
  "planta", "equipo", "maquinaria", "línea de producción", "linea de produccion",
  "vehículo", "vehiculo", "flota", "infraestructura productiva", "cámara fría",
  "camara fria", "torre", "robot", "sensor",
];

export function detectMachineMentions(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const kw of MACHINE_KEYWORDS) {
    if (lower.includes(kw)) found.add(kw);
  }
  return Array.from(found);
}

// ───────────────────────────────────────────────────────────────────────
// Detección de perfiles en textos de OCPs
// ───────────────────────────────────────────────────────────────────────

const PROFILE_KEYWORDS = [
  "KAM", "gerente", "jefe", "analista", "operador", "especialista", "supervisor",
  "técnico", "tecnico", "asistente", "vendedor", "ejecutivo", "consultor", "ingeniero",
];

export function detectProfileMentions(text: string): string[] {
  const found = new Set<string>();
  for (const kw of PROFILE_KEYWORDS) {
    const regex = new RegExp(`\\b${kw}\\b`, "i");
    if (regex.test(text)) found.add(kw);
  }
  return Array.from(found);
}

// ───────────────────────────────────────────────────────────────────────
// Estimación de costo por perfil (rangos típicos USD/año)
// ───────────────────────────────────────────────────────────────────────

const PROFILE_COSTS: Record<string, number> = {
  gerente: 60000,
  KAM: 50000,
  jefe: 40000,
  ingeniero: 36000,
  especialista: 30000,
  supervisor: 28000,
  analista: 24000,
  consultor: 36000,
  ejecutivo: 28000,
  técnico: 18000,
  tecnico: 18000,
  operador: 14000,
  vendedor: 18000,
  asistente: 14000,
};

export function estimateProfileCost(profile: string): number {
  const lower = profile.toLowerCase();
  for (const [key, cost] of Object.entries(PROFILE_COSTS)) {
    if (lower.includes(key.toLowerCase())) return cost;
  }
  return 24000; // default
}

// ───────────────────────────────────────────────────────────────────────
// Riesgo automático según brecha
// ───────────────────────────────────────────────────────────────────────

export function computeRiskLevel(
  amountEstimated: number | null,
  amountSecured: number,
): "bajo" | "medio" | "alto" {
  const target = amountEstimated ?? 0;
  if (target === 0) return "bajo";
  const coverage = amountSecured / target;
  if (coverage >= 0.85) return "bajo";
  if (coverage >= 0.5) return "medio";
  return "alto";
}

// ───────────────────────────────────────────────────────────────────────
// Formato
// ───────────────────────────────────────────────────────────────────────

export function formatMoney(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatMoneyShort(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return `${amount.toFixed(0)}`;
}
