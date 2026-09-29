export const Role = {
  ADMIN: "ADMIN",
  ALTA_DIRECCION: "ALTA_DIRECCION",
  GERENTE: "GERENTE",
  JEFE_PROYECTO: "JEFE_PROYECTO",
  ANALISTA: "ANALISTA",
  MIEMBRO_EQUIPO: "MIEMBRO_EQUIPO",
  SOLO_LECTURA: "SOLO_LECTURA",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ROLES_HIERARCHY: Record<Role, number> = {
  ADMIN: 100,
  ALTA_DIRECCION: 90,
  GERENTE: 70,
  JEFE_PROYECTO: 60,
  ANALISTA: 50,
  MIEMBRO_EQUIPO: 30,
  SOLO_LECTURA: 10,
};

export const ROLES_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  ALTA_DIRECCION: "Alta Direccion",
  GERENTE: "Gerente",
  JEFE_PROYECTO: "Jefe de Proyecto",
  ANALISTA: "Analista",
  MIEMBRO_EQUIPO: "Miembro de Equipo",
  SOLO_LECTURA: "Solo Lectura",
};

export const PESTE_VARIABLES = [
  { key: "politico", label: "Politico" },
  { key: "economico", label: "Economico" },
  { key: "social", label: "Social" },
  { key: "tecnologico", label: "Tecnologico" },
  { key: "ecologico", label: "Ecologico" },
] as const;

export interface PesteSubVariable {
  label: string;
  type: "primaria" | "secundaria";
}

