// ───────────────────────────────────────────────────────────────────────
// Generador de sugerencias de reformulacion para el Filtro de Rumelt.
// Implementacion actual: templates contextualizados con palabras clave.
// Diseñado para ser reemplazado por IA semantica sin tocar consumidores.
// ───────────────────────────────────────────────────────────────────────

export type RumeltCriterion = "consistencia" | "consonancia" | "ventaja" | "factibilidad";

export interface SuggestionContext {
  strategyText: string;
  /** Palabras clave detectadas en el FODA, OLPs, etc. (opcional) */
  contextHints?: string[];
}

export function generateReformulationSuggestion(
  criterion: RumeltCriterion,
  ctx: SuggestionContext,
): string {
  const text = ctx.strategyText.toLowerCase();
  switch (criterion) {
    case "consistencia": {
      // Detectar si hay verbos que pueden chocar con valores
      if (text.includes("agresiv") || text.includes("desplaz")) {
        return `Sugerencia: suaviza el lenguaje agresivo de la estrategia. En vez de "desplazar a competidores", considera "ganar cuota mediante diferenciacion en X". Esto reduce el conflicto con valores y mantiene el objetivo.`;
      }
      if (text.includes("recortar") || text.includes("despedir")) {
        return `Sugerencia: si la reduccion afecta personas, complementa con "...mediante reasignacion de roles y plan de transicion" para alinear con valores corporativos.`;
      }
      return `Sugerencia: ajusta la estrategia para que el objetivo sea coherente con tu vision y otros OLPs. Considera reformular como: "Lograr [resultado] respetando [valor o restriccion clave]".`;
    }
    case "consonancia": {
      if (text.includes("tradicional") || text.includes("convencional")) {
        return `Sugerencia: considera incorporar componentes digitales o sostenibles para sintonizar con tendencias del entorno. Reformula como: "[estrategia original] integrando capacidades digitales/sostenibles".`;
      }
      if (text.includes("local") && !text.includes("digital")) {
        return `Sugerencia: si el sector esta digitalizandose, considera complementar con canal omnicanal o presencia digital para no quedar rezagado.`;
      }
      return `Sugerencia: replantea considerando las tendencias actuales del sector. Si hay cambios tecnologicos, regulatorios o sociales relevantes, incorporalos: "[estrategia] aprovechando [tendencia X]".`;
    }
    case "ventaja": {
      if (text.includes("igual") || text.includes("competitiv")) {
        return `Sugerencia: refuerza con un elemento dificil de copiar: marca, escala, exclusividad de proveedor, IP o relaciones unicas. Ej: "...apalancado en nuestra red de distribucion exclusiva en [region]".`;
      }
      if (text.includes("precio")) {
        return `Sugerencia: la estrategia de precio puede ser facilmente igualada. Añade un componente diferenciador: servicio, marca, experiencia, o tecnologia que la haga sostenible.`;
      }
      return `Sugerencia: añade explicitamente la fuente de ventaja sostenible. Reformula como: "[estrategia] aprovechando [capacidad unica F2/F3] que es dificil de copiar por [razon]".`;
    }
    case "factibilidad": {
      if (text.includes("nacional") || text.includes("internacional") || text.includes("global")) {
        return `Sugerencia: considera fasear la expansion. Reformula como "Iniciar piloto en [region/segmento limitado] al año [X], escalar a [resto] al año [Y]" para reducir requerimientos iniciales.`;
      }
      if (text.includes("tecnolog") || text.includes("digital")) {
        return `Sugerencia: si requiere talento tecnologico escaso, considera alianza o tercerizacion: "...mediante alianza con [partner tecnologico] que aporta capacidad inmediata".`;
      }
      return `Sugerencia: reduce el alcance inicial o agrega alianzas para hacerla viable. Reformula como: "[estrategia] iniciando con [version reducida] para validar antes de escalar".`;
    }
  }
}

export const CRITERION_INFO: Record<
  RumeltCriterion,
  { label: string; question: string; color: string; bg: string; border: string; icon: string }
> = {
  consistencia: {
    label: "Consistencia",
    question: "¿Es internamente coherente con tu vision, OLPs, valores y otras estrategias? ¿No genera contradicciones?",
    color: "#8B5CF6", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.4)",
    icon: "puzzle",
  },
  consonancia: {
    label: "Consonancia",
    question: "¿Responde adecuadamente al entorno externo y sus tendencias? ¿Esta en sintonia con la industria, tecnologia, regulacion y sociedad?",
    color: "#2563EB", bg: "rgba(37,99,235,0.08)", border: "rgba(37,99,235,0.4)",
    icon: "wind",
  },
  ventaja: {
    label: "Ventaja",
    question: "¿Crea o protege una ventaja competitiva sostenible? ¿Construye algo dificil de copiar por competidores?",
    color: "#F43F5E", bg: "rgba(244,63,94,0.08)", border: "rgba(244,63,94,0.4)",
    icon: "trophy",
  },
  factibilidad: {
    label: "Factibilidad",
    question: "¿La empresa puede ejecutarla con los recursos que tiene o puede obtener? ¿Hay capital, talento, capacidad operativa y tiempo?",
    color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.4)",
    icon: "tools",
  },
};

export function computeVerdict(passes: { criterion: RumeltCriterion; passes: boolean | null }[]): "aprobada" | "en_revision" | "rechazada" | "pendiente" {
  const evaluated = passes.filter((p) => p.passes !== null);
  if (evaluated.length < 4) return "pendiente";
  const failed = evaluated.filter((p) => p.passes === false).length;
  if (failed === 0) return "aprobada";
  if (failed === 1) return "en_revision";
  return "rechazada";
}
