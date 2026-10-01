// ---------------------------------------------------------------------------
// AMOFHIT Evaluation Data — D'Alessio methodology
// Each variable has: question, hallazgos (per score 1-4), pill descriptions,
// evidence chips, and IA prompt for the MEFI matrix.
// ---------------------------------------------------------------------------

export interface AmofhitVariable {
  id: string;
  pregunta: string;
  hallazgos: Record<1 | 2 | 3 | 4, string>;
  descripcionesPills: Record<1 | 2 | 3 | 4, string>;
  chipsEvidencia: string[];
  promptIA: string;
  /** Keys de RatioMaster (catalogo cuantitativo) que respaldan esta pregunta.
   *  Si el usuario carga estos ratios, el sistema sugiere automaticamente
   *  una calificacion 1-4 y enriquece el hallazgo con datos numericos. */
  linkedRatios?: string[];
}

export interface AmofhitSeccion {
  id: number;
  nombre: string;
  variables: AmofhitVariable[];
}

export interface AmofhitAreaData {
  id: string;
  nombre: string;
  descripcion: string;
  color: string;
  colorLight: string;
  icono: string;
  secciones: AmofhitSeccion[];
  totalVariables: number;
}

// ---------------------------------------------------------------------------
// Helper to build hallazgos consistently
// ---------------------------------------------------------------------------
function h(
  tema: string,
  area: string,
  d1: string,
  d2: string,
  f3: string,
  f4: string,
): Record<1 | 2 | 3 | 4, string> {
  return {
    1: `${d1} Debilidad mayor — calificacion MEFI: 1.`,
    2: `${d2} Debilidad menor — calificacion MEFI: 2.`,
    3: `${f3} Fortaleza menor — calificacion MEFI: 3.`,
    4: `${f4} Fortaleza mayor — calificacion MEFI: 4.`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// A — ADMINISTRACION Y GERENCIA
// ═══════════════════════════════════════════════════════════════════════════

const A_SECCIONES: AmofhitSeccion[] = [
  {
    id: 1,
    nombre: "Planeamiento",
    variables: [
      {
        id: "A-1-1",
        pregunta: "¿Se desarrolla el proceso de planeamiento formal?",
        hallazgos: h("planeamiento", "A",
          "No existe proceso de planeamiento formal. Las decisiones directivas se toman de manera reactiva sin horizonte estrategico.",
          "El planeamiento es informal y esporadico. No garantiza coherencia en decisiones ni asignacion estrategica de recursos.",
          "Existe un proceso de planeamiento formal y periodico. Su impacto puede profundizarse con mayor rigor metodologico.",
          "El proceso de planeamiento formal es una fortaleza diferenciadora. Las decisiones estrategicas estan sustentadas y documentadas.",
        ),
        descripcionesPills: {
          1: "No existe proceso formal alguno",
          2: "Existe pero es informal o esporadico",
          3: "Proceso formal y periodico documentado",
          4: "Proceso robusto, medido y con impacto demostrado",
        },
        chipsEvidencia: ["Plan estrategico", "Actas de planeamiento", "Presupuesto anual", "No tenemos evidencia"],
        promptIA: "En la variable de planeamiento formal del AMOFHIT Administracion y Gerencia: ¿que impacto estrategico tiene y que hallazgos deberia documentar para la MEFI?",
      },
      {
        id: "A-1-2",
        pregunta: "¿Se tiene una vision, mision y objetivos estrategicos establecidos?",
        hallazgos: h("vision-mision", "A",
          "No se cuenta con vision, mision ni objetivos estrategicos definidos. La organizacion carece de direccion clara.",
          "La vision y mision existen pero no son conocidas ni utilizadas como guia para la toma de decisiones.",
          "La vision, mision y objetivos estrategicos estan formalmente establecidos y son conocidos por la mayoria del personal.",
          "La vision, mision y objetivos estrategicos son compartidos, inspiradores y guian efectivamente todas las decisiones de la organizacion.",
        ),
        descripcionesPills: {
          1: "No estan definidos",
          2: "Existen pero no se usan activamente",
          3: "Definidos, comunicados y conocidos",
          4: "Inspiradores, internalizados y guian las decisiones",
        },
        chipsEvidencia: ["Documento de vision/mision", "Plan estrategico", "Comunicaciones internas", "Encuesta de cultura", "No tenemos evidencia"],
        promptIA: "En la variable de vision, mision y objetivos estrategicos del AMOFHIT: ¿como evaluar su efectividad y que hallazgos documentar para la MEFI?",
      },
      {
        id: "A-1-3",
        pregunta: "¿Se desarrollan los pronosticos (ventas, produccion, financieros)?",
        hallazgos: h("pronosticos", "A",
          "No se realizan pronosticos de ninguna clase. Las decisiones operativas se basan en la intuicion o la urgencia del momento.",
          "Se realizan pronosticos basicos y esporadicos sin metodologia definida. Su confiabilidad es limitada.",
          "Se desarrollan pronosticos periodicos con metodologias definidas para las areas principales del negocio.",
          "El sistema de pronosticos es sofisticado, integrado y con alta precision. Alimenta directamente la planificacion estrategica.",
        ),
        descripcionesPills: {
          1: "No se realizan pronosticos",
          2: "Pronosticos basicos e informales",
          3: "Pronosticos periodicos con metodologia",
          4: "Sistema integrado, preciso y automatizado",
        },
        chipsEvidencia: ["Proyecciones de ventas", "Presupuesto operativo", "Modelos de pronostico", "Reportes de desviacion", "No tenemos evidencia"],
        promptIA: "En la variable de pronosticos del AMOFHIT Administracion: ¿como evaluar la madurez del sistema de pronosticos y que documentar para la MEFI?",
      },
      {
        id: "A-1-4",
        pregunta: "¿Se monitorea el entorno, la competencia y la demanda?",
        hallazgos: h("monitoreo", "A",
          "No existe monitoreo del entorno competitivo. La organizacion opera sin inteligencia de mercado.",
          "El monitoreo del entorno es reactivo y no sistematico. Se recopila informacion solo cuando surge una necesidad puntual.",
          "Se realiza monitoreo regular del entorno competitivo con fuentes definidas y reportes periodicos.",
          "El sistema de inteligencia competitiva es una ventaja diferenciadora. Se anticipa a cambios del mercado con analisis proactivo.",
        ),
        descripcionesPills: {
          1: "No existe monitoreo del entorno",
          2: "Monitoreo reactivo y esporadico",
          3: "Monitoreo regular con fuentes definidas",
          4: "Inteligencia competitiva proactiva y diferenciadora",
        },
        chipsEvidencia: ["Reportes de mercado", "Analisis competitivo", "Estudios de mercado", "Suscripciones a fuentes", "No tenemos evidencia"],
        promptIA: "En la variable de monitoreo del entorno del AMOFHIT: ¿que indicadores y fuentes deberia evaluar y como documentar para la MEFI?",
      },
      {
        id: "A-1-5",
        pregunta: "¿Se revisa la estrategia frente a los desarrollos del entorno?",
        hallazgos: h("revision-estrategia", "A",
          "La estrategia nunca se revisa. No existen mecanismos de retroalimentacion ni ajuste estrategico.",
          "La estrategia se revisa solo ante crisis o cambios drasticos. No existe un proceso periodico de revision.",
          "Se realizan revisiones estrategicas periodicas con ajustes basados en indicadores y cambios del entorno.",
          "El proceso de revision estrategica es continuo, agil y basado en datos. Permite pivotes oportunos con impacto medible.",
        ),
        descripcionesPills: {
          1: "La estrategia nunca se revisa",
          2: "Solo se revisa ante crisis",
          3: "Revisiones periodicas con ajustes",
          4: "Revision continua, agil y basada en datos",
        },
        chipsEvidencia: ["Actas de revision estrategica", "Balanced Scorecard", "KPIs estrategicos", "Minutas de directorio", "No tenemos evidencia"],
        promptIA: "En la variable de revision estrategica del AMOFHIT: ¿con que frecuencia deberia revisarse y que hallazgos documentar para la MEFI?",
      },
    ],
  },
  {
    id: 2,
    nombre: "Organizacion",
    variables: [
      {
        id: "A-2-1",
        pregunta: "¿La estructura organizacional es la adecuada?",
        hallazgos: h("estructura", "A",
          "La estructura organizacional es inadecuada, genera confusion de roles y duplicidad de funciones.",
          "La estructura existe pero presenta deficiencias: algunos roles no estan claros o hay cuellos de botella.",
          "La estructura organizacional es adecuada, con roles definidos y niveles jerarquicos claros.",
          "La estructura organizacional es optima, flexible y alineada con la estrategia. Facilita la toma de decisiones rapida.",
        ),
        descripcionesPills: {
          1: "Estructura confusa y disfuncional",
          2: "Estructura con deficiencias visibles",
          3: "Estructura adecuada con roles claros",
          4: "Estructura optima, flexible y estrategica",
        },
        chipsEvidencia: ["Organigrama", "MOF/ROF", "Descripciones de puesto", "No tenemos evidencia"],
        promptIA: "En la variable de estructura organizacional del AMOFHIT: ¿que criterios usar para evaluar si es adecuada y que documentar para la MEFI?",
        linkedRatios: ["A.GOV.LAYERS", "A.GOV.SPAN"],
      },
      {
        id: "A-2-2",
        pregunta: "¿La moral y motivacion de los trabajadores es alta?",
        hallazgos: h("moral", "A",
          "La moral y motivacion del personal es critica. Alta rotacion, conflictos frecuentes y bajo compromiso.",
          "La motivacion es variable. Existen focos de desmotivacion que afectan la productividad en algunas areas.",
          "La moral del personal es buena. Los trabajadores muestran compromiso y satisfaccion general con la organizacion.",
          "La moral y motivacion son excepcionalmente altas. El personal esta comprometido, la rotacion es minima y el clima es positivo.",
        ),
        descripcionesPills: {
          1: "Moral critica, alta rotacion",
          2: "Motivacion variable con focos de desmotivacion",
          3: "Buena moral y compromiso general",
          4: "Moral excepcional, alto engagement",
        },
        chipsEvidencia: ["Encuesta de clima", "Indices de rotacion", "Evaluaciones de desempeno", "Entrevistas de salida", "No tenemos evidencia"],
        promptIA: "En la variable de moral y motivacion del AMOFHIT: ¿como medirla objetivamente y que hallazgos documentar para la MEFI?",
      },
      {
        id: "A-2-3",
        pregunta: "¿El ambiente de trabajo y clima organizacional es bueno?",
        hallazgos: h("clima", "A",
          "El clima organizacional es toxico. Conflictos interpersonales, falta de confianza y comunicacion deficiente.",
          "El clima presenta areas de mejora. Algunos equipos funcionan bien pero hay tensiones en otros.",
          "El clima organizacional es positivo. Los equipos trabajan de forma colaborativa y la comunicacion es abierta.",
          "El clima organizacional es excepcional y reconocido. Es fuente de atraccion y retencion de talento.",
        ),
        descripcionesPills: {
          1: "Clima toxico y conflictivo",
          2: "Clima con areas de mejora",
          3: "Clima positivo y colaborativo",
          4: "Clima excepcional y reconocido",
        },
        chipsEvidencia: ["Encuesta de clima laboral", "Great Place to Work", "Indicadores de ausentismo", "Programas de bienestar", "No tenemos evidencia"],
        promptIA: "En la variable de clima organizacional del AMOFHIT: ¿que dimensiones evaluar y que documentar para la MEFI?",
      },
      {
        id: "A-2-4",
        pregunta: "¿Las comunicaciones internas son efectivas?",
        hallazgos: h("comunicaciones", "A",
          "Las comunicaciones internas son deficientes. La informacion no fluye, generando descoordinacion y rumores.",
          "Las comunicaciones existen pero son inconsistentes. Algunos canales funcionan y otros no llegan al personal.",
          "Las comunicaciones internas son efectivas con canales establecidos y flujo de informacion adecuado.",
          "El sistema de comunicaciones internas es ejemplar. Informacion oportuna, transparente y bidireccional.",
        ),
        descripcionesPills: {
          1: "Comunicaciones deficientes y confusas",
          2: "Comunicaciones inconsistentes",
          3: "Canales establecidos y efectivos",
          4: "Comunicacion ejemplar, transparente y bidireccional",
        },
        chipsEvidencia: ["Intranet/newsletters", "Reuniones periodicas", "Canales digitales", "Encuesta de comunicacion", "No tenemos evidencia"],
        promptIA: "En la variable de comunicaciones internas del AMOFHIT: ¿que criterios usar para evaluarlas y que documentar para la MEFI?",
      },
      {
        id: "A-2-5",
        pregunta: "¿Los gerentes han probado su capacidad gerencial y liderazgo?",
        hallazgos: h("liderazgo", "A",
          "Los gerentes carecen de capacidad gerencial demostrada. Las decisiones son erraticas y sin sustento.",
          "Algunos gerentes muestran capacidad pero hay brechas significativas en liderazgo y gestion.",
          "Los gerentes demuestran capacidad gerencial solida. El liderazgo es competente y genera resultados.",
          "El equipo gerencial es excepcional. Su liderazgo es reconocido y genera resultados superiores consistentemente.",
        ),
        descripcionesPills: {
          1: "Sin capacidad gerencial demostrada",
          2: "Capacidad desigual con brechas",
          3: "Liderazgo competente y solido",
          4: "Liderazgo excepcional y reconocido",
        },
        chipsEvidencia: ["Evaluacion 360", "Resultados de area", "Planes de sucesion", "Formacion gerencial", "No tenemos evidencia"],
        promptIA: "En la variable de capacidad gerencial del AMOFHIT: ¿como evaluar el liderazgo directivo y que documentar para la MEFI?",
        linkedRatios: ["A.GOV.EDUCATION", "A.GOV.SENIORITY", "A.GOV.EXEC_TURNOVER"],
      },
    ],
  },
  {
    id: 3,
    nombre: "Direccion",
    variables: [
      {
        id: "A-3-1",
        pregunta: "¿La toma de decisiones es oportuna y efectiva?",
        hallazgos: h("decisiones", "A",
          "La toma de decisiones es lenta, reactiva y carece de datos de soporte. Genera perdida de oportunidades.",
          "Las decisiones se toman con cierta demora y sin toda la informacion necesaria. Los resultados son irregulares.",
          "La toma de decisiones es oportuna, basada en datos y genera resultados consistentes.",
          "El proceso de decision es agil, informado y genera ventaja competitiva. Se documentan y evaluan los resultados.",
        ),
        descripcionesPills: {
          1: "Decisiones lentas y sin datos",
          2: "Decisiones con demora e informacion parcial",
          3: "Decisiones oportunas y basadas en datos",
          4: "Proceso agil que genera ventaja competitiva",
        },
        chipsEvidencia: ["Actas de comite", "Reportes de decision", "KPIs de resultado", "Encuesta gerencial", "No tenemos evidencia"],
        promptIA: "En la variable de toma de decisiones del AMOFHIT: ¿como evaluar su oportunidad y efectividad para la MEFI?",
      },
      {
        id: "A-3-2",
        pregunta: "¿La gestion del cambio es bien manejada?",
        hallazgos: h("cambio", "A",
          "No existe gestion del cambio. Las transformaciones generan resistencia, confusion y fracasan frecuentemente.",
          "La gestion del cambio es informal. Se reconoce su importancia pero no hay metodologia ni recursos dedicados.",
          "Se maneja la gestion del cambio con procesos definidos. Los proyectos de transformacion logran sus objetivos.",
          "La gestion del cambio es una competencia organizacional. Los cambios se implementan con exito y generan valor.",
        ),
        descripcionesPills: {
          1: "Inexistente, cambios fracasan",
          2: "Informal y sin metodologia",
          3: "Procesos definidos con resultados",
          4: "Competencia organizacional diferenciadora",
        },
        chipsEvidencia: ["Metodologia de cambio", "Casos de exito", "Planes de transformacion", "Indicadores de adopcion", "No tenemos evidencia"],
        promptIA: "En la variable de gestion del cambio del AMOFHIT: ¿que madurez tiene la organizacion y que documentar para la MEFI?",
      },
    ],
  },
  {
    id: 4,
    nombre: "Coordinacion y Control",
    variables: [
      {
        id: "A-4-1",
        pregunta: "¿Se cuenta con un sistema de control gerencial efectivo?",
        hallazgos: h("control", "A",
          "No existe sistema de control gerencial. No se miden resultados ni se detectan desviaciones.",
          "El control gerencial es basico. Se miden algunos indicadores pero sin sistematizacion ni seguimiento.",
          "Se cuenta con un sistema de control gerencial efectivo con indicadores clave y reportes periodicos.",
          "El sistema de control gerencial es sofisticado, automatizado y permite decisiones en tiempo real.",
        ),
        descripcionesPills: {
          1: "Inexistente, sin medicion",
          2: "Basico y no sistematizado",
          3: "Efectivo con KPIs y reportes",
          4: "Sofisticado, automatizado y en tiempo real",
        },
        chipsEvidencia: ["Tablero de control", "Balanced Scorecard", "Reportes gerenciales", "Sistema ERP", "No tenemos evidencia"],
        promptIA: "En la variable de control gerencial del AMOFHIT: ¿que sistema de control se usa y que documentar para la MEFI?",
      },
      {
        id: "A-4-2",
        pregunta: "¿Se utilizan indicadores de gestion para medir el desempeno?",
        hallazgos: h("indicadores", "A",
          "No se utilizan indicadores de gestion. El desempeno no se mide de manera objetiva.",
          "Se usan algunos indicadores basicos pero no estan alineados con la estrategia ni se revisan regularmente.",
          "Se cuenta con indicadores de gestion definidos por area, alineados a objetivos y revisados periodicamente.",
          "El sistema de indicadores es integral (BSC), automatizado y impulsa la mejora continua en toda la organizacion.",
        ),
        descripcionesPills: {
          1: "Sin indicadores de gestion",
          2: "Indicadores basicos no alineados",
          3: "KPIs por area alineados a objetivos",
          4: "Sistema BSC integral y automatizado",
        },
        chipsEvidencia: ["Balanced Scorecard", "Dashboard de KPIs", "Reportes mensuales", "Software de BI", "No tenemos evidencia"],
        promptIA: "En la variable de indicadores de gestion del AMOFHIT: ¿que KPIs son criticos y que documentar para la MEFI?",
      },
      {
        id: "A-4-3",
        pregunta: "¿Se toman acciones correctivas a partir de las desviaciones?",
        hallazgos: h("correctivas", "A",
          "No se toman acciones correctivas. Las desviaciones se ignoran o no se detectan a tiempo.",
          "Las acciones correctivas son reactivas y tardias. No hay proceso formal de seguimiento.",
          "Se toman acciones correctivas oportunamente con procesos definidos y seguimiento de resultados.",
          "El sistema de acciones correctivas es proactivo, preventivo y alimenta la mejora continua sistematicamente.",
        ),
        descripcionesPills: {
          1: "Desviaciones ignoradas",
          2: "Acciones correctivas reactivas y tardias",
          3: "Proceso formal con seguimiento",
          4: "Sistema proactivo y preventivo",
        },
        chipsEvidencia: ["Reportes de desviaciones", "Planes de accion", "Minutas de seguimiento", "Indicadores de mejora", "No tenemos evidencia"],
        promptIA: "En la variable de acciones correctivas del AMOFHIT: ¿como evaluar la capacidad de correccion y que documentar para la MEFI?",
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// M — MARKETING Y VENTAS
// ═══════════════════════════════════════════════════════════════════════════

const M_SECCIONES: AmofhitSeccion[] = [
  {
    id: 1,
    nombre: "Producto",
    variables: [
      {
        id: "M-1-1",
        pregunta: "¿Los productos/servicios son de calidad competitiva?",
        hallazgos: h("producto-calidad", "M",
          "Los productos no cumplen estandares minimos de calidad. Reclamos frecuentes y perdida de clientes.",
          "La calidad es aceptable pero inferior a la competencia en atributos clave.",
          "Los productos tienen calidad competitiva. Cumplen expectativas del mercado y son bien valorados.",
          "La calidad es superior al mercado y reconocida como diferenciador. Genera lealtad y premium de precio.",
        ),
        descripcionesPills: {
          1: "Calidad por debajo del minimo",
          2: "Calidad aceptable pero inferior",
          3: "Calidad competitiva y valorada",
          4: "Calidad superior y diferenciadora",
        },
        chipsEvidencia: ["Encuestas de satisfaccion", "Certificaciones de calidad", "Benchmarking", "Reclamos/devoluciones", "No tenemos evidencia"],
        promptIA: "En la variable de calidad de producto del AMOFHIT Marketing: ¿como evaluar la competitividad y que documentar para la MEFI?",
        linkedRatios: ["M.MKT.NPS", "M.MKT.RETENTION"],
      },
      {
        id: "M-1-2",
        pregunta: "¿La marca esta bien posicionada en el mercado?",
        hallazgos: h("marca", "M",
          "La marca no tiene reconocimiento ni posicionamiento. Es desconocida o percibida negativamente.",
          "La marca tiene cierto reconocimiento pero su posicionamiento no esta claro ni diferenciado.",
          "La marca tiene buen posicionamiento y es reconocida en su segmento objetivo.",
          "La marca es lider en su categoria. Genera confianza, preferencia y permite premium de precio.",
        ),
        descripcionesPills: {
          1: "Sin reconocimiento ni posicionamiento",
          2: "Reconocimiento parcial, no diferenciada",
          3: "Buen posicionamiento en su segmento",
          4: "Marca lider y preferida en su categoria",
        },
        chipsEvidencia: ["Estudio de marca", "Brand awareness", "Net Promoter Score", "Participacion de mercado", "No tenemos evidencia"],
        promptIA: "En la variable de posicionamiento de marca del AMOFHIT Marketing: ¿como medirlo y que documentar para la MEFI?",
        linkedRatios: ["M.MKT.MARKET_SHARE", "M.MKT.SOV"],
      },
      {
        id: "M-1-3",
        pregunta: "¿Se realiza desarrollo de nuevos productos/servicios?",
        hallazgos: h("desarrollo-producto", "M",
          "No existe desarrollo de nuevos productos. La oferta esta estancada y pierde relevancia.",
          "El desarrollo de productos es reactivo, sin proceso formal ni presupuesto dedicado.",
          "Se cuenta con proceso de desarrollo de productos con pipeline activo y lanzamientos periodicos.",
          "La innovacion en productos es sistematica, agil y responde anticipadamente a las necesidades del mercado.",
        ),
        descripcionesPills: {
          1: "Sin desarrollo de productos nuevos",
          2: "Desarrollo reactivo y sin proceso",
          3: "Pipeline activo con lanzamientos",
          4: "Innovacion sistematica y anticipada",
        },
        chipsEvidencia: ["Roadmap de productos", "Pipeline de innovacion", "Lanzamientos recientes", "Presupuesto de I+D", "No tenemos evidencia"],
        promptIA: "En la variable de desarrollo de productos del AMOFHIT Marketing: ¿como evaluar la capacidad innovadora y que documentar para la MEFI?",
      },
    ],
  },
  {
    id: 2,
    nombre: "Precio",
    variables: [
      {
        id: "M-2-1",
        pregunta: "¿Los precios son competitivos y la politica de precios es clara?",
        hallazgos: h("precios", "M",
          "Los precios no son competitivos y no existe politica de precios definida. Se pierde mercado por precio.",
          "Los precios son aceptables pero sin estrategia clara. No se analiza elasticidad ni margenes por producto.",
          "La politica de precios es clara, competitiva y alineada con el posicionamiento de la marca.",
          "La estrategia de precios es sofisticada, maximiza margenes y genera ventaja competitiva sostenible.",
        ),
        descripcionesPills: {
          1: "Precios no competitivos, sin politica",
          2: "Precios aceptables sin estrategia clara",
          3: "Politica clara y competitiva",
          4: "Estrategia sofisticada que maximiza valor",
        },
        chipsEvidencia: ["Analisis de precios", "Estudio de competencia", "Margenes por producto", "Politica de descuentos", "No tenemos evidencia"],
        promptIA: "En la variable de precios del AMOFHIT Marketing: ¿como evaluar la competitividad de precios y que documentar para la MEFI?",
      },
    ],
  },
  {
    id: 3,
    nombre: "Plaza (Distribucion)",
    variables: [
      {
        id: "M-3-1",
        pregunta: "¿Los canales de distribucion son adecuados y eficientes?",
        hallazgos: h("distribucion", "M",
          "Los canales de distribucion son inadecuados. Cobertura insuficiente y problemas de abastecimiento frecuentes.",
          "Los canales existen pero tienen brechas de cobertura y eficiencia. Algunos segmentos estan desatendidos.",
          "Los canales de distribucion son adecuados con buena cobertura y eficiencia operativa.",
          "La red de distribucion es una ventaja competitiva. Cobertura superior, eficiencia y experiencia diferenciada.",
        ),
        descripcionesPills: {
          1: "Canales inadecuados, cobertura insuficiente",
          2: "Canales con brechas de cobertura",
          3: "Canales adecuados y eficientes",
          4: "Red de distribucion como ventaja competitiva",
        },
        chipsEvidencia: ["Mapa de canales", "Cobertura geografica", "Tiempos de entrega", "Costos de distribucion", "No tenemos evidencia"],
        promptIA: "En la variable de distribucion del AMOFHIT Marketing: ¿como evaluar los canales y que documentar para la MEFI?",
        linkedRatios: ["M.MKT.SALES_COVERAGE"],
      },
    ],
  },
  {
    id: 4,
    nombre: "Promocion",
    variables: [
      {
        id: "M-4-1",
        pregunta: "¿La publicidad y el marketing digital son efectivos y medibles?",
        hallazgos: h("publicidad", "M",
          "No existe estrategia de marketing. Las acciones son aisladas, sin medicion ni impacto demostrable.",
          "Se realizan acciones de marketing pero sin estrategia integrada ni medicion sistematica del ROI.",
          "El marketing es efectivo con estrategia integrada, presencia digital y medicion de resultados.",
          "El marketing es una fortaleza diferenciadora. Estrategia omnicanal con alto ROI y generacion de demanda.",
        ),
        descripcionesPills: {
          1: "Sin estrategia de marketing",
          2: "Acciones aisladas sin medicion",
          3: "Estrategia integrada y medible",
          4: "Marketing omnicanal diferenciador",
        },
        chipsEvidencia: ["Plan de marketing", "Metricas digitales", "ROI de campanas", "Presupuesto de marketing", "No tenemos evidencia"],
        promptIA: "En la variable de efectividad del marketing del AMOFHIT: ¿como medir el impacto y que documentar para la MEFI?",
        linkedRatios: ["M.MKT.SOV", "M.MKT.FUNNEL_CONV"],
      },
      {
        id: "M-4-2",
        pregunta: "¿La fuerza de ventas es competente y motivada?",
        hallazgos: h("fuerza-ventas", "M",
          "La fuerza de ventas es insuficiente o incompetente. No alcanza las metas y la rotacion es alta.",
          "La fuerza de ventas cumple parcialmente. Hay brechas en capacitacion, herramientas o motivacion.",
          "La fuerza de ventas es competente, motivada y alcanza consistentemente sus objetivos.",
          "La fuerza de ventas es excepcional. Supera metas, genera relaciones de largo plazo y es retenida.",
        ),
        descripcionesPills: {
          1: "Insuficiente e incompetente",
          2: "Cumple parcialmente con brechas",
          3: "Competente y cumple objetivos",
          4: "Excepcional, supera metas consistentemente",
        },
        chipsEvidencia: ["Cumplimiento de cuota", "Evaluacion comercial", "Plan de incentivos", "Rotacion de vendedores", "No tenemos evidencia"],
        promptIA: "En la variable de fuerza de ventas del AMOFHIT Marketing: ¿como evaluar su competencia y que documentar para la MEFI?",
        linkedRatios: ["M.MKT.SALES_COVERAGE", "M.MKT.FUNNEL_CONV", "M.MKT.CAC"],
      },
    ],
  },
  {
    id: 5,
    nombre: "Investigacion de mercado",
    variables: [
      {
        id: "M-5-1",
        pregunta: "¿Se investiga a los consumidores, se segmenta y se mide la satisfaccion?",
        hallazgos: h("investigacion-mercado", "M",
          "No se investiga al consumidor. Se desconocen sus necesidades, comportamientos y nivel de satisfaccion.",
          "Se realizan investigaciones esporadicas sin metodologia consistente. La segmentacion es basica.",
          "Se investiga al consumidor periodicamente con segmentacion definida y medicion de satisfaccion.",
          "La inteligencia de mercado es una competencia central. Segmentacion avanzada, NPS alto y insight-driven.",
        ),
        descripcionesPills: {
          1: "No se investiga al consumidor",
          2: "Investigacion esporadica y basica",
          3: "Investigacion periodica con segmentacion",
          4: "Inteligencia de mercado avanzada",
        },
        chipsEvidencia: ["Estudios de mercado", "Encuestas de satisfaccion", "NPS/CSAT", "Segmentacion de clientes", "No tenemos evidencia"],
        promptIA: "En la variable de investigacion de mercado del AMOFHIT: ¿como evaluar la madurez y que documentar para la MEFI?",
        linkedRatios: ["M.MKT.NPS", "M.MKT.RETENTION"],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// O — OPERACIONES Y LOGISTICA
// ═══════════════════════════════════════════════════════════════════════════

const O_SECCIONES: AmofhitSeccion[] = [
  {
    id: 1, nombre: "Proceso",
    variables: [
      {
        id: "O-1-1",
        pregunta: "¿Los procesos productivos son eficientes y usan tecnologia adecuada?",
        hallazgos: h("procesos", "O",
          "Los procesos productivos son ineficientes, manuales y con altos desperdicios. La tecnologia es obsoleta.",
          "Los procesos funcionan pero tienen cuellos de botella y la tecnologia necesita actualizacion.",
          "Los procesos productivos son eficientes con tecnologia adecuada y mejora continua.",
          "Los procesos son de clase mundial. Automatizados, lean y con tecnologia de punta que genera ventaja de costo.",
        ),
        descripcionesPills: {
          1: "Procesos ineficientes y obsoletos",
          2: "Funcionan con cuellos de botella",
          3: "Eficientes con tecnologia adecuada",
          4: "Clase mundial, automatizados y lean",
        },
        chipsEvidencia: ["Mapeo de procesos", "OEE/eficiencia", "Certificacion ISO", "Tiempos de ciclo", "No tenemos evidencia"],
        promptIA: "En la variable de procesos productivos del AMOFHIT Operaciones: ¿como evaluar eficiencia y que documentar para la MEFI?",
        linkedRatios: ["O.OPS.OEE", "O.OPS.PRODUCTIVITY", "O.OPS.UNIT_COST"],
      },
      {
        id: "O-1-2",
        pregunta: "¿Se tiene capacidad instalada adecuada y flexibilidad productiva?",
        hallazgos: h("capacidad", "O",
          "La capacidad es insuficiente o excesiva. No hay flexibilidad para responder a cambios en la demanda.",
          "La capacidad cubre la demanda actual pero sin margen. La flexibilidad es limitada.",
          "La capacidad instalada es adecuada con margen razonable y flexibilidad para variaciones de demanda.",
          "La capacidad es estrategicamente planificada, con flexibilidad superior y economia de escala.",
        ),
        descripcionesPills: {
          1: "Capacidad inadecuada sin flexibilidad",
          2: "Capacidad justa sin margen",
          3: "Capacidad adecuada con flexibilidad",
          4: "Capacidad planificada con economia de escala",
        },
        chipsEvidencia: ["Utilizacion de capacidad", "Plan de expansion", "Analisis de demanda", "Costos unitarios", "No tenemos evidencia"],
        promptIA: "En la variable de capacidad instalada del AMOFHIT Operaciones: ¿como evaluarla y que documentar para la MEFI?",
        linkedRatios: ["O.OPS.CAPACITY"],
      },
    ],
  },
  {
    id: 2, nombre: "Inventarios y Logistica",
    variables: [
      {
        id: "O-2-1",
        pregunta: "¿La gestion de inventarios y cadena de suministro son eficientes?",
        hallazgos: h("inventarios", "O",
          "Gestion de inventarios inexistente o caotica. Quiebres de stock frecuentes y excesos no controlados.",
          "La gestion de inventarios es basica. Hay problemas de desabastecimiento o exceso en algunos items.",
          "La gestion de inventarios es eficiente con sistemas de control y proveedores confiables.",
          "La cadena de suministro es integrada, optimizada y genera ventaja competitiva en costos y servicio.",
        ),
        descripcionesPills: {
          1: "Gestion caotica con quiebres",
          2: "Basica con problemas puntuales",
          3: "Eficiente con sistemas de control",
          4: "Cadena integrada y optimizada",
        },
        chipsEvidencia: ["Rotacion de inventarios", "Nivel de servicio", "Costos logisticos", "Evaluacion de proveedores", "No tenemos evidencia"],
        promptIA: "En la variable de inventarios y logistica del AMOFHIT Operaciones: ¿como evaluarla y que documentar para la MEFI?",
        linkedRatios: ["O.OPS.INV_TURNOVER", "O.OPS.DOI", "O.OPS.LOG_COST"],
      },
    ],
  },
  {
    id: 3, nombre: "Calidad",
    variables: [
      {
        id: "O-3-1",
        pregunta: "¿Se cuenta con sistema de gestion de calidad y cultura de mejora continua?",
        hallazgos: h("calidad", "O",
          "No existe sistema de calidad. Los defectos son frecuentes y no hay cultura de mejora.",
          "Hay controles de calidad basicos pero no sistematizados. La mejora es reactiva ante problemas.",
          "Se cuenta con sistema de gestion de calidad (ISO/similar) y cultura de mejora continua instalada.",
          "El sistema de calidad es de clase mundial (Six Sigma, TQM). La excelencia operativa es diferenciadora.",
        ),
        descripcionesPills: {
          1: "Sin sistema de calidad",
          2: "Controles basicos no sistematizados",
          3: "SGC implementado con mejora continua",
          4: "Calidad de clase mundial diferenciadora",
        },
        chipsEvidencia: ["Certificacion ISO", "Indicadores de calidad", "Costos de no calidad", "Auditorias internas", "No tenemos evidencia"],
        promptIA: "En la variable de calidad del AMOFHIT Operaciones: ¿como evaluar la madurez del SGC y que documentar para la MEFI?",
        linkedRatios: ["O.OPS.DEFECT_RATE", "O.OPS.OTD"],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// F — FINANZAS Y CONTABILIDAD
// ═══════════════════════════════════════════════════════════════════════════

const F_SECCIONES: AmofhitSeccion[] = [
  {
    id: 1, nombre: "Situacion Financiera",
    variables: [
      {
        id: "F-1-1",
        pregunta: "¿Los indices financieros son mejores que la industria y se tiene acceso al capital?",
        hallazgos: h("indices", "F",
          "Los indices financieros estan por debajo de la industria. Problemas de liquidez y acceso al capital restringido.",
          "Los indices son aceptables pero inferiores al promedio de la industria en algunos ratios clave.",
          "Los indices financieros son competitivos con la industria y se tiene acceso adecuado al capital.",
          "Los indices financieros superan a la industria. La posicion financiera es una fortaleza que habilita crecimiento.",
        ),
        descripcionesPills: {
          1: "Indices criticos, problemas de liquidez",
          2: "Indices aceptables pero inferiores",
          3: "Indices competitivos con la industria",
          4: "Indices superiores, posicion financiera solida",
        },
        chipsEvidencia: ["Estados financieros", "Ratios financieros", "Comparativo sectorial", "Lineas de credito", "No tenemos evidencia"],
        promptIA: "En la variable de situacion financiera del AMOFHIT Finanzas: ¿como evaluar los indices y que documentar para la MEFI?",
        linkedRatios: ["F.LIQ.CURRENT_RATIO", "F.LIQ.QUICK_RATIO", "F.END.INTEREST_COVERAGE"],
      },
      {
        id: "F-1-2",
        pregunta: "¿La estructura de capital (deuda/patrimonio) es adecuada?",
        hallazgos: h("estructura-capital", "F",
          "La estructura de capital es insostenible. Sobreendeudamiento que compromete la viabilidad.",
          "La estructura presenta desequilibrios. El apalancamiento es alto o el costo de deuda elevado.",
          "La estructura de capital es adecuada con un balance razonable entre deuda y patrimonio.",
          "La estructura de capital es optima. Costo de capital bajo y flexibilidad para financiar crecimiento.",
        ),
        descripcionesPills: {
          1: "Estructura insostenible",
          2: "Desequilibrios en apalancamiento",
          3: "Balance adecuado deuda/patrimonio",
          4: "Estructura optima con flexibilidad",
        },
        chipsEvidencia: ["Ratio deuda/patrimonio", "Costo de capital (WACC)", "Estructura de deuda", "Calificacion crediticia", "No tenemos evidencia"],
        promptIA: "En la variable de estructura de capital del AMOFHIT Finanzas: ¿como evaluarla y que documentar para la MEFI?",
        linkedRatios: ["F.END.DEBT_TO_EQUITY", "F.END.DEBT_TO_ASSETS"],
      },
    ],
  },
  {
    id: 2, nombre: "Rentabilidad",
    variables: [
      {
        id: "F-2-1",
        pregunta: "¿Los margenes de utilidad son aceptables, crecientes y se genera valor (EVA)?",
        hallazgos: h("rentabilidad", "F",
          "Los margenes son negativos o decrecientes. La organizacion destruye valor economico.",
          "Los margenes son positivos pero bajos o decrecientes. El EVA es negativo o marginal.",
          "Los margenes son aceptables y estables. Se genera valor economico agregado positivo.",
          "La rentabilidad es superior a la industria y creciente. El EVA es alto y sostenible.",
        ),
        descripcionesPills: {
          1: "Margenes negativos, destruye valor",
          2: "Margenes bajos o decrecientes",
          3: "Margenes aceptables con EVA positivo",
          4: "Rentabilidad superior y creciente",
        },
        chipsEvidencia: ["ROE/ROA", "Margenes operativos", "EVA calculado", "Tendencia de utilidades", "No tenemos evidencia"],
        promptIA: "En la variable de rentabilidad del AMOFHIT Finanzas: ¿como evaluar la generacion de valor y que documentar para la MEFI?",
        linkedRatios: ["F.REN.ROE", "F.REN.ROA", "F.REN.NET_MARGIN", "F.REN.OPERATING_MARGIN"],
      },
    ],
  },
  {
    id: 3, nombre: "Presupuesto y Control",
    variables: [
      {
        id: "F-3-1",
        pregunta: "¿Se elaboran presupuestos y se controlan las desviaciones efectivamente?",
        hallazgos: h("presupuesto", "F",
          "No se elaboran presupuestos formales. El gasto no se planifica ni controla.",
          "Se elaboran presupuestos basicos pero el control de desviaciones es debil o tardio.",
          "Se cuenta con sistema presupuestario completo con control periodico de desviaciones.",
          "El sistema de control presupuestario es sofisticado, en tiempo real y alimenta decisiones estrategicas.",
        ),
        descripcionesPills: {
          1: "Sin presupuestos formales",
          2: "Presupuestos basicos con control debil",
          3: "Sistema completo con control periodico",
          4: "Control sofisticado en tiempo real",
        },
        chipsEvidencia: ["Presupuesto anual", "Reportes de desviacion", "Sistema de costeo", "Proyecciones financieras", "No tenemos evidencia"],
        promptIA: "En la variable de control presupuestario del AMOFHIT Finanzas: ¿como evaluar su efectividad y que documentar para la MEFI?",
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// H — RECURSOS HUMANOS
// ═══════════════════════════════════════════════════════════════════════════

const H_SECCIONES: AmofhitSeccion[] = [
  {
    id: 1, nombre: "Gestion del Talento",
    variables: [
      {
        id: "H-1-1",
        pregunta: "¿Se cuenta con personal competente y los procesos de seleccion son efectivos?",
        hallazgos: h("talento", "H",
          "El personal es insuficiente o poco calificado. Los procesos de seleccion son deficientes o inexistentes.",
          "El personal es aceptable pero hay brechas en competencias clave. La seleccion necesita mejoras.",
          "Se cuenta con personal competente y procesos de seleccion efectivos y estandarizados.",
          "El talento humano es excepcional. La organizacion atrae y retiene al mejor talento del mercado.",
        ),
        descripcionesPills: {
          1: "Personal insuficiente o poco calificado",
          2: "Brechas en competencias clave",
          3: "Personal competente con buena seleccion",
          4: "Talento excepcional, employer branding fuerte",
        },
        chipsEvidencia: ["Perfiles de puesto", "Proceso de seleccion", "Indicadores de rotacion", "Employer branding", "No tenemos evidencia"],
        promptIA: "En la variable de gestion del talento del AMOFHIT RRHH: ¿como evaluar la competencia del personal y que documentar para la MEFI?",
        linkedRatios: ["H.HR.TIME_TO_FILL", "H.HR.TURNOVER"],
      },
    ],
  },
  {
    id: 2, nombre: "Capacitacion y Desarrollo",
    variables: [
      {
        id: "H-2-1",
        pregunta: "¿Se invierte en capacitacion, desarrollo y planes de carrera?",
        hallazgos: h("capacitacion", "H",
          "No se invierte en capacitacion ni desarrollo. No existen planes de carrera ni lineas de sucesion.",
          "La capacitacion es esporadica y sin plan. No hay planes de carrera formales.",
          "Se invierte en capacitacion con plan anual, planes de carrera y evaluaciones de desempeno periodicas.",
          "El desarrollo del talento es una prioridad estrategica. Programas de liderazgo, sucesion y gestion del conocimiento.",
        ),
        descripcionesPills: {
          1: "Sin inversion en desarrollo",
          2: "Capacitacion esporadica sin plan",
          3: "Plan de capacitacion y carrera formal",
          4: "Desarrollo estrategico del talento",
        },
        chipsEvidencia: ["Plan de capacitacion", "Presupuesto de formacion", "Planes de carrera", "Evaluacion de desempeno", "No tenemos evidencia"],
        promptIA: "En la variable de capacitacion del AMOFHIT RRHH: ¿como evaluar la inversion en desarrollo y que documentar para la MEFI?",
        linkedRatios: ["H.HR.TRAINING_HOURS"],
      },
    ],
  },
  {
    id: 3, nombre: "Clima y Cultura",
    variables: [
      {
        id: "H-3-1",
        pregunta: "¿El clima laboral es positivo y la cultura esta alineada con la estrategia?",
        hallazgos: h("clima-cultura", "H",
          "El clima es negativo y la cultura no esta alineada. Alta conflictividad y desconexion con la estrategia.",
          "El clima es aceptable pero con areas de mejora. La cultura no esta explicitamente gestionada.",
          "El clima es positivo y medido. La cultura organizacional esta definida y alineada con la estrategia.",
          "El clima y cultura son excepcionales. Reconocidos externamente y generan ventaja en atraccion de talento.",
        ),
        descripcionesPills: {
          1: "Clima negativo, cultura desalineada",
          2: "Clima aceptable con areas de mejora",
          3: "Clima positivo, cultura alineada",
          4: "Clima excepcional y reconocido",
        },
        chipsEvidencia: ["Encuesta de clima", "Valores organizacionales", "Great Place to Work", "Programas de bienestar", "No tenemos evidencia"],
        promptIA: "En la variable de clima y cultura del AMOFHIT RRHH: ¿como evaluarlos y que documentar para la MEFI?",
        linkedRatios: ["H.HR.CLIMATE", "H.HR.ENPS", "H.HR.ABSENTEEISM"],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// I — SISTEMAS DE INFORMACION
// ═══════════════════════════════════════════════════════════════════════════

const I_SECCIONES: AmofhitSeccion[] = [
  {
    id: 1, nombre: "Sistemas de Informacion Gerencial",
    variables: [
      {
        id: "I-1-1",
        pregunta: "¿Se cuenta con sistema de informacion gerencial y soporte a decisiones?",
        hallazgos: h("sig", "I",
          "No existe sistema de informacion gerencial. Las decisiones se toman sin datos confiables ni oportunos.",
          "Hay sistemas basicos pero desintegrados. La informacion no es oportuna ni confiable para decidir.",
          "Se cuenta con SIG funcional que provee informacion oportuna y reportes para la toma de decisiones.",
          "El SIG es avanzado, integrado y con BI/analytics que generan ventaja competitiva en velocidad de decision.",
        ),
        descripcionesPills: {
          1: "Sin sistema de informacion gerencial",
          2: "Sistemas basicos desintegrados",
          3: "SIG funcional con reportes oportunos",
          4: "SIG avanzado con BI y analytics",
        },
        chipsEvidencia: ["Sistema ERP/CRM", "Dashboards gerenciales", "Reportes automatizados", "Herramientas de BI", "No tenemos evidencia"],
        promptIA: "En la variable de SIG del AMOFHIT Sistemas: ¿como evaluar la madurez del sistema y que documentar para la MEFI?",
        linkedRatios: ["I.SYS.AUTOMATION", "I.SYS.REAL_TIME", "I.SYS.DATA_DRIVEN", "I.SYS.MATURITY"],
      },
    ],
  },
  {
    id: 2, nombre: "Infraestructura Tecnologica",
    variables: [
      {
        id: "I-2-1",
        pregunta: "¿La infraestructura de TI es adecuada, segura y tiene plan de contingencia?",
        hallazgos: h("infra-ti", "I",
          "La infraestructura es obsoleta e insegura. No hay plan de contingencia ni proteccion de datos.",
          "La infraestructura cubre necesidades basicas pero tiene vulnerabilidades y riesgos sin mitigar.",
          "La infraestructura es adecuada, segura y con planes de contingencia y recuperacion definidos.",
          "La infraestructura es moderna, resiliente y con ciberseguridad avanzada. Habilita innovacion y crecimiento.",
        ),
        descripcionesPills: {
          1: "Obsoleta e insegura",
          2: "Basica con vulnerabilidades",
          3: "Adecuada, segura con contingencia",
          4: "Moderna, resiliente y habilitadora",
        },
        chipsEvidencia: ["Inventario TI", "Plan de contingencia", "Auditorias de seguridad", "Presupuesto de TI", "No tenemos evidencia"],
        promptIA: "En la variable de infraestructura TI del AMOFHIT Sistemas: ¿como evaluarla y que documentar para la MEFI?",
        linkedRatios: ["I.SYS.UPTIME", "I.SYS.MTTR", "I.SYS.CYBERSEC"],
      },
    ],
  },
  {
    id: 3, nombre: "Gestion de Datos",
    variables: [
      {
        id: "I-3-1",
        pregunta: "¿Se gestionan los datos de forma confiable y se usan para la toma de decisiones?",
        hallazgos: h("datos", "I",
          "Los datos no se gestionan. Informacion dispersa, inconsistente y no se usa para decidir.",
          "Hay bases de datos pero sin gobierno. La calidad y accesibilidad de la informacion es irregular.",
          "Se gestionan los datos con estandares de calidad y se usan activamente para decisiones.",
          "La gestion de datos es madura con gobierno establecido, analytics avanzado y cultura data-driven.",
        ),
        descripcionesPills: {
          1: "Datos no gestionados, dispersos",
          2: "Bases de datos sin gobierno",
          3: "Datos gestionados con estandares",
          4: "Gobierno de datos maduro, data-driven",
        },
        chipsEvidencia: ["Politica de datos", "Bases de datos", "Reportes analiticos", "Cumplimiento GDPR", "No tenemos evidencia"],
        promptIA: "En la variable de gestion de datos del AMOFHIT Sistemas: ¿como evaluar la madurez y que documentar para la MEFI?",
        linkedRatios: ["I.SYS.DATA_DRIVEN", "I.SYS.REAL_TIME"],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// T — TECNOLOGIA E I+D
// ═══════════════════════════════════════════════════════════════════════════

const T_SECCIONES: AmofhitSeccion[] = [
  {
    id: 1, nombre: "Investigacion y Desarrollo",
    variables: [
      {
        id: "T-1-1",
        pregunta: "¿Se invierte en I+D y se protege la propiedad intelectual?",
        hallazgos: h("id", "T",
          "No se invierte en I+D. No hay personal dedicado ni proteccion de propiedad intelectual.",
          "La inversion en I+D es minima y reactiva. No hay estrategia de innovacion ni proteccion formal.",
          "Se invierte en I+D con personal dedicado, vigilancia tecnologica y proteccion de PI.",
          "La I+D es una fortaleza central. Inversion significativa, patentes y posicion de liderazgo tecnologico.",
        ),
        descripcionesPills: {
          1: "Sin inversion en I+D",
          2: "Inversion minima y reactiva",
          3: "I+D con personal y vigilancia tecnologica",
          4: "I+D como fortaleza central, patentes",
        },
        chipsEvidencia: ["Presupuesto I+D", "Patentes registradas", "Publicaciones", "Alianzas academicas", "No tenemos evidencia"],
        promptIA: "En la variable de I+D del AMOFHIT Tecnologia: ¿como evaluar la capacidad innovadora y que documentar para la MEFI?",
        linkedRatios: ["T.RD.RD_RATIO", "T.RD.PATENTS", "T.RD.RD_HEADCOUNT"],
      },
    ],
  },
  {
    id: 2, nombre: "Tecnologia de Produccion",
    variables: [
      {
        id: "T-2-1",
        pregunta: "¿La tecnologia utilizada es de ultima generacion y se adoptan nuevas tecnologias?",
        hallazgos: h("tech-produccion", "T",
          "La tecnologia es obsoleta. No se adoptan nuevas tecnologias ni se realiza transferencia tecnologica.",
          "La tecnologia funciona pero esta rezagada. La adopcion de nuevas tecnologias es lenta.",
          "Se utiliza tecnologia actual con procesos de adopcion y transferencia tecnologica establecidos.",
          "La tecnologia es de punta y se adoptan innovaciones proactivamente. Automatizacion avanzada y sostenible.",
        ),
        descripcionesPills: {
          1: "Tecnologia obsoleta",
          2: "Funcional pero rezagada",
          3: "Actual con procesos de adopcion",
          4: "De punta, automatizada y proactiva",
        },
        chipsEvidencia: ["Inventario tecnologico", "Plan de modernizacion", "Benchmarking tecnologico", "Roadmap tecnologico", "No tenemos evidencia"],
        promptIA: "En la variable de tecnologia de produccion del AMOFHIT: ¿como evaluar el nivel tecnologico y que documentar para la MEFI?",
        linkedRatios: ["T.RD.TECH_AGE", "T.RD.CAPEX_TECH", "T.RD.TECH_ALLIANCES"],
      },
    ],
  },
  {
    id: 3, nombre: "Capacidad de Innovacion",
    variables: [
      {
        id: "T-3-1",
        pregunta: "¿Se fomenta la cultura de innovacion y la transformacion digital?",
        hallazgos: h("innovacion", "T",
          "No hay cultura de innovacion. La organizacion es resistente al cambio y la transformacion digital es nula.",
          "Hay interes en innovar pero sin recursos, estructura ni cultura que lo soporte sistematicamente.",
          "Se fomenta la innovacion con programas, alianzas y avances en transformacion digital.",
          "La innovacion esta en el ADN organizacional. Cultura innovadora, ecosistema de partners y liderazgo digital.",
        ),
        descripcionesPills: {
          1: "Sin cultura de innovacion",
          2: "Interes sin estructura ni recursos",
          3: "Programas de innovacion y transformacion digital",
          4: "Innovacion en el ADN, liderazgo digital",
        },
        chipsEvidencia: ["Programa de innovacion", "Hackathons/labs", "Alianzas universidad-empresa", "Transformacion digital", "No tenemos evidencia"],
        promptIA: "En la variable de innovacion del AMOFHIT Tecnologia: ¿como evaluar la madurez innovadora y que documentar para la MEFI?",
        linkedRatios: ["T.RD.NEW_PRODUCT_REV", "T.RD.TIME_TO_MARKET"],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT: All areas consolidated
// ═══════════════════════════════════════════════════════════════════════════

function countVariables(secciones: AmofhitSeccion[]): number {
  return secciones.reduce((sum, s) => sum + s.variables.length, 0);
}

export const AMOFHIT_EVALUATION_DATA: Record<string, AmofhitAreaData> = {
  A: {
    id: "A",
    nombre: "Administracion y Gerencia",
    descripcion: "Estructura organizacional, liderazgo, cultura y gobernanza corporativa",
    color: "#185fa5",
    colorLight: "transparent",
    icono: "building",
    secciones: A_SECCIONES,
    totalVariables: countVariables(A_SECCIONES),
  },
  M: {
    id: "M",
    nombre: "Marketing y Ventas",
    descripcion: "Estrategias comerciales, segmentacion, posicionamiento y canales de venta",
    color: "#be185d",
    colorLight: "transparent",
    icono: "megaphone",
    secciones: M_SECCIONES,
    totalVariables: countVariables(M_SECCIONES),
  },
  O: {
    id: "O",
    nombre: "Operaciones y Logistica",
    descripcion: "Procesos productivos, cadena de suministro, calidad y eficiencia operativa",
    color: "#b45309",
    colorLight: "transparent",
    icono: "cog",
    secciones: O_SECCIONES,
    totalVariables: countVariables(O_SECCIONES),
  },
  F: {
    id: "F",
    nombre: "Finanzas y Contabilidad",
    descripcion: "Situacion financiera, ratios, rentabilidad y estructura de costos",
    color: "#1e7f4f",
    colorLight: "transparent",
    icono: "dollar",
    secciones: F_SECCIONES,
    totalVariables: countVariables(F_SECCIONES),
  },
  H: {
    id: "H",
    nombre: "Recursos Humanos",
    descripcion: "Gestion del talento, clima laboral, competencias y desarrollo profesional",
    color: "#8B1510",
    colorLight: "transparent",
    icono: "users",
    secciones: H_SECCIONES,
    totalVariables: countVariables(H_SECCIONES),
  },
  I: {
    id: "I",
    nombre: "Sistemas de Informacion",
    descripcion: "Infraestructura tecnologica, sistemas ERP, datos y comunicacion interna",
    color: "#0e7490",
    colorLight: "transparent",
    icono: "monitor",
    secciones: I_SECCIONES,
    totalVariables: countVariables(I_SECCIONES),
  },
  T: {
    id: "T",
    nombre: "Tecnologia e I+D",
    descripcion: "Innovacion, investigacion, desarrollo tecnologico y patentes",
    color: "#475569",
    colorLight: "transparent",
    icono: "cpu",
    secciones: T_SECCIONES,
    totalVariables: countVariables(T_SECCIONES),
  },
};

// Rating color config — dark theme: bg transparente, jerarquía por borde+texto
export const RATING_CONFIG = {
  1: { label: "Debilidad mayor", bg: "transparent", border: "#b3261e", text: "#b3261e", type: "debilidad" as const },
  2: { label: "Debilidad menor", bg: "transparent", border: "#b45309", text: "#b45309", type: "debilidad" as const },
  3: { label: "Fortaleza menor", bg: "transparent", border: "#8fb874", text: "#4d7c0f", type: "fortaleza" as const },
  4: { label: "Fortaleza mayor", bg: "transparent", border: "#6ab896", text: "#1e7f4f", type: "fortaleza" as const },
} as const;