export const PESTE_SUB_VARIABLES: Record<string, PesteSubVariable[]> = {
  politico: [
    { label: "Estabilidad politica", type: "primaria" },
    { label: "Politica monetaria", type: "primaria" },
    { label: "Politica fiscal", type: "primaria" },
    { label: "Regulaciones gubernamentales", type: "primaria" },
    { label: "Legislacion laboral", type: "primaria" },
    { label: "Legislacion arancelaria", type: "primaria" },
    { label: "Legislacion medioambiental", type: "primaria" },
    { label: "Seguridad juridica", type: "primaria" },
    { label: "Corrupcion", type: "primaria" },
    { label: "Contrabando", type: "primaria" },
    { label: "Informalidad", type: "primaria" },
    { label: "Relaciones con organismos publicos", type: "primaria" },
    { label: "Partidos politicos en el poder", type: "secundaria" },
    { label: "Sistema de gobierno", type: "secundaria" },
    { label: "Politica de subsidios", type: "secundaria" },
    { label: "Defensa de la libre competencia", type: "secundaria" },
    { label: "Amenazas de expropiacion", type: "secundaria" },
    { label: "Presupuestos gubernamentales", type: "secundaria" },
    { label: "Defensa de la propiedad intelectual", type: "secundaria" },
    { label: "Seguridad y orden interno", type: "secundaria" },
    { label: "Situacion politica mundial", type: "secundaria" },
    { label: "Relaciones con gobiernos", type: "secundaria" },
    { label: "Leyes internacionales y derechos humanos", type: "secundaria" },
    { label: "Relaciones con organismos internacionales", type: "secundaria" },
  ],
  economico: [
    { label: "Evolucion del PBI nacional y PBI per capita", type: "primaria" },
    { label: "Evolucion del poder adquisitivo del consumidor", type: "primaria" },
    { label: "Tasas de interes", type: "primaria" },
    { label: "Tasas de inflacion y devaluacion", type: "primaria" },
    { label: "Costo de capital y de deuda", type: "primaria" },
    { label: "Costo de mano de obra", type: "primaria" },
    { label: "Costo de materias primas", type: "primaria" },
    { label: "Nivel de informalidad de la economia", type: "primaria" },
    { label: "Nivel de aranceles", type: "primaria" },
    { label: "Riesgo pais", type: "primaria" },
    { label: "Acuerdos de integracion y cooperacion economica (TLC)", type: "primaria" },
    { label: "Comportamiento de la demanda de bienes y servicios", type: "secundaria" },
    { label: "Fluctuacion de precios", type: "secundaria" },
    { label: "Sistema economico", type: "secundaria" },
    { label: "Acceso al credito del sistema financiero", type: "secundaria" },
    { label: "Volumen de inversion extranjera", type: "secundaria" },
    { label: "Practicas monopolicas", type: "secundaria" },
    { label: "Deficit fiscal", type: "secundaria" },
    { label: "Actividad de los mercados bursatiles", type: "secundaria" },
    { label: "Situacion de la economia mundial", type: "secundaria" },
    { label: "Situacion de la balanza comercial", type: "secundaria" },
    { label: "Relacion con organismos internacionales (BM, FMI, BID)", type: "secundaria" },
  ],
  social: [
    { label: "Tasa de crecimiento poblacional", type: "primaria" },
    { label: "Tasa de desempleo y subempleo", type: "primaria" },
    { label: "Incidencia de la pobreza y pobreza extrema", type: "primaria" },
    { label: "Distribucion del ingreso en la poblacion", type: "primaria" },
    { label: "Tasa de analfabetismo", type: "primaria" },
    { label: "Nivel promedio de educacion", type: "primaria" },
    { label: "Cultura e idiosincrasia", type: "primaria" },
    { label: "Estilos de vida de la poblacion", type: "primaria" },
    { label: "Esperanza de vida", type: "secundaria" },
    { label: "Tasa de mortalidad", type: "secundaria" },
    { label: "Tasas de inmigracion y emigracion", type: "secundaria" },
    { label: "Roles sociales segun edad y genero", type: "secundaria" },
    { label: "Valores y etica", type: "secundaria" },
    { label: "Responsabilidad social", type: "secundaria" },
    { label: "Uso del tiempo libre", type: "secundaria" },
    { label: "Conflictos religiosos y etnicos", type: "secundaria" },
    { label: "Calidad de vida de la poblacion", type: "secundaria" },
    { label: "Actitud hacia la globalizacion", type: "secundaria" },
  ],
  tecnologico: [
    { label: "Estado del arte", type: "primaria" },
    { label: "Velocidad de transferencia de tecnologia", type: "primaria" },
    { label: "Inversion en I+D", type: "primaria" },
    { label: "Desarrollo de las comunicaciones", type: "primaria" },
    { label: "Uso de tecnologias de informacion", type: "primaria" },
    { label: "Evolucion del numero de patentes", type: "primaria" },
    { label: "Uso de Internet", type: "primaria" },
    { label: "Estudios en biotecnologia", type: "secundaria" },
    { label: "Avances en la ciencia de los materiales", type: "secundaria" },
    { label: "Desarrollo e integracion de soluciones informaticas", type: "secundaria" },
    { label: "Mejoras e innovaciones tecnologicas", type: "secundaria" },
    { label: "Aplicaciones multimedia", type: "secundaria" },
    { label: "Automatismos", type: "secundaria" },
  ],
  ecologico: [
    { label: "Proteccion del medio ambiente", type: "primaria" },
    { label: "Preservacion de recursos naturales no renovables", type: "primaria" },
    { label: "Amenaza de desastres naturales", type: "primaria" },
    { label: "Cultura de reciclaje", type: "primaria" },
    { label: "Manejo de desperdicios y desechos", type: "primaria" },
    { label: "Conservacion de energia", type: "primaria" },
    { label: "Presencia de movimientos ambientalistas", type: "secundaria" },
    { label: "Contaminacion del aire, del agua y de las tierras", type: "secundaria" },
    { label: "Proteccion de la biodiversidad en flora y fauna", type: "secundaria" },
    { label: "Deterioro de la capa de ozono", type: "secundaria" },
  ],
};

