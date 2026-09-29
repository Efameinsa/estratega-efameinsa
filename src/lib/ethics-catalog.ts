// ───────────────────────────────────────────────────────────────────────
// Catalogo de principios eticos y helpers de la Auditoria Etica
// ───────────────────────────────────────────────────────────────────────

export type EthicsBlock = "derechos" | "justicia" | "utilitarismo";
export type EthicsRating = "viola" | "neutral" | "promueve";
export type EthicsVerdict = "aprobada" | "requiere_mitigacion" | "aprobada_con_mitigantes" | "rechazada";

export interface PrincipleDef {
  key: string;
  block: EthicsBlock;
  label: string;
  description: string;
}

export const PRINCIPLES: PrincipleDef[] = [
  // ── DERECHOS ────────────────────────────────────────────────────────
  { key: "der.vida_seguridad", block: "derechos", label: "Derecho a la vida y seguridad", description: "Proteccion de la integridad fisica y de la seguridad de los stakeholders." },
  { key: "der.propiedad", block: "derechos", label: "Respeto a la propiedad", description: "Reconocimiento y proteccion de la propiedad publica y privada." },
  { key: "der.libre_pensamiento", block: "derechos", label: "Libre pensamiento", description: "Derecho a pensar y formar opiniones sin coercion." },
  { key: "der.privacidad", block: "derechos", label: "Privacidad", description: "Proteccion de datos personales y vida privada de empleados, clientes y proveedores." },
  { key: "der.expresion_conciencia", block: "derechos", label: "Libertad de conciencia y expresion", description: "Posibilidad de manifestar ideas y creencias sin censura." },
  { key: "der.sin_represalias", block: "derechos", label: "Hablar libremente sin represalias", description: "Proteccion a quien reporta irregularidades (whistleblowers) o emite criticas legitimas." },
  { key: "der.debido_proceso", block: "derechos", label: "Aplicacion del debido proceso", description: "Decisiones disciplinarias o legales con procedimientos justos." },

  // ── JUSTICIA ────────────────────────────────────────────────────────
  { key: "jus.distribucion", block: "justicia", label: "Distribucion justa de costos y beneficios", description: "Las cargas y beneficios de la estrategia se reparten razonablemente entre stakeholders." },
  { key: "jus.compensacion", block: "justicia", label: "Normas de compensacion equitativas", description: "Salarios, beneficios y reconocimiento alineados con desempeño y responsabilidades." },
  { key: "jus.equidad_trato", block: "justicia", label: "Equidad en el trato", description: "Sin discriminacion por genero, raza, religion, orientacion u otros factores irrelevantes." },

  // ── UTILITARISMO ────────────────────────────────────────────────────
  { key: "uti.fines", block: "utilitarismo", label: "Fines y resultados estrategicos", description: "Los resultados que se buscan justifican los costos sociales generados." },
  { key: "uti.medios", block: "utilitarismo", label: "Medios estrategicos empleados", description: "Las acciones para alcanzar los resultados son socialmente aceptables." },
];

export const BLOCK_INFO: Record<EthicsBlock, { label: string; question: string; color: string; bg: string; border: string }> = {
  derechos: {
    label: "Derechos",
    question: "¿La estrategia respeta los derechos fundamentales de los stakeholders?",
    color: "#8B5CF6", bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.40)",
  },
  justicia: {
    label: "Justicia",
    question: "¿La estrategia es justa con todos los stakeholders?",
    color: "#F43F5E", bg: "rgba(244,63,94,0.08)", border: "rgba(244,63,94,0.40)",
  },
  utilitarismo: {
    label: "Utilitarismo",
    question: "¿Los beneficios generados superan los daños potenciales?",
    color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.40)",
  },
};

