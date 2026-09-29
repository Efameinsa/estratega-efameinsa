// ---------------------------------------------------------------------------
// Competitive Analysis & Industry Attractiveness — D'Alessio
// Two questionnaires that feed FCE candidates for the MPC
// ---------------------------------------------------------------------------

export interface InterpretacionRango {
  rango: string;
  label: string;
  nivel: "high" | "med" | "low";
  texto: string;
}

export interface FceTemplate {
  nombre: string;
  pesoBase: number;
}

export interface CriterioDef {
  id: string;
  nombre: string;
  impulsor: string;
  descripcion: string;
  extremoIzquierdo: string;
  extremoDerecho: string;
  min: number;
  max: number;
  step: number;
  defaultVal: number;
  interpretaciones: InterpretacionRango[];
  fceTemplates: Array<{ rangoMin: number; rangoMax: number; fce: FceTemplate | null }>;
}

// Helper to find interpretation for a value
export function getInterpretacion(criterio: CriterioDef, value: number): InterpretacionRango {
  for (const interp of criterio.interpretaciones) {
    const [min, max] = parseRango(interp.rango, criterio.min, criterio.max);
    if (value >= min && value <= max) return interp;
  }
  return criterio.interpretaciones[criterio.interpretaciones.length - 1];
}

// Helper to find FCE template for a value
export function getFceForValue(criterio: CriterioDef, value: number): FceTemplate | null {
  for (const t of criterio.fceTemplates) {
    if (value >= t.rangoMin && value <= t.rangoMax && t.fce) return t.fce;
  }
  return null;
}

function parseRango(rango: string, globalMin: number, globalMax: number): [number, number] {
  if (rango.includes("-")) {
    const [a, b] = rango.split("-").map(Number);
    return [a, b];
  }
  if (rango.endsWith("+")) return [parseInt(rango), globalMax];
  return [globalMin, globalMax];
}

export function getNivelColor(nivel: "high" | "med" | "low"): { text: string; bg: string; border: string } {
  // Paleta alineada con la marca morado/negro:
  //   low = rojo suave, med = lavanda (color primario), high = verde menta
  if (nivel === "high") return { text: "#34d399", bg: "transparent", border: "#34d399" };
  if (nivel === "med") return { text: "#b8a4f0", bg: "transparent", border: "#a78bfa" };
  return { text: "#fca5a5", bg: "transparent", border: "#fca5a5" };
}

// ═══════════════════════════════════════════════════════════════════════════
// QUESTIONNAIRE 1: Analisis Competitivo de la Industria (10 criteria)
// ═══════════════════════════════════════════════════════════════════════════