export const COMPETITIVE_ANALYSIS_ITEMS = [
  {
    id: 1,
    label: "Tasa de crecimiento potencial de la industria (en terminos reales)",
    type: "range" as const,
    options: ["0-3%", "3-6%", "6-9%", "9-12%", "12-15%", "15-18%", "18-21%", ">21%"],
    leftLabel: "",
    rightLabel: "",
  },
  {
    id: 2,
    label: "Facilidad de entrada de nuevas empresas en la industria",
    type: "scale" as const,
    leftLabel: "Ninguna barrera",
    rightLabel: "Virtualmente imposible de entrar",
  },
  {
    id: 3,
    label: "Intensidad de la competencia entre empresas",
    type: "scale" as const,
    leftLabel: "Extremadamente competitivo",
    rightLabel: "Casi ninguna competencia",
  },
  {
    id: 4,
    label: "Grado de sustitucion del producto",
    type: "scale" as const,
    leftLabel: "Muchos sustitutos disponibles",
    rightLabel: "Ningun sustituto disponible",
  },
  {
    id: 5,
    label: "Grado de dependencia en productos y servicios complementarios o de soporte",
    type: "scale" as const,
    leftLabel: "Altamente dependiente",
    rightLabel: "Virtualmente independiente",
  },
  {
    id: 6,
    label: "Poder de negociacion de los consumidores",
    type: "scale" as const,
    leftLabel: "Consumidores establecen terminos",
    rightLabel: "Productores establecen terminos",
  },
  {
    id: 7,
    label: "Poder de negociacion de los proveedores",
    type: "scale" as const,
    leftLabel: "Proveedores establecen terminos",
    rightLabel: "Compradores establecen terminos",
  },
  {
    id: 8,
    label: "Grado de sofisticacion tecnologica en la industria",
    type: "scale" as const,
    leftLabel: "Tecnologia de alto nivel",
    rightLabel: "Tecnologia muy baja",
  },
  {
    id: 9,
    label: "Regimen de innovacion en la industria",
    type: "scale" as const,
    leftLabel: "Innovacion rapida",
    rightLabel: "Casi ninguna innovacion",
  },
  {
    id: 10,
    label: "Nivel de capacidad gerencial",
    type: "scale" as const,
    leftLabel: "Muchos gerentes muy capaces",
    rightLabel: "Muy pocos gerentes capaces",
  },
] as const;

export const INDUSTRY_ATTRACTIVENESS_FACTORS = [
  { id: 1, factor: "Potencial de Crecimiento", impulsor: "Aumentando o disminuyendo" },
  { id: 2, factor: "Diversidad del mercado", impulsor: "Numero de mercados atendidos" },
  { id: 3, factor: "Rentabilidad", impulsor: "Aumentando, estable, de crecimiento" },
  { id: 4, factor: "Vulnerabilidad", impulsor: "Competidores, inflacion" },
  { id: 5, factor: "Concentracion", impulsor: "Numero de jugadores" },
  { id: 6, factor: "Ventas", impulsor: "Ciclicas, continuas" },
  { id: 7, factor: "Especializacion", impulsor: "Enfoque, diferenciacion, unico" },
  { id: 8, factor: "Identificacion de marca", impulsor: "Facilidad" },
  { id: 9, factor: "Distribucion", impulsor: "Canales, soporte requerido" },
  { id: 10, factor: "Politica de Precios", impulsor: "Efectos de aprendizaje, elasticidad, normas de la industria" },
  { id: 11, factor: "Posicion en costos", impulsor: "Competitivo, bajo costo, alto costo" },
  { id: 12, factor: "Servicios", impulsor: "Oportunidad, confiabilidad, garantias" },
  { id: 13, factor: "Tecnologia", impulsor: "Liderazgo, ser unicos" },
  { id: 14, factor: "Integracion", impulsor: "Vertical, horizontal, facilidad de control" },
  { id: 15, factor: "Facilidad de entrada y salida", impulsor: "Barreras" },
] as const;

export const AMOFHIT_AREAS = [
  { key: "A", label: "Administracion y Gerencia" },
  { key: "M", label: "Marketing y Ventas" },
  { key: "O", label: "Operaciones y Logistica" },
  { key: "F", label: "Finanzas y Contabilidad" },
  { key: "H", label: "Recursos Humanos" },
  { key: "I", label: "Sistemas de Informacion" },
  { key: "T", label: "Tecnologia e I+D" },
] as const;