export const VERDICT_INFO: Record<EthicsVerdict, { label: string; color: string; bg: string; border: string; icon: string }> = {
  aprobada:                  { label: "Aprobada",                color: "#16A34A", bg: "rgba(22,163,74,0.10)",  border: "rgba(22,163,74,0.40)",  icon: "✓" },
  aprobada_con_mitigantes:   { label: "Con mitigantes",          color: "#F59E0B", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.40)", icon: "🛡" },
  requiere_mitigacion:       { label: "Requiere mitigacion",     color: "#F59E0B", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.40)", icon: "!" },
  rechazada:                 { label: "Rechazada",               color: "#DC2626", bg: "rgba(220,38,38,0.10)",  border: "rgba(220,38,38,0.40)",  icon: "✗" },
};

export function principlesByBlock(block: EthicsBlock): PrincipleDef[] {
  return PRINCIPLES.filter((p) => p.block === block);
}

export function computeAutoVerdict(
  principles: Array<{ principleKey: string; rating: EthicsRating }>,
  mitigants: Array<{ principleKey: string; postSeverity: "mantiene" | "neutral" | "promueve" }>,
): { verdict: EthicsVerdict; violations: string[] } {
  const violations = principles.filter((p) => p.rating === "viola").map((p) => p.principleKey);
  if (violations.length === 0) return { verdict: "aprobada", violations: [] };

  // Verificar si todas las violaciones tienen mitigante que reduzca a neutral o promueve
  const mitigantsByPrinciple = new Map(mitigants.map((m) => [m.principleKey, m]));
  const unmitigated: string[] = [];
  let allConverted = true;
  for (const v of violations) {
    const m = mitigantsByPrinciple.get(v);
    if (!m || m.postSeverity === "mantiene") {
      unmitigated.push(v);
      allConverted = false;
    }
  }

  if (unmitigated.length === violations.length) {
    return { verdict: "requiere_mitigacion", violations };
  }
  if (allConverted) {
    return { verdict: "aprobada_con_mitigantes", violations };
  }
  return { verdict: "requiere_mitigacion", violations: unmitigated };
}

// Generador de sugerencias de mitigacion por principio
export function generateMitigantSuggestion(principleKey: string, strategyText: string): string {
  const text = strategyText.toLowerCase();
  const map: Record<string, string> = {
    "der.vida_seguridad": "Implementar protocolo de seguridad ocupacional reforzado, capacitar al personal y auditar trimestralmente cumplimiento OHSAS/ISO 45001.",
    "der.propiedad": "Establecer politica clara de respeto a propiedad intelectual y bienes de terceros, con clausulas contractuales explicitas.",
    "der.privacidad": "Implementar politica de privacidad alineada con normativa de proteccion de datos personales y auditoria anual de cumplimiento.",
    "der.expresion_conciencia": "Garantizar canales formales de retroalimentacion anonima y politica anti-represalias documentada.",
    "der.sin_represalias": "Establecer linea de denuncia anonima, comite de etica con miembros externos y politica documentada de proteccion al denunciante.",
    "der.debido_proceso": "Definir procedimientos disciplinarios escritos con etapas claras y derecho a defensa.",
    "jus.distribucion": "Diseñar plan de compensaciones que asegure que los stakeholders mas afectados reciban beneficios proporcionales.",
    "jus.compensacion": "Revisar estructura salarial usando benchmarks de mercado y establecer politica de transparencia retributiva.",
    "jus.equidad_trato": "Implementar politica de diversidad e inclusion con metricas de seguimiento (% por genero, etnicidad, etc.) y capacitacion obligatoria.",
    "uti.fines": "Realizar evaluacion de impacto social previa con stakeholders afectados y rediseñar para maximizar beneficio neto.",
    "uti.medios": "Adoptar codigo de conducta operacional que limite practicas socialmente cuestionables y establecer comite de etica supervisor.",
  };
  // Personalizacion contextual
  if (text.includes("datos") || text.includes("personal")) {
    return map["der.privacidad"] ?? map[principleKey];
  }
  return map[principleKey] ?? "Definir mitigante especifico: ¿que medida concreta neutralizara esta violacion? Asignar responsable, plazo e indicador de cumplimiento.";
}
