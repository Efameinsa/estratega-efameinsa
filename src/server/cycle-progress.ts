import type { PrismaClient } from "@/generated/prisma/client";

// Avance del ciclo estratégico en UNA sola consulta (antes eran 18 COUNT por
// cada procedimiento y el dashboard llamaba a tres). Cada sección se considera
// hecha cuando tiene al menos un registro.

export type ModuleId = "M1" | "M2" | "M3" | "M4" | "M5";

type Section = {
  key: string;
  module: ModuleId;
  label: string;
  description: string;
  path: string; // relativo a /cycles/[cycleId]
  /** Subconsulta EXISTS; $1 es el cycleId. Tablas fijas (sin entrada de usuario). */
  sql: string;
};

const exists = (table: string, extra = "") => `EXISTS(SELECT 1 FROM "${table}" t WHERE t."cycleId" = $1 ${extra})`;

// Orden = orden recomendado de trabajo (el mismo del menú lateral).
export const SECTIONS: Section[] = [
  { key: "vision", module: "M1", label: "Visión", description: "Establece la visión a largo plazo de la organización.", path: "m1-identity/vision", sql: exists("Vision") },
  { key: "mission", module: "M1", label: "Misión", description: "Describe el propósito y la razón de ser.", path: "m1-identity/mission", sql: exists("Mission") },
  { key: "values", module: "M1", label: "Valores", description: "Define los valores que guían a la organización.", path: "m1-identity/values", sql: exists("Value") },
  { key: "interests", module: "M1", label: "Intereses", description: "Identifica intereses organizacionales y principios cardinales.", path: "m1-identity/interests", sql: exists("Interest") },

  { key: "pestec", module: "M2", label: "PESTEC", description: "Analiza el entorno político, económico, social, tecnológico, ecológico y competitivo.", path: "m2-diagnosis/pestec", sql: exists("PestecFactor") },
  { key: "porter", module: "M2", label: "5 Fuerzas de Porter", description: "Evalúa las fuerzas competitivas de la industria.", path: "m2-diagnosis/porter", sql: exists("PorterAnalysis") },
  { key: "mefe", module: "M2", label: "Matriz MEFE", description: "Sintetiza oportunidades y amenazas del entorno.", path: "m2-diagnosis/mefe", sql: exists("MefeFactor") },
  { key: "competitive", module: "M2", label: "Análisis competitivo", description: "Evalúa la posición competitiva.", path: "m2-diagnosis/competitive-analysis", sql: exists("CompetitiveAnalysis") },
  { key: "attractiveness", module: "M2", label: "Atractividad de la industria", description: "Mide qué tan atractiva es la industria.", path: "m2-diagnosis/industry-attractiveness", sql: exists("IndustryAttractiveness") },
  { key: "mpc", module: "M2", label: "Matriz MPC", description: "Compara la organización con sus competidores.", path: "m2-diagnosis/mpc", sql: exists("MpcCompetitor") },
  { key: "amofhit", module: "M2", label: "Auditoría AMOFHIT", description: "Audita las áreas funcionales internas.", path: "m2-diagnosis/amofhit", sql: exists("AmofhitArea") },
  { key: "mefi", module: "M2", label: "Matriz MEFI", description: "Sintetiza fortalezas y debilidades internas.", path: "m2-diagnosis/mefi", sql: exists("MefiFactor") },

  { key: "foda", module: "M3", label: "FODA cruzado", description: "Cruza factores internos y externos para generar estrategias.", path: "m3-formulation/foda-cruzado", sql: exists("Strategy") },
  { key: "peyea", module: "M3", label: "Matriz PEYEA", description: "Evalúa la postura estratégica.", path: "m3-formulation/peyea", sql: exists("PeyeaAnalysis") },
  { key: "olp", module: "M3", label: "Objetivos de largo plazo", description: "Define los OLP por perspectiva del Balanced Scorecard.", path: "m3-formulation/olp", sql: exists("Olp") },
  { key: "md", module: "M3", label: "Matriz de decisión", description: "Consolida las estrategias de todas las matrices.", path: "m3-formulation/md", sql: exists("ConsolidatedStrategy") },
  { key: "mcpe", module: "M3", label: "Matriz MCPE", description: "Prioriza las estrategias consolidadas.", path: "m3-formulation/mcpe", sql: exists("McpeAnalysis") },
  { key: "rumelt", module: "M3", label: "Prueba de Rumelt", description: "Valida consistencia, consonancia, ventaja y factibilidad.", path: "m3-formulation/rumelt", sql: exists("RumeltEvaluation") },
  { key: "ethics", module: "M3", label: "Auditoría ética", description: "Evalúa derechos, justicia y utilitarismo.", path: "m3-formulation/ethics", sql: exists("EthicsEvaluation") },

  { key: "ocp", module: "M4", label: "Objetivos de corto plazo", description: "Baja cada OLP a metas anuales con acciones trimestrales.", path: "m4-deployment/ocp", sql: exists("Ocp") },
  { key: "policies", module: "M4", label: "Políticas", description: "Define las reglas que guían la implementación.", path: "m4-deployment/politicas", sql: exists("Politica") },
  { key: "structure", module: "M4", label: "Estructura organizacional", description: "Alinea la estructura con la estrategia.", path: "m4-deployment/estructura", sql: exists("OrgStructure") },
  { key: "resources", module: "M4", label: "Recursos (7M)", description: "Planifica los recursos necesarios.", path: "m4-deployment/7m", sql: exists("ResourcePlan") },

  { key: "kpis", module: "M5", label: "KPIs y metas", description: "Define indicadores con metas por periodo.", path: "m5-control/kpis", sql: exists("Kpi") },
  { key: "tablero", module: "M5", label: "Tablero BSC", description: "Carga valores reales y sigue el semáforo del BSC.", path: "m5-control/tablero", sql: `EXISTS(SELECT 1 FROM "KpiPeriod" p JOIN "Kpi" k ON k.id = p."kpiId" WHERE k."cycleId" = $1 AND p."realValue" IS NOT NULL)` },
  { key: "review", module: "M5", label: "Revisión estratégica", description: "Programa y registra revisiones formales.", path: "m5-control/revision", sql: exists("Review") },
  { key: "portfolio", module: "M5", label: "Portafolio de proyectos", description: "Genera los proyectos que ejecutan el plan.", path: "/portfolio", sql: exists("Portfolio") },
];