// Variables de auditoria por area funcional — basado en "El Proceso Estrategico" (D'Alessio)
export const AMOFHIT_VARIABLES: Record<string, Array<{ category: string; variables: string[] }>> = {
  A: [
    {
      category: "Planeamiento",
      variables: [
        "Se desarrolla el proceso de planeamiento formal",
        "Se tiene una vision, mision, y objetivos estrategicos establecidos",
        "Se desarrollan los pronosticos (ventas, produccion, financieros, otros)",
        "Se monitorea el entorno, la competencia, la demanda",
        "Se revisa la estrategia, frente a los desarrollos del entorno",
      ],
    },
    {
      category: "Organizacion",
      variables: [
        "La estructura organizacional es la adecuada",
        "El diseno organizacional es el adecuado",
        "La especificacion de las labores es clara y conocida por todos",
        "La moral y motivacion de los trabajadores es alta",
        "El ambiente de trabajo y clima organizacional es bueno",
        "Las comunicaciones son efectivas",
        "La administracion de sueldos y salarios es efectiva",
        "Los mecanismos de recompensa y castigo son adecuados",
        "Las relaciones laborales son productivas",
        "Los gerentes han probado su capacidad gerencial y liderazgo",
      ],
    },
    {
      category: "Direccion",
      variables: [
        "La toma de decisiones es oportuna y efectiva",
        "El estilo de liderazgo es adecuado",
        "La gestion del cambio es bien manejada",
        "Los gerentes son competentes y experimentados",
        "Se manejan bien los conflictos organizacionales",
      ],
    },
    {
      category: "Coordinacion y Control",
      variables: [
        "Se cuenta con un sistema de control gerencial efectivo",
        "Se utilizan indicadores de gestion para medir el desempeno",
        "Se toman acciones correctivas a partir de las desviaciones",
        "Los controles financieros, comerciales y de produccion son eficientes",
        "La calidad y cantidad de lineas de autoridad son las correctas",
      ],
    },
  ],
  M: [
    {
      category: "Producto",
      variables: [
        "Los productos/servicios son de calidad competitiva",
        "El mix de productos es adecuado",
        "La marca esta bien posicionada",
        "La diferenciacion del producto es clara",
        "Se realiza desarrollo de nuevos productos",
        "El ciclo de vida de los productos es analizado",
        "La calidad de los productos es percibida como superior",
      ],
    },
    {
      category: "Precio",
      variables: [
        "Los precios son competitivos",
        "La politica de precios es clara y adecuada",
        "Se utilizan estrategias de precios (descuentos, paquetes, etc.)",
        "Los margenes de contribucion son adecuados",
        "Se realiza analisis de elasticidad precio-demanda",
      ],
    },
    {
      category: "Plaza (Distribucion)",
      variables: [
        "Los canales de distribucion son adecuados",
        "La cobertura de mercado es la correcta",
        "Los intermediarios agregan valor",
        "Se tiene presencia online efectiva (e-commerce, marketplace)",
        "La logistica de distribucion es eficiente",
        "Se realiza expansion geografica estrategica",
      ],
    },
    {
      category: "Promocion",
      variables: [
        "La publicidad es efectiva y medible",
        "Las promociones de ventas generan resultados",
        "Las relaciones publicas son activas y positivas",
        "Se utiliza marketing digital (redes sociales, SEO, SEM, email)",
        "La fuerza de ventas es competente y motivada",
        "Se tiene un plan de comunicacion integrada",
        "Se mide el ROI de las campanas",
      ],
    },
    {
      category: "Investigacion de mercado",
      variables: [
        "Se investiga a los consumidores y sus necesidades",
        "Se segmenta el mercado adecuadamente",
        "Se mide la satisfaccion del cliente",
        "Se analiza la participacion de mercado",
        "Se conoce el comportamiento de compra del consumidor",
        "Se tiene un sistema de inteligencia de mercado",
      ],
    },
  ],
  O: [
    {
      category: "Proceso",
      variables: [
        "Los procesos productivos son eficientes",
        "Se utiliza tecnologia de punta en los procesos",
        "Se tiene capacidad instalada adecuada",
        "La utilizacion de la capacidad es optima",
        "Se tiene flexibilidad productiva",
        "Los tiempos de ciclo son competitivos",
      ],
    },
    {
      category: "Capacidad y recursos",
      variables: [
        "La ubicacion de la planta es estrategica",
        "El layout es eficiente",
        "Los equipos y maquinaria son modernos",
        "La capacidad instalada es suficiente para la demanda actual y futura",
        "Se tiene economia de escala",
      ],
    },
    {
      category: "Inventarios y logistica",
      variables: [
        "La gestion de inventarios es eficiente (just-in-time, EOQ)",
        "Los proveedores son confiables y de calidad",
        "La cadena de suministro es integrada y eficiente",
        "Los costos de almacenamiento son controlados",
        "El transporte y distribucion son oportunos",
      ],
    },
    {
      category: "Calidad",
      variables: [
        "Se cuenta con sistema de gestion de calidad (ISO, Six Sigma)",
        "Los indices de calidad son altos",
        "Se realizan auditorias de calidad periodicas",
        "Se tiene cultura de mejora continua",
        "Los costos de calidad y no calidad son medidos",
      ],
    },
    {
      category: "Mantenimiento",
      variables: [
        "Se realiza mantenimiento preventivo y predictivo",
        "Los indices de disponibilidad de equipos son altos",
        "Se tiene un plan de mantenimiento efectivo",
      ],
    },
  ],
  F: [
    {
      category: "Situacion financiera",
      variables: [
        "Los indices financieros son mejores que la industria",
        "Se tiene acceso facil al capital requerido",
        "El capital de trabajo es suficiente",
        "La estructura de capital (deuda/patrimonio) es adecuada",
        "Se cuentan con fuentes de fondos adecuadas y oportunas",
      ],
    },
    {
      category: "Rentabilidad",
      variables: [
        "Los margenes de utilidad son aceptables y crecientes",
        "El ROE y ROA son competitivos",
        "Se genera valor economico agregado (EVA)",
        "Los costos son competitivos frente a la industria",
        "La rentabilidad por producto/linea es analizada",
      ],
    },
    {
      category: "Presupuesto y control",
      variables: [
        "Se cuenta con un sistema de costeo adecuado",
        "Se elaboran presupuestos y se controlan las desviaciones",
        "Se realizan analisis de punto de equilibrio",
        "Se tiene control presupuestario efectivo",
        "Se elaboran proyecciones financieras confiables",
      ],
    },
    {
      category: "Inversion y crecimiento",
      variables: [
        "Los criterios de inversion son claros y seguidos",
        "Se evaluan proyectos de inversion (VAN, TIR, payback)",
        "Se tiene politica de dividendos adecuada",
        "La empresa tiene capacidad para financiar su crecimiento",
      ],
    },
  ],
  H: [
    {
      category: "Gestion del talento",
      variables: [
        "Se cuenta con personal competente y calificado en cada area",
        "Los procesos de seleccion y reclutamiento son efectivos",
        "Se realiza induccion adecuada para nuevos empleados",
        "Los niveles de rotacion y ausentismo son bajos",
        "La estructura de la fuerza laboral es la correcta",
      ],
    },
    {
      category: "Capacitacion y desarrollo",
      variables: [
        "Se invierte en capacitacion y desarrollo del personal",
        "Se tienen planes de carrera y lineas de sucesion",
        "Se desarrollan competencias de liderazgo",
        "El conocimiento es gestionado y compartido",
        "Se realizan evaluaciones de desempeno periodicas",
      ],
    },
    {
      category: "Clima y cultura",
      variables: [
        "El clima laboral es positivo y medido",
        "La cultura organizacional es fuerte y alineada con la estrategia",
        "Se tiene programa de bienestar para los empleados",
        "Las politicas de compensacion son competitivas",
        "Se promueve la diversidad e inclusion",
        "Las relaciones sindicales son estables",
      ],
    },
    {
      category: "Productividad",
      variables: [
        "La productividad del personal es alta y medida",
        "Se tercerizan actividades no core",
        "Los costos laborales son competitivos",
        "Se mide y gestiona el engagement de los empleados",
      ],
    },
  ],
  I: [
    {
      category: "Sistemas de informacion gerencial",
      variables: [
        "Se cuenta con sistema de informacion gerencial (SIG/MIS)",
        "Los sistemas de soporte a la toma de decisiones son adecuados",
        "Se tiene acceso a informacion oportuna y confiable",
        "El sistema ERP/CRM esta integrado y es funcional",
        "Se generan reportes y dashboards gerenciales",
      ],
    },
    {
      category: "Infraestructura tecnologica",
      variables: [
        "La infraestructura de TI es adecuada y moderna",
        "Se cuenta con redes y comunicaciones confiables",
        "La seguridad informatica es gestionada",
        "Se tienen planes de contingencia y recuperacion de datos",
        "La inversion en TI es adecuada",
      ],
    },
    {
      category: "Gestion de datos",
      variables: [
        "Se cuenta con bases de datos actualizadas y confiables",
        "Se realiza analisis de datos para la toma de decisiones",
        "Se tiene gobierno de datos establecido",
        "La informacion es accesible para quienes la necesitan",
        "Se cumple con regulaciones de proteccion de datos",
      ],
    },
  ],
  T: [
    {
      category: "Investigacion y desarrollo",
      variables: [
        "Se invierte en I+D de productos y procesos",
        "Se tiene personal dedicado a innovacion",
        "Se protege la propiedad intelectual (patentes, marcas)",
        "Se realiza vigilancia tecnologica del entorno",
        "Los productos y procesos son innovadores",
      ],
    },
    {
      category: "Tecnologia de produccion",
      variables: [
        "La tecnologia utilizada es de ultima generacion",
        "Se realiza transferencia y adopcion de nuevas tecnologias",
        "Se tiene automatizacion de procesos",
        "Los sistemas de informacion de produccion son adecuados",
        "Se utilizan tecnologias limpias y sostenibles",
      ],
    },
    {
      category: "Capacidad de innovacion",
      variables: [
        "Se fomenta la cultura de innovacion",
        "Se tienen alianzas con centros de investigacion o universidades",
        "Se desarrollan nuevos productos o servicios periodicamente",
        "Se realiza benchmarking tecnologico",
        "Se invierte en transformacion digital",
      ],
    },
  ],
};