export const COMPETITIVE_CRITERIA: CriterioDef[] = [
  {
    id: "comp-1", nombre: "Tasa de crecimiento potencial de la industria",
    impulsor: "Porcentaje de crecimiento anual en terminos reales",
    descripcion: "¿Cuanto crece el sector? Un mercado en expansion facilita el crecimiento sin quitar cuota.",
    extremoIzquierdo: "-10% declive", extremoDerecho: "50%+ explosivo",
    min: -10, max: 50, step: 1, defaultVal: 0,
    interpretaciones: [
      { rango: "-10-0", label: "Declive/estancado", nivel: "low", texto: "El sector esta en contraccion o estancado. Competencia por participacion muy intensa." },
      { rango: "1-3", label: "Crecimiento bajo", nivel: "low", texto: "Crecimiento casi nulo — sector en madurez avanzada. Dificil crecer sin quitar participacion." },
      { rango: "4-8", label: "Crecimiento moderado", nivel: "med", texto: "Crecimiento moderado — hay espacio pero la competencia por participacion es real." },
      { rango: "9-20", label: "Crecimiento alto", nivel: "high", texto: "Sector en expansion — oportunidades para actores bien posicionados." },
      { rango: "21-50", label: "Crecimiento explosivo", nivel: "high", texto: "Mercado en hipercrecimiento — ventana de oportunidad para captura rapida." },
    ],
    fceTemplates: [
      { rangoMin: -10, rangoMax: 3, fce: null },
      { rangoMin: 4, rangoMax: 8, fce: { nombre: "Capacidad de captura de mercado en crecimiento", pesoBase: 0.07 } },
      { rangoMin: 9, rangoMax: 20, fce: { nombre: "Velocidad de expansion y captura de mercado", pesoBase: 0.09 } },
      { rangoMin: 21, rangoMax: 50, fce: { nombre: "Escalabilidad y velocidad de expansion", pesoBase: 0.11 } },
    ],
  },
  {
    id: "comp-2", nombre: "Facilidad de entrada de nuevas empresas",
    impulsor: "Nivel de barreras de entrada al sector",
    descripcion: "Valor alto = pocas barreras = sector vulnerable a nuevos entrantes.",
    extremoIzquierdo: "Imposible entrar", extremoDerecho: "Sin ninguna barrera",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-2", label: "Barreras muy altas", nivel: "high", texto: "Las altas barreras protegen a los incumbentes de nueva competencia." },
      { rango: "3-4", label: "Barreras significativas", nivel: "high", texto: "Barreras significativas que requieren inversion considerable para superarlas." },
      { rango: "5-6", label: "Barreras moderadas", nivel: "med", texto: "Nuevos entrantes pueden ingresar con inversion pero no es trivial." },
      { rango: "7-8", label: "Barreras bajas", nivel: "low", texto: "Barreras bajas permiten entrada frecuente de nuevos actores." },
      { rango: "9-10", label: "Sin barreras", nivel: "low", texto: "Sector practicamente abierto. Cualquier actor puede entrar." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 4, fce: null },
      { rangoMin: 5, rangoMax: 6, fce: { nombre: "Gestion de barreras de entrada y posicionamiento defensivo", pesoBase: 0.07 } },
      { rangoMin: 7, rangoMax: 10, fce: { nombre: "Diferenciacion como barrera de entrada y fidelizacion", pesoBase: 0.09 } },
    ],
  },
  {
    id: "comp-3", nombre: "Intensidad de la competencia entre empresas",
    impulsor: "Nivel de rivalidad activa en el sector",
    descripcion: "Valor alto = extremadamente competitivo = dificil mantener margenes.",
    extremoIzquierdo: "Casi ninguna competencia", extremoDerecho: "Extremadamente competitivo",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-2", label: "Competencia minima", nivel: "high", texto: "Sector con muy poca rivalidad — margenes altos y posicion facil de mantener." },
      { rango: "3-4", label: "Competencia baja", nivel: "high", texto: "Competencia moderada-baja. Hay espacio para coexistir con margenes razonables." },
      { rango: "5-6", label: "Competencia media", nivel: "med", texto: "Presion competitiva real pero manejable. La diferenciacion evita competencia por precio." },
      { rango: "7-8", label: "Competencia alta", nivel: "low", texto: "Alta rivalidad que presiona margenes constantemente." },
      { rango: "9-10", label: "Competencia maxima", nivel: "low", texto: "Guerra de precios y competencia extrema. Solo los mas eficientes sobreviven." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 4, fce: null },
      { rangoMin: 5, rangoMax: 6, fce: { nombre: "Ventaja competitiva sostenible en el sector", pesoBase: 0.09 } },
      { rangoMin: 7, rangoMax: 10, fce: { nombre: "Eficiencia operativa y diferenciacion competitiva", pesoBase: 0.11 } },
    ],
  },
  {
    id: "comp-4", nombre: "Grado de sustitucion del producto",
    impulsor: "Disponibilidad y atractivo de productos sustitutos",
    descripcion: "Valor alto = muchos sustitutos atractivos.",
    extremoIzquierdo: "Ningun sustituto", extremoDerecho: "Muchos sustitutos",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-2", label: "Sin sustitutos", nivel: "high", texto: "La ausencia de sustitutos protege la demanda del sector." },
      { rango: "3-4", label: "Sustitutos escasos", nivel: "high", texto: "Pocos sustitutos con impacto limitado." },
      { rango: "5-6", label: "Sustitucion moderada", nivel: "med", texto: "El cliente tiene alternativas pero cambiar tiene costo real." },
      { rango: "7-8", label: "Muchos sustitutos", nivel: "low", texto: "Multiples sustitutos disponibles presionan la demanda." },
      { rango: "9-10", label: "Sustitucion total", nivel: "low", texto: "El sector enfrenta riesgo de sustitucion masiva." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 4, fce: null },
      { rangoMin: 5, rangoMax: 6, fce: { nombre: "Diferenciacion y propuesta de valor unica", pesoBase: 0.08 } },
      { rangoMin: 7, rangoMax: 10, fce: { nombre: "Fidelizacion de clientes y barreras de cambio", pesoBase: 0.10 } },
    ],
  },
  {
    id: "comp-5", nombre: "Dependencia en productos complementarios",
    impulsor: "Grado de dependencia del ecosistema de complementarios",
    descripcion: "Alta dependencia = mayor vulnerabilidad.",
    extremoIzquierdo: "Independiente", extremoDerecho: "Altamente dependiente",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-2", label: "Independiente", nivel: "high", texto: "El negocio no depende de ecosistemas externos." },
      { rango: "3-4", label: "Baja dependencia", nivel: "high", texto: "Dependencia limitada sin vulnerabilidad significativa." },
      { rango: "5-6", label: "Dependencia moderada", nivel: "med", texto: "La cadena de valor requiere coordinacion con terceros clave." },
      { rango: "7-8", label: "Dependencia alta", nivel: "low", texto: "Alta dependencia de complementarios crea vulnerabilidades." },
      { rango: "9-10", label: "Dependencia critica", nivel: "low", texto: "Sin los complementarios el negocio no funciona." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 4, fce: null },
      { rangoMin: 5, rangoMax: 6, fce: { nombre: "Gestion de ecosistema de partners", pesoBase: 0.06 } },
      { rangoMin: 7, rangoMax: 10, fce: { nombre: "Gestion estrategica de complementarios y ecosistema", pesoBase: 0.08 } },
    ],
  },
  {
    id: "comp-6", nombre: "Poder de negociacion de los consumidores",
    impulsor: "Quien controla las condiciones de compra-venta",
    descripcion: "Valor alto = consumidores con alto poder = presion sobre precios.",
    extremoIzquierdo: "Productores dominan", extremoDerecho: "Consumidores dominan",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-2", label: "Productores dominan", nivel: "high", texto: "Los productores controlan precios y condiciones." },
      { rango: "3-4", label: "Ventaja productores", nivel: "high", texto: "Los productores tienen ventaja negociadora." },
      { rango: "5-6", label: "Poder equilibrado", nivel: "med", texto: "Negociacion equilibrada. Los precios se forman naturalmente." },
      { rango: "7-8", label: "Ventaja consumidores", nivel: "low", texto: "Los consumidores tienen poder significativo sobre precios." },
      { rango: "9-10", label: "Consumidores dominan", nivel: "low", texto: "Los clientes dictan terminos. Margenes muy presionados." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 4, fce: null },
      { rangoMin: 5, rangoMax: 6, fce: { nombre: "Gestion de relacion con clientes y propuesta de valor", pesoBase: 0.07 } },
      { rangoMin: 7, rangoMax: 10, fce: { nombre: "Fidelizacion y gestion de experiencia del cliente", pesoBase: 0.09 } },
    ],
  },
  {
    id: "comp-7", nombre: "Poder de negociacion de los proveedores",
    impulsor: "Quien controla insumos y condiciones de suministro",
    descripcion: "Valor alto = proveedores con alto poder = riesgo de alza de costos.",
    extremoIzquierdo: "Compradores dominan", extremoDerecho: "Proveedores dominan",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-2", label: "Compradores dominan", nivel: "high", texto: "Los compradores tienen alto poder sobre los proveedores." },
      { rango: "3-4", label: "Ventaja compradores", nivel: "high", texto: "Los compradores tienen ventaja en la negociacion." },
      { rango: "5-6", label: "Poder equilibrado", nivel: "med", texto: "Relacion equilibrada con proveedores." },
      { rango: "7-8", label: "Ventaja proveedores", nivel: "low", texto: "Los proveedores tienen poder significativo." },
      { rango: "9-10", label: "Proveedores dominan", nivel: "low", texto: "Los proveedores controlan las condiciones." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 4, fce: null },
      { rangoMin: 5, rangoMax: 6, fce: { nombre: "Gestion estrategica de proveedores", pesoBase: 0.06 } },
      { rangoMin: 7, rangoMax: 10, fce: { nombre: "Diversificacion de proveedores y gestion de cadena de suministro", pesoBase: 0.08 } },
    ],
  },
  {
    id: "comp-8", nombre: "Grado de sofisticacion tecnologica",
    impulsor: "Nivel de avance tecnologico requerido para competir",
    descripcion: "Valor alto = tecnologia de punta critica.",
    extremoIzquierdo: "Tecnologia muy basica", extremoDerecho: "Tecnologia de alto nivel",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-2", label: "Sin req. tecnologicos", nivel: "high", texto: "La tecnologia no es factor diferenciador." },
      { rango: "3-4", label: "Tecnologia basica", nivel: "high", texto: "Tecnologia basica suficiente para operar." },
      { rango: "5-6", label: "Tecnologia media", nivel: "med", texto: "La digitalizacion importa pero no es el unico diferenciador." },
      { rango: "7-8", label: "Tecnologia avanzada", nivel: "low", texto: "La tecnologia es diferenciador critico." },
      { rango: "9-10", label: "Tecnologia de frontera", nivel: "low", texto: "El sector requiere tecnologia de punta." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 4, fce: null },
      { rangoMin: 5, rangoMax: 6, fce: { nombre: "Capacidad tecnologica e innovacion digital", pesoBase: 0.08 } },
      { rangoMin: 7, rangoMax: 10, fce: { nombre: "Liderazgo tecnologico e innovacion continua", pesoBase: 0.11 } },
    ],
  },
  {
    id: "comp-9", nombre: "Regimen de innovacion en la industria",
    impulsor: "Velocidad de cambio en modelos de negocio y productos",
    descripcion: "Valor alto = innovacion rapida = necesidad de adaptacion constante.",
    extremoIzquierdo: "Casi ninguna innovacion", extremoDerecho: "Innovacion muy rapida",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-2", label: "Sin innovacion", nivel: "high", texto: "Sector estable sin presion de innovacion." },
      { rango: "3-4", label: "Innovacion lenta", nivel: "high", texto: "El sector evoluciona lentamente." },
      { rango: "5-6", label: "Innovacion moderada", nivel: "med", texto: "El sector evoluciona pero hay tiempo para adaptarse." },
      { rango: "7-8", label: "Innovacion rapida", nivel: "low", texto: "Cambios frecuentes. Velocidad de adaptacion es critica." },
      { rango: "9-10", label: "Innovacion disruptiva", nivel: "low", texto: "El sector se transforma constantemente." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 4, fce: null },
      { rangoMin: 5, rangoMax: 6, fce: { nombre: "Capacidad de adaptacion e innovacion de productos", pesoBase: 0.07 } },
      { rangoMin: 7, rangoMax: 10, fce: { nombre: "Velocidad de innovacion y agilidad estrategica", pesoBase: 0.10 } },
    ],
  },
  {
    id: "comp-10", nombre: "Nivel de capacidad gerencial",
    impulsor: "Sofisticacion de la gestion y direccion estrategica del sector",
    descripcion: "Valor alto = directivos muy capaces = competencia mas intensa y profesional.",
    extremoIzquierdo: "Muy pocos gerentes capaces", extremoDerecho: "Muchos gerentes muy capaces",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-2", label: "Gestion deficiente", nivel: "high", texto: "Sector con gestion precaria. Buena direccion es ventaja significativa." },
      { rango: "3-4", label: "Gestion basica", nivel: "high", texto: "Gestion basica en el sector. Espacio para diferenciarse." },
      { rango: "5-6", label: "Gestion media", nivel: "med", texto: "Hay competidores profesionales. La calidad directiva es diferenciadora." },
      { rango: "7-8", label: "Gestion alta", nivel: "low", texto: "Sector con directivos capaces. Competencia estrategica sofisticada." },
      { rango: "9-10", label: "Clase mundial", nivel: "low", texto: "Sector con los mejores directivos. Requiere talento de primer nivel." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 4, fce: null },
      { rangoMin: 5, rangoMax: 8, fce: { nombre: "Talento directivo y capacidad de liderazgo estrategico", pesoBase: 0.07 } },
      { rangoMin: 9, rangoMax: 10, fce: { nombre: "Liderazgo estrategico y gestion de clase mundial", pesoBase: 0.09 } },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// QUESTIONNAIRE 2: Analisis de Atractividad de la Industria (15 factors)
// ═══════════════════════════════════════════════════════════════════════════

export const ATTRACTIVENESS_FACTORS: CriterioDef[] = [
  {
    id: "attr-1", nombre: "Potencial de crecimiento",
    impulsor: "Tasa de crecimiento del mercado",
    descripcion: "¿Cuanto puede crecer el sector?",
    extremoIzquierdo: "Sin potencial", extremoDerecho: "Potencial muy alto",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-3", label: "Sin potencial", nivel: "low", texto: "Sector sin potencial de crecimiento — competencia de suma cero." },
      { rango: "4-6", label: "Potencial moderado", nivel: "med", texto: "Potencial moderado — hay oportunidad pero requiere posicionamiento claro." },
      { rango: "7-10", label: "Alto potencial", nivel: "high", texto: "Alto potencial — el sector ofrece espacio para crecer sin sacrificar margen." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 6, fce: null },
      { rangoMin: 7, rangoMax: 10, fce: { nombre: "Capacidad de captura de oportunidades de crecimiento", pesoBase: 0.08 } },
    ],
  },
  {
    id: "attr-2", nombre: "Diversidad del mercado",
    impulsor: "Numero de mercados atendidos",
    descripcion: "Mayor diversidad = menor dependencia = mayor resiliencia.",
    extremoIzquierdo: "Mercado unico", extremoDerecho: "Multiples segmentos",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-3", label: "Muy concentrado", nivel: "low", texto: "Alta dependencia de un segmento." },
      { rango: "4-6", label: "Diversidad moderada", nivel: "med", texto: "Algunos segmentos pero concentracion en pocos." },
      { rango: "7-10", label: "Alta diversidad", nivel: "high", texto: "Multiples mercados reduciendo riesgo de concentracion." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 6, fce: null },
      { rangoMin: 7, rangoMax: 10, fce: { nombre: "Diversificacion de segmentos y mercados", pesoBase: 0.07 } },
    ],
  },
  {
    id: "attr-3", nombre: "Rentabilidad de la industria",
    impulsor: "Margenes promedio del sector",
    descripcion: "Alta rentabilidad indica valor real que capturar.",
    extremoIzquierdo: "Perdidas sistemicas", extremoDerecho: "Rentabilidad excepcional",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-3", label: "Perdidas", nivel: "low", texto: "Sector con perdidas o margenes negativos." },
      { rango: "4-6", label: "Rentabilidad media", nivel: "med", texto: "Margenes razonables bajo presion competitiva." },
      { rango: "7-10", label: "Alta rentabilidad", nivel: "high", texto: "El sector genera valor economico real y sostenible." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 6, fce: null },
      { rangoMin: 7, rangoMax: 10, fce: { nombre: "Rentabilidad y gestion de margenes", pesoBase: 0.10 } },
    ],
  },
  {
    id: "attr-4", nombre: "Vulnerabilidad del sector",
    impulsor: "Exposicion a shocks externos",
    descripcion: "Alta vulnerabilidad = mayor riesgo.",
    extremoIzquierdo: "Muy vulnerable", extremoDerecho: "Altamente resiliente",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-3", label: "Muy vulnerable", nivel: "low", texto: "Pequenos shocks generan grandes impactos." },
      { rango: "4-6", label: "Vulnerabilidad media", nivel: "med", texto: "El sector puede absorber shocks moderados." },
      { rango: "7-10", label: "Resiliente", nivel: "high", texto: "Capacidad de absorber impactos sin perder competitividad." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 3, fce: { nombre: "Gestion de riesgos y resiliencia operativa", pesoBase: 0.08 } },
      { rangoMin: 4, rangoMax: 10, fce: null },
    ],
  },
  {
    id: "attr-5", nombre: "Concentracion del sector",
    impulsor: "Numero de jugadores principales",
    descripcion: "Sector concentrado (pocos grandes) vs. fragmentado (muchos pequenos).",
    extremoIzquierdo: "Muy fragmentado", extremoDerecho: "Muy concentrado",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-3", label: "Fragmentado", nivel: "med", texto: "Oportunidad para consolidacion." },
      { rango: "4-6", label: "Moderado", nivel: "med", texto: "Hay actores dominantes pero espacio para otros." },
      { rango: "7-10", label: "Concentrado", nivel: "low", texto: "Pocos actores dominan, dificil entrar con escala." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 6, fce: null },
      { rangoMin: 7, rangoMax: 10, fce: { nombre: "Escala y participacion de mercado relativa", pesoBase: 0.09 } },
    ],
  },
  {
    id: "attr-6", nombre: "Estacionalidad de ventas",
    impulsor: "Patron de ventas (ciclico, continuo)",
    descripcion: "Alta estacionalidad = mayor necesidad de gestion financiera.",
    extremoIzquierdo: "Completamente estacionales", extremoDerecho: "Completamente continuas",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-3", label: "Alta estacionalidad", nivel: "low", texto: "Flujo de caja muy irregular." },
      { rango: "4-6", label: "Estacionalidad moderada", nivel: "med", texto: "Hay picos pero la base es continua." },
      { rango: "7-10", label: "Ventas estables", nivel: "high", texto: "Flujo de caja predecible." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 3, fce: { nombre: "Gestion financiera y de capacidad estacional", pesoBase: 0.06 } },
      { rangoMin: 4, rangoMax: 10, fce: null },
    ],
  },
  {
    id: "attr-7", nombre: "Especializacion requerida",
    impulsor: "Grado de enfoque y diferenciacion requeridos",
    descripcion: "Alta especializacion = barreras de entrada mas altas.",
    extremoIzquierdo: "Sin especializacion", extremoDerecho: "Especializacion muy alta",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-3", label: "Sin especializacion", nivel: "low", texto: "Cualquier actor puede entrar facilmente." },
      { rango: "4-6", label: "Moderada", nivel: "med", texto: "Se requiere conocimiento pero no es exclusivo." },
      { rango: "7-10", label: "Alta", nivel: "high", texto: "Profundo conocimiento tecnico es barrera clave." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 6, fce: null },
      { rangoMin: 7, rangoMax: 10, fce: { nombre: "Especializacion tecnica y conocimiento sectorial", pesoBase: 0.09 } },
    ],
  },
  {
    id: "attr-8", nombre: "Identificacion de marca",
    impulsor: "Importancia de la marca en decisiones de compra",
    descripcion: "¿Que tan importante es la marca para el cliente?",
    extremoIzquierdo: "Marca irrelevante", extremoDerecho: "Marca determinante",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-3", label: "Marca irrelevante", nivel: "low", texto: "El sector compite por precio o commodity." },
      { rango: "4-6", label: "Marca moderada", nivel: "med", texto: "Algunos segmentos valoran la marca." },
      { rango: "7-10", label: "Marca critica", nivel: "high", texto: "Reputacion y reconocimiento son decisivos." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 6, fce: null },
      { rangoMin: 7, rangoMax: 10, fce: { nombre: "Posicionamiento y reputacion de marca", pesoBase: 0.11 } },
    ],
  },
  {
    id: "attr-9", nombre: "Requerimientos de distribucion",
    impulsor: "Canales de distribucion y soporte requerido",
    descripcion: "¿Que tan critica es la red de distribucion?",
    extremoIzquierdo: "Distribucion simple", extremoDerecho: "Red muy compleja",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-3", label: "Simple", nivel: "high", texto: "Cualquier canal funciona, baja barrera." },
      { rango: "4-6", label: "Moderada", nivel: "med", texto: "Requiere canales especificos pero accesibles." },
      { rango: "7-10", label: "Critica", nivel: "low", texto: "La red de distribucion es ventaja competitiva dificil de replicar." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 6, fce: null },
      { rangoMin: 7, rangoMax: 10, fce: { nombre: "Red de distribucion y cobertura de mercado", pesoBase: 0.08 } },
    ],
  },
  {
    id: "attr-10", nombre: "Politica de precios del sector",
    impulsor: "Elasticidad y normas de la industria",
    descripcion: "Define el margen de maniobra en pricing.",
    extremoIzquierdo: "Precios fijos/commodity", extremoDerecho: "Precios flexibles y diferenciados",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-3", label: "Sin flexibilidad", nivel: "low", texto: "El sector opera como commodity o bajo regulacion estricta." },
      { rango: "4-6", label: "Flexibilidad moderada", nivel: "med", texto: "Hay rangos de precio pero elasticidad limitada." },
      { rango: "7-10", label: "Alta flexibilidad", nivel: "high", texto: "El precio puede usarse como herramienta estrategica." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 6, fce: null },
      { rangoMin: 7, rangoMax: 10, fce: { nombre: "Estrategia de precios y captura de valor", pesoBase: 0.08 } },
    ],
  },
  {
    id: "attr-11", nombre: "Posicion en costos",
    impulsor: "Estructura de costos del sector",
    descripcion: "¿Que tan determinante es la eficiencia en costos?",
    extremoIzquierdo: "Alto costo inevitable", extremoDerecho: "Posibilidad de ventaja en costos",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-3", label: "Alto costo", nivel: "low", texto: "Estructura de costos alta inevitable." },
      { rango: "4-6", label: "Costos moderados", nivel: "med", texto: "Oportunidades de eficiencia." },
      { rango: "7-10", label: "Ventaja posible", nivel: "high", texto: "La eficiencia operativa puede ser diferenciador clave." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 6, fce: null },
      { rangoMin: 7, rangoMax: 10, fce: { nombre: "Eficiencia operativa y gestion de costos", pesoBase: 0.09 } },
    ],
  },
  {
    id: "attr-12", nombre: "Nivel de servicios requeridos",
    impulsor: "Oportunidad, confiabilidad y garantias",
    descripcion: "¿Cuanto servicio post-venta espera el cliente?",
    extremoIzquierdo: "Sin servicio requerido", extremoDerecho: "Servicio muy complejo",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-3", label: "Sin servicio", nivel: "high", texto: "Transaccion pura sin soporte." },
      { rango: "4-6", label: "Servicio moderado", nivel: "med", texto: "El soporte importa pero no es el diferenciador principal." },
      { rango: "7-10", label: "Servicio critico", nivel: "low", texto: "La calidad del soporte es determinante en la decision de compra." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 6, fce: null },
      { rangoMin: 7, rangoMax: 10, fce: { nombre: "Calidad del servicio y soporte al cliente", pesoBase: 0.12 } },
    ],
  },
  {
    id: "attr-13", nombre: "Importancia de la tecnologia",
    impulsor: "Liderazgo tecnologico como fuente de diferenciacion",
    descripcion: "¿Que tan determinante es la tecnologia para el exito?",
    extremoIzquierdo: "Tecnologia irrelevante", extremoDerecho: "Tecnologia critica",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-3", label: "Irrelevante", nivel: "high", texto: "La tecnologia no diferencia en el sector." },
      { rango: "4-6", label: "Importante", nivel: "med", texto: "La tecnologia importa pero no es el unico diferenciador." },
      { rango: "7-10", label: "Critica", nivel: "low", texto: "La tecnologia es el principal motor de ventaja competitiva." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 6, fce: null },
      { rangoMin: 7, rangoMax: 10, fce: { nombre: "Capacidad tecnologica e innovacion digital", pesoBase: 0.11 } },
    ],
  },
  {
    id: "attr-14", nombre: "Integracion vertical u horizontal",
    impulsor: "Facilidad o necesidad de integracion",
    descripcion: "¿La integracion genera ventajas en el sector?",
    extremoIzquierdo: "Sin ventaja", extremoDerecho: "Integracion muy ventajosa",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-3", label: "Sin ventaja", nivel: "med", texto: "La integracion no aporta ventaja." },
      { rango: "4-6", label: "Parcialmente ventajosa", nivel: "med", texto: "Algunos actores se benefician." },
      { rango: "7-10", label: "Muy ventajosa", nivel: "high", texto: "La integracion es fuente clave de ventaja competitiva." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 6, fce: null },
      { rangoMin: 7, rangoMax: 10, fce: { nombre: "Integracion estrategica en la cadena de valor", pesoBase: 0.07 } },
    ],
  },
  {
    id: "attr-15", nombre: "Facilidad de entrada y salida",
    impulsor: "Barreras de entrada y salida",
    descripcion: "Barreras altas protegen pero dificultan la desinversion.",
    extremoIzquierdo: "Entrada y salida faciles", extremoDerecho: "Barreras muy altas",
    min: 1, max: 10, step: 1, defaultVal: 5,
    interpretaciones: [
      { rango: "1-3", label: "Sin barreras", nivel: "low", texto: "Sector completamente abierto." },
      { rango: "4-6", label: "Barreras moderadas", nivel: "med", texto: "Se requiere inversion pero la salida es viable." },
      { rango: "7-10", label: "Barreras altas", nivel: "high", texto: "Inversion considerable y salida costosa." },
    ],
    fceTemplates: [
      { rangoMin: 1, rangoMax: 6, fce: null },
      { rangoMin: 7, rangoMax: 10, fce: { nombre: "Gestion de barreras y posicionamiento defensivo", pesoBase: 0.07 } },
    ],
  },
];