const QUERY = `SELECT ${SECTIONS.map((s, i) => `${s.sql} AS s${i}`).join(", ")}`;

export type SectionState = Section & { done: boolean };

// Memo por petición: getProgress, getNextStep y getPending del dashboard
// viajan en el mismo lote de tRPC y comparten la consulta.
const memo = new WeakMap<object, Map<string, Promise<SectionState[]>>>();

export function getSectionStates(db: PrismaClient, cycleId: string, requestKey?: object): Promise<SectionState[]> {
  const run = async () => {
    const [row] = await db.$queryRawUnsafe<Record<string, boolean>[]>(QUERY, cycleId);
    return SECTIONS.map((s, i) => ({ ...s, done: !!row?.[`s${i}`] }));
  };
  if (!requestKey) return run();
  let byCycle = memo.get(requestKey);
  if (!byCycle) memo.set(requestKey, (byCycle = new Map()));
  let p = byCycle.get(cycleId);
  if (!p) byCycle.set(cycleId, (p = run()));
  return p;
}

export type ModuleStatus = { status: "COMPLETADO" | "EN_CURSO" | "BLOQUEADO"; progress: number; done: number; total: number };

export function moduleStatuses(states: SectionState[]): Record<ModuleId, ModuleStatus> {
  const out = {} as Record<ModuleId, ModuleStatus>;
  let prevComplete = true;
  for (const m of ["M1", "M2", "M3", "M4", "M5"] as ModuleId[]) {
    const secs = states.filter((s) => s.module === m);
    const done = secs.filter((s) => s.done).length;
    const progress = Math.round((done / secs.length) * 100);
    // Un módulo se habilita cuando el anterior tiene avance; así no se bloquea
    // el trabajo en paralelo pero se respeta el orden sugerido.
    const status: ModuleStatus["status"] = progress === 100 ? "COMPLETADO" : prevComplete || done > 0 ? "EN_CURSO" : "BLOQUEADO";
    out[m] = { status, progress, done, total: secs.length };
    prevComplete = progress > 0;
  }
  return out;
}