export const BSC_PERSPECTIVES = [
  { key: "financiera", label: "Financiera" },
  { key: "cliente", label: "Clientes" },
  { key: "procesos", label: "Procesos Internos" },
  { key: "aprendizaje", label: "Aprendizaje y Crecimiento" },
] as const;

export const SWOT_QUADRANTS = [
  { key: "FO", label: "Fortalezas-Oportunidades (Explotar)" },
  { key: "FA", label: "Fortalezas-Amenazas (Confrontar)" },
  { key: "DO", label: "Debilidades-Oportunidades (Buscar)" },
  { key: "DA", label: "Debilidades-Amenazas (Evitar)" },
] as const;

export const MEFE_RATING_LABELS: Record<number, string> = {
  1: "Amenaza mayor",
  2: "Amenaza menor",
  3: "Oportunidad menor",
  4: "Oportunidad mayor",
};

export const MEFI_RATING_LABELS: Record<number, string> = {
  1: "Debilidad mayor",
  2: "Debilidad menor",
  3: "Fortaleza menor",
  4: "Fortaleza mayor",
};

export const CYCLE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  IN_PROGRESS: "En Progreso",
  REVIEW: "En Revision",
  APPROVED: "Aprobado",
  ARCHIVED: "Archivado",
};

export const PEYEA_QUADRANTS: Record<string, string> = {
  agresivo: "Agresivo",
  competitivo: "Competitivo",
  conservador: "Conservador",
  defensivo: "Defensivo",
};
