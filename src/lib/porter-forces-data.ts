// ---------------------------------------------------------------------------
// Porter's Five Forces — D'Alessio methodology
// Scale: 1-5 measures PRESSURE on the sector (not org performance)
// Higher = more pressure = less attractive
// ---------------------------------------------------------------------------

export interface SubfactorDef {
  id: string;
  nombre: string;
  descripcion: string;
  extremoIzquierdo: string;
  extremoDerecho: string;
  implicancias: Record<1 | 2 | 3 | 4 | 5, string>;
  mefeTemplates: {
    oportunidad: string; // used when value <= 2
    amenaza: string;     // used when value >= 4
  };
}

export interface FuerzaDef {
  id: string;
  nombre: string;
  nombreCorto: string;
  descripcion: string;
  icono: string;
  subfactores: SubfactorDef[];
}

// ---------------------------------------------------------------------------
// Intensity/attractiveness helpers
// ---------------------------------------------------------------------------

export function getIntensidad(avg: number): string {
  if (avg <= 1.5) return "Muy baja";
  if (avg <= 2.5) return "Baja";
  if (avg <= 3.5) return "Moderada";
  if (avg <= 4.5) return "Alta";
  return "Muy alta";
}

export function getAtractividad(avg: number): string {
  if (avg <= 1.5) return "Muy atractiva";
  if (avg <= 2.5) return "Atractiva";
  if (avg <= 3.5) return "Neutral";
  if (avg <= 4.5) return "Poco atractiva";
  return "No atractiva";
}

export function getIntensidadColor(avg: number): { bg: string; border: string; text: string } {
  if (avg <= 2.5) return { bg: "transparent", border: "#1D9E75", text: "#085041" };
  if (avg <= 3.5) return { bg: "transparent", border: "#EF9F27", text: "#633806" };
  return { bg: "transparent", border: "#E24B4A", text: "#791F1F" };
}

export function getValueColor(val: number): { text: string; bg: string } {
  if (val <= 2) return { text: "#059669", bg: "transparent" };
  if (val === 3) return { text: "#D97706", bg: "transparent" };
  return { text: "#E24B4A", bg: "transparent" };
}

// ---------------------------------------------------------------------------
// Analysis generation (deterministic, no AI)
// ---------------------------------------------------------------------------

export interface FuerzaEvaluation {
  fuerzaId: string;
  subfactorValues: Record<string, number>;
  saved: boolean;
}

export function generarAnalisisFuerza(
  fuerza: FuerzaDef,
  values: Record<string, number>,
): string {
  const vals = fuerza.subfactores.map((sf) => values[sf.id] ?? 3);
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  const intensidad = getIntensidad(avg).toLowerCase();
  const atractividad = getAtractividad(avg).toLowerCase();

  const criticos = fuerza.subfactores
    .filter((sf) => (values[sf.id] ?? 3) >= 4)
    .map((sf) => sf.nombre.toLowerCase());
  const favorables = fuerza.subfactores
    .filter((sf) => (values[sf.id] ?? 3) <= 2)
    .map((sf) => sf.nombre.toLowerCase());

  let texto = `La ${fuerza.nombre.toLowerCase()} presenta una intensidad ${intensidad} (${avg.toFixed(1)}/5), `;
  texto += `lo que posiciona esta dimension como ${atractividad} para el sector. `;

  if (criticos.length > 0) {
    texto += `Los factores de mayor presion son: ${criticos.join(", ")}. `;
  }
  if (favorables.length > 0) {
    texto += `Los factores favorables que moderan la presion son: ${favorables.join(", ")}. `;
  }

  if (avg >= 4) texto += "Esta fuerza requiere estrategias defensivas prioritarias.";
  else if (avg >= 3) texto += "Esta fuerza requiere monitoreo y estrategias de posicionamiento.";
  else texto += "Esta fuerza representa una ventaja competitiva estructural del sector.";

  return texto;
}

export interface MefeSuggestion {
  subfactorId: string;
  subfactorNombre: string;
  nombre: string;
  tipo: "O" | "A";
  justificacion: string;
}

export function generarFactoresMEFE(
  fuerza: FuerzaDef,
  values: Record<string, number>,
): MefeSuggestion[] {
  const result: MefeSuggestion[] = [];

  fuerza.subfactores.forEach((sf) => {
    const val = values[sf.id] ?? 3;
    if (val >= 4) {
      result.push({
        subfactorId: sf.id,
        subfactorNombre: sf.nombre,
        nombre: sf.mefeTemplates.amenaza,
        tipo: "A",
        justificacion: `Generado desde: ${sf.nombre} (${val}/5). ${sf.implicancias[val as 1 | 2 | 3 | 4 | 5]}`,
      });
    } else if (val <= 2) {
      result.push({
        subfactorId: sf.id,
        subfactorNombre: sf.nombre,
        nombre: sf.mefeTemplates.oportunidad,
        tipo: "O",
        justificacion: `Generado desde: ${sf.nombre} (${val}/5). ${sf.implicancias[val as 1 | 2 | 3 | 4 | 5]}`,
      });
    }
  });

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// FORCE 1: Rivalidad entre competidores
// ═══════════════════════════════════════════════════════════════════════════

const RIVALIDAD: FuerzaDef = {
  id: "rivalidad",
  nombre: "Rivalidad entre competidores",
  nombreCorto: "Rivalidad",
  descripcion: "Evalua la intensidad de la competencia dentro del sector. Puntaje alto = mayor presion competitiva = industria menos atractiva.",
  icono: "swords",
  subfactores: [
    {
      id: "riv-1", nombre: "Cantidad de competidores",
      descripcion: "Mas competidores = mayor presion sobre precios y margenes.",
      extremoIzquierdo: "1 — Pocos competidores", extremoDerecho: "5 — Muchos competidores",
      implicancias: {
        1: "Pocos competidores favorecen la rentabilidad del sector",
        2: "Competencia limitada reduce la presion sobre precios",
        3: "Presion moderada sobre precios y margenes",
        4: "Alta competencia presiona significativamente los margenes",
        5: "Sector altamente fragmentado, tendencia a guerra de precios",
      },
      mefeTemplates: {
        oportunidad: "Estructura competitiva concentrada favorece los margenes sectoriales",
        amenaza: "Alta cantidad de competidores presiona los margenes del sector",
      },
    },
    {
      id: "riv-2", nombre: "Diferenciacion de productos",
      descripcion: "Poca diferenciacion = competencia por precio = mayor presion.",
      extremoIzquierdo: "1 — Alta diferenciacion", extremoDerecho: "5 — Sin diferenciacion (commodities)",
      implicancias: {
        1: "Alta diferenciacion protege los margenes del sector",
        2: "Diferenciacion moderada-alta reduce competencia por precio",
        3: "Diferenciacion moderada con segmentos competitivos",
        4: "Baja diferenciacion intensifica competencia por precio",
        5: "Productos commoditizados, competencia exclusivamente por precio",
      },
      mefeTemplates: {
        oportunidad: "Alta diferenciacion de productos protege margenes y posicionamiento",
        amenaza: "Baja diferenciacion de productos genera competencia destructiva por precio",
      },
    },
    {
      id: "riv-3", nombre: "Tasa de crecimiento del sector",
      descripcion: "Sectores en declive intensifican la rivalidad.",
      extremoIzquierdo: "1 — Crecimiento rapido", extremoDerecho: "5 — Declive",
      implicancias: {
        1: "Sector en fuerte crecimiento, hay espacio para todos los competidores",
        2: "Crecimiento positivo modera la rivalidad competitiva",
        3: "Crecimiento moderado, competencia estable",
        4: "Sector maduro, competencia por cuotas de participacion",
        5: "Sector en declive, rivalidad extrema por supervivencia",
      },
      mefeTemplates: {
        oportunidad: "Crecimiento rapido del sector genera espacio para expansion",
        amenaza: "Sector maduro o en declive intensifica la rivalidad competitiva",
      },
    },
    {
      id: "riv-4", nombre: "Barreras de salida",
      descripcion: "Altas barreras de salida mantienen competidores no rentables.",
      extremoIzquierdo: "1 — Salida facil", extremoDerecho: "5 — Salida muy dificil",
      implicancias: {
        1: "Salida facil permite que competidores no rentables abandonen el sector",
        2: "Barreras bajas generan ajuste natural de la competencia",
        3: "Barreras moderadas mantienen cierta estabilidad competitiva",
        4: "Altas barreras atrapan competidores no rentables en el sector",
        5: "Salida practicamente imposible, presencia de competidores zombis",
      },
      mefeTemplates: {
        oportunidad: "Bajas barreras de salida permiten ajuste natural del sector",
        amenaza: "Altas barreras de salida mantienen exceso de capacidad en el sector",
      },
    },
    {
      id: "riv-5", nombre: "Costos fijos elevados",
      descripcion: "Altos costos fijos obligan a operar a plena capacidad, generando guerras de precios.",
      extremoIzquierdo: "1 — Costos fijos bajos", extremoDerecho: "5 — Costos fijos muy altos",
      implicancias: {
        1: "Estructura de costos flexible favorece la rentabilidad",
        2: "Costos fijos manejables no presionan la capacidad",
        3: "Costos fijos moderados con cierta presion sobre utilizacion",
        4: "Altos costos fijos generan presion para operar a plena capacidad",
        5: "Costos fijos muy altos fuerzan guerras de precios para cubrir capacidad",
      },
      mefeTemplates: {
        oportunidad: "Estructura de costos fijos flexible favorece la rentabilidad sectorial",
        amenaza: "Altos costos fijos del sector generan presion constante sobre precios",
      },
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// FORCE 2: Amenaza de nuevos entrantes
// ═══════════════════════════════════════════════════════════════════════════

const ENTRANTES: FuerzaDef = {
  id: "entrantes",
  nombre: "Amenaza de nuevos entrantes",
  nombreCorto: "Entrantes",
  descripcion: "Evalua que tan facil es que nuevos competidores ingresen al sector. Alta amenaza = menor atractividad.",
  icono: "log-in",
  subfactores: [
    {
      id: "ent-1", nombre: "Economias de escala",
      descripcion: "Las economias de escala son una barrera para nuevos entrantes pequenos.",
      extremoIzquierdo: "1 — Economias de escala altas (barrera alta)", extremoDerecho: "5 — Sin economias de escala (barrera baja)",
      implicancias: {
        1: "Las economias de escala representan una barrera alta de entrada",
        2: "Economias de escala moderadas-altas protegen a los incumbentes",
        3: "Economias de escala moderadas con entrada selectiva",
        4: "Bajas economias de escala facilitan la entrada de nuevos competidores",
        5: "Sin ventajas de escala, cualquier actor puede entrar al sector",
      },
      mefeTemplates: {
        oportunidad: "Economias de escala del sector protegen frente a nuevos entrantes",
        amenaza: "Ausencia de economias de escala facilita entrada de nuevos competidores",
      },
    },
    {
      id: "ent-2", nombre: "Requisitos de capital inicial",
      descripcion: "Alta inversion inicial es una barrera natural.",
      extremoIzquierdo: "1 — Alta inversion requerida (barrera alta)", extremoDerecho: "5 — Poca inversion requerida (barrera baja)",
      implicancias: {
        1: "Los altos requisitos de capital limitan seriamente el ingreso de nuevos actores",
        2: "Inversion significativa modera la amenaza de nuevos entrantes",
        3: "Requisitos de capital moderados permiten entrada selectiva",
        4: "Baja inversion inicial facilita el ingreso de nuevos competidores",
        5: "Sin barreras de capital, sector altamente vulnerable a nuevos entrantes",
      },
      mefeTemplates: {
        oportunidad: "Altos requisitos de capital limitan la entrada de nuevos competidores",
        amenaza: "Baja barrera de capital expone al sector a nuevos entrantes",
      },
    },
    {
      id: "ent-3", nombre: "Acceso a canales de distribucion",
      descripcion: "Canales controlados son una barrera de entrada.",
      extremoIzquierdo: "1 — Acceso muy dificil (barrera alta)", extremoDerecho: "5 — Acceso libre (barrera baja)",
      implicancias: {
        1: "Los canales de distribucion controlados representan una barrera significativa",
        2: "Acceso restringido a canales protege a los incumbentes",
        3: "Acceso moderado a canales con barreras selectivas",
        4: "Canales accesibles facilitan la distribucion de nuevos entrantes",
        5: "Canales completamente abiertos, sin barreras de distribucion",
      },
      mefeTemplates: {
        oportunidad: "Canales de distribucion controlados protegen a los actores establecidos",
        amenaza: "Canales de distribucion abiertos facilitan la entrada de competidores",
      },
    },
    {
      id: "ent-4", nombre: "Diferenciacion y lealtad de marca",
      descripcion: "La lealtad de marca obliga a los entrantes a invertir mas para competir.",
      extremoIzquierdo: "1 — Marca muy fuerte (barrera alta)", extremoDerecho: "5 — Sin diferenciacion de marca (barrera baja)",
      implicancias: {
        1: "Las marcas establecidas y la lealtad del cliente son barreras fuertes",
        2: "Reconocimiento de marca moderado-alto protege a incumbentes",
        3: "Diferenciacion de marca moderada con oportunidades para entrantes",
        4: "Baja diferenciacion de marca facilita la entrada con precio competitivo",
        5: "Sin diferenciacion de marca, facil captura de clientes por nuevos entrantes",
      },
      mefeTemplates: {
        oportunidad: "Marcas fuertes y lealtad del cliente protegen la posicion competitiva",
        amenaza: "Baja lealtad de marca expone al sector a la entrada de nuevos actores",
      },
    },
    {
      id: "ent-5", nombre: "Regulacion gubernamental",
      descripcion: "La regulacion puede ser una barrera protectora.",
      extremoIzquierdo: "1 — Alta regulacion (barrera alta)", extremoDerecho: "5 — Sin regulacion relevante (barrera baja)",
      implicancias: {
        1: "Las regulaciones estrictas limitan significativamente el ingreso de nuevos actores",
        2: "Regulacion moderada-alta genera barreras administrativas de entrada",
        3: "Regulacion moderada con procesos de entrada definidos",
        4: "Regulacion baja facilita el ingreso rapido de nuevos competidores",
        5: "Sector desregulado, sin barreras regulatorias de entrada",
      },
      mefeTemplates: {
        oportunidad: "Regulacion estricta del sector limita la entrada de nuevos competidores",
        amenaza: "Desregulacion del sector facilita la entrada de nuevos actores",
      },
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// FORCE 3: Amenaza de productos sustitutos
// ═══════════════════════════════════════════════════════════════════════════

const SUSTITUTOS: FuerzaDef = {
  id: "sustitutos",
  nombre: "Amenaza de productos sustitutos",
  nombreCorto: "Sustitutos",
  descripcion: "Evalua el riesgo de que los clientes migren a alternativas que satisfagan la misma necesidad.",
  icono: "repeat",
  subfactores: [
    {
      id: "sus-1", nombre: "Disponibilidad de sustitutos",
      descripcion: "Existencia de productos o servicios alternativos que satisfacen la misma necesidad.",
      extremoIzquierdo: "1 — Sin sustitutos disponibles", extremoDerecho: "5 — Muchos sustitutos disponibles",
      implicancias: {
        1: "La ausencia de sustitutos protege fuertemente la demanda del sector",
        2: "Pocos sustitutos con impacto limitado en la demanda",
        3: "Sustitutos moderados con impacto selectivo por segmento",
        4: "Multiples sustitutos disponibles presionan la demanda sectorial",
        5: "Alta disponibilidad de sustitutos amenaza seriamente la demanda",
      },
      mefeTemplates: {
        oportunidad: "Ausencia de sustitutos protege la demanda del sector",
        amenaza: "Alta disponibilidad de sustitutos amenaza la demanda sectorial",
      },
    },
    {
      id: "sus-2", nombre: "Relacion precio-desempeno del sustituto",
      descripcion: "Mejor precio-desempeno en sustitutos aumenta la amenaza.",
      extremoIzquierdo: "1 — Desempeno muy inferior al producto actual", extremoDerecho: "5 — Desempeno igual o superior a menor costo",
      implicancias: {
        1: "Los sustitutos tienen desempeno muy inferior, amenaza minima",
        2: "Sustitutos con desempeno limitado, migracion poco probable",
        3: "Sustitutos con desempeno comparable en algunos atributos",
        4: "Sustitutos competitivos en precio-desempeno, amenaza significativa",
        5: "Sustitutos superiores en precio-desempeno, migracion masiva probable",
      },
      mefeTemplates: {
        oportunidad: "Sustitutos de calidad inferior no representan amenaza real",
        amenaza: "Sustitutos con mejor relacion precio-desempeno amenazan la demanda",
      },
    },
    {
      id: "sus-3", nombre: "Costo de cambio para el cliente",
      descripcion: "Que tan costoso es para el cliente cambiar al sustituto.",
      extremoIzquierdo: "1 — Costo de cambio muy alto", extremoDerecho: "5 — Sin costo de cambio",
      implicancias: {
        1: "Alto costo de cambio genera retencion natural de clientes",
        2: "Costo de cambio significativo desincentiva la migracion",
        3: "Costo de cambio moderado con migracion selectiva",
        4: "Bajo costo de cambio facilita la migracion a sustitutos",
        5: "Sin costo de cambio, clientes pueden migrar libremente al sustituto",
      },
      mefeTemplates: {
        oportunidad: "Alto costo de cambio genera retencion natural de clientes en el sector",
        amenaza: "Bajo costo de cambio facilita la migracion de clientes a sustitutos",
      },
    },
    {
      id: "sus-4", nombre: "Propension del cliente a sustituir",
      descripcion: "Disposicion del cliente a probar alternativas.",
      extremoIzquierdo: "1 — Clientes muy conservadores", extremoDerecho: "5 — Clientes muy abiertos a alternativas",
      implicancias: {
        1: "Clientes conservadores con alta lealtad al producto actual",
        2: "Baja propension al cambio protege la base de clientes",
        3: "Propension moderada con segmentos innovadores",
        4: "Alta disposicion a probar alternativas aumenta la vulnerabilidad",
        5: "Clientes altamente dispuestos a sustituir, lealtad muy baja",
      },
      mefeTemplates: {
        oportunidad: "Clientes conservadores mantienen alta lealtad al producto del sector",
        amenaza: "Alta propension de clientes a probar alternativas amenaza la demanda",
      },
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// FORCE 4: Poder de negociacion de los compradores
// ═══════════════════════════════════════════════════════════════════════════

const COMPRADORES: FuerzaDef = {
  id: "compradores",
  nombre: "Poder de negociacion de los compradores",
  nombreCorto: "Compradores",
  descripcion: "Evalua cuanto poder tienen los clientes para presionar precios hacia abajo o exigir mayor calidad.",
  icono: "shopping-cart",
  subfactores: [
    {
      id: "com-1", nombre: "Concentracion de compradores",
      descripcion: "Pocos compradores grandes tienen mas poder.",
      extremoIzquierdo: "1 — Muchos compradores pequenos (poder bajo)", extremoDerecho: "5 — Pocos compradores grandes (poder alto)",
      implicancias: {
        1: "Muchos compradores dispersos limitan el poder de negociacion individual",
        2: "Concentracion baja de compradores con poder negociador moderado",
        3: "Concentracion moderada con compradores clave identificables",
        4: "Alta concentracion de compradores con poder de negociacion significativo",
        5: "Pocos compradores dominantes con poder de negociacion muy alto",
      },
      mefeTemplates: {
        oportunidad: "Base de clientes diversificada limita el poder de negociacion individual",
        amenaza: "Alta concentracion de compradores presiona los margenes del sector",
      },
    },
    {
      id: "com-2", nombre: "Volumen de compra por cliente",
      descripcion: "Mayor volumen por cliente = mayor poder de negociacion.",
      extremoIzquierdo: "1 — Compras pequenas y dispersas", extremoDerecho: "5 — Compras de gran volumen por cliente",
      implicancias: {
        1: "Compras pequenas dispersas minimizan el poder de negociacion individual",
        2: "Volumenes moderados con influencia limitada en precios",
        3: "Volumenes medios con negociacion selectiva",
        4: "Grandes volumenes otorgan poder de negociacion significativo",
        5: "Compras masivas por cliente generan dependencia y alto poder negociador",
      },
      mefeTemplates: {
        oportunidad: "Compras dispersas limitan el poder de negociacion de cada cliente",
        amenaza: "Grandes volumenes de compra por cliente otorgan alto poder negociador",
      },
    },
    {
      id: "com-3", nombre: "Informacion disponible del comprador",
      descripcion: "Mayor informacion del comprador = mayor poder.",
      extremoIzquierdo: "1 — Compradores con informacion limitada", extremoDerecho: "5 — Compradores perfectamente informados",
      implicancias: {
        1: "Asimetria de informacion favorece al vendedor en la negociacion",
        2: "Informacion limitada reduce el poder de negociacion del comprador",
        3: "Informacion moderada con negociacion basada en referencias parciales",
        4: "Alto acceso a informacion fortalece la posicion negociadora del comprador",
        5: "Compradores perfectamente informados ejercen presion maxima sobre precios",
      },
      mefeTemplates: {
        oportunidad: "Asimetria de informacion favorece a los vendedores del sector",
        amenaza: "Compradores altamente informados ejercen presion maxima sobre precios",
      },
    },
    {
      id: "com-4", nombre: "Sensibilidad al precio",
      descripcion: "Alta sensibilidad aumenta el poder de negociacion del comprador.",
      extremoIzquierdo: "1 — Baja sensibilidad al precio", extremoDerecho: "5 — Muy alta sensibilidad al precio",
      implicancias: {
        1: "Baja sensibilidad al precio permite margenes mas altos",
        2: "Sensibilidad moderada-baja con espacio para diferenciacion por valor",
        3: "Sensibilidad moderada con segmentos premium y economicos",
        4: "Alta sensibilidad al precio presiona constantemente los margenes",
        5: "El precio es el unico factor de decision, competencia extrema en costos",
      },
      mefeTemplates: {
        oportunidad: "Baja sensibilidad al precio permite margenes y diferenciacion por valor",
        amenaza: "Alta sensibilidad al precio de los compradores presiona los margenes",
      },
    },
    {
      id: "com-5", nombre: "Amenaza de integracion hacia atras",
      descripcion: "Si los compradores pueden producir lo que compran, aumenta su poder.",
      extremoIzquierdo: "1 — Integracion hacia atras muy dificil", extremoDerecho: "5 — Integracion hacia atras muy probable",
      implicancias: {
        1: "La imposibilidad de integracion hacia atras limita el poder del comprador",
        2: "Integracion poco viable reduce la presion negociadora",
        3: "Integracion posible pero costosa, usada como herramienta de negociacion",
        4: "Amenaza creible de integracion que fortalece la posicion del comprador",
        5: "Integracion hacia atras altamente probable, maximo poder de negociacion",
      },
      mefeTemplates: {
        oportunidad: "Integracion hacia atras inviable limita el poder del comprador",
        amenaza: "Amenaza real de integracion hacia atras aumenta el poder del comprador",
      },
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// FORCE 5: Poder de negociacion de los proveedores
// ═══════════════════════════════════════════════════════════════════════════

const PROVEEDORES: FuerzaDef = {
  id: "proveedores",
  nombre: "Poder de negociacion de los proveedores",
  nombreCorto: "Proveedores",
  descripcion: "Evalua cuanto poder tienen los proveedores para subir precios o reducir la calidad de los insumos.",
  icono: "truck",
  subfactores: [
    {
      id: "prov-1", nombre: "Concentracion de proveedores",
      descripcion: "Mayor concentracion = mayor poder del proveedor.",
      extremoIzquierdo: "1 — Muchos proveedores disponibles", extremoDerecho: "5 — Pocos proveedores concentrados",
      implicancias: {
        1: "Muchos proveedores disponibles minimizan el poder de cada uno",
        2: "Moderada cantidad de proveedores con competencia entre ellos",
        3: "Concentracion moderada con dependencia selectiva",
        4: "Alta concentracion otorga poder significativo a los proveedores",
        5: "Oligopolio de proveedores con poder de negociacion muy alto",
      },
      mefeTemplates: {
        oportunidad: "Amplia oferta de proveedores reduce su poder de negociacion",
        amenaza: "Alta concentracion de proveedores aumenta costos y dependencia",
      },
    },
    {
      id: "prov-2", nombre: "Disponibilidad de sustitutos de insumos",
      descripcion: "Existencia de insumos alternativos.",
      extremoIzquierdo: "1 — Muchos sustitutos disponibles", extremoDerecho: "5 — Sin sustitutos del insumo",
      implicancias: {
        1: "Alta disponibilidad de sustitutos limita el poder del proveedor",
        2: "Alternativas disponibles reducen la dependencia del proveedor actual",
        3: "Sustitutos moderados con cambio posible pero costoso",
        4: "Pocos sustitutos generan dependencia significativa del proveedor",
        5: "Sin sustitutos del insumo, dependencia total del proveedor",
      },
      mefeTemplates: {
        oportunidad: "Disponibilidad de insumos sustitutos reduce dependencia de proveedores",
        amenaza: "Ausencia de insumos sustitutos genera dependencia critica del proveedor",
      },
    },
    {
      id: "prov-3", nombre: "Costo de cambio de proveedor",
      descripcion: "Alto costo de cambio aumenta el poder del proveedor actual.",
      extremoIzquierdo: "1 — Cambio de proveedor muy facil y barato", extremoDerecho: "5 — Cambio muy costoso o imposible",
      implicancias: {
        1: "Cambio facil de proveedor limita el poder de cada uno",
        2: "Bajo costo de cambio mantiene presion competitiva entre proveedores",
        3: "Costo de cambio moderado con cierta dependencia operativa",
        4: "Alto costo de cambio genera dependencia y poder del proveedor",
        5: "Cambio practicamente imposible, el proveedor tiene poder total",
      },
      mefeTemplates: {
        oportunidad: "Facilidad de cambio de proveedor mantiene presion competitiva",
        amenaza: "Alto costo de cambio de proveedor genera dependencia operativa",
      },
    },
    {
      id: "prov-4", nombre: "Amenaza de integracion hacia adelante",
      descripcion: "Si el proveedor puede convertirse en competidor directo.",
      extremoIzquierdo: "1 — Integracion hacia adelante muy dificil", extremoDerecho: "5 — Integracion hacia adelante muy probable",
      implicancias: {
        1: "Sin amenaza de integracion, la relacion con el proveedor es estable",
        2: "Integracion poco probable reduce la presion del proveedor",
        3: "Integracion posible como palanca de negociacion del proveedor",
        4: "Amenaza creible de integracion que fortalece al proveedor",
        5: "Alta probabilidad de integracion, el proveedor puede convertirse en competidor",
      },
      mefeTemplates: {
        oportunidad: "Baja amenaza de integracion hacia adelante estabiliza la cadena de suministro",
        amenaza: "Proveedores con capacidad de integracion hacia adelante amenazan la posicion competitiva",
      },
    },
    {
      id: "prov-5", nombre: "Importancia del insumo para la calidad final",
      descripcion: "Que tan critico es el insumo del proveedor para la calidad del producto final.",
      extremoIzquierdo: "1 — Insumo de baja importancia", extremoDerecho: "5 — Insumo critico para la calidad",
      implicancias: {
        1: "Insumo periferico que puede reemplazarse sin afectar la calidad",
        2: "Insumo relevante pero sustituible con impacto moderado",
        3: "Insumo importante con dependencia operativa parcial",
        4: "Insumo critico que afecta significativamente la calidad del producto",
        5: "Insumo esencial sin el cual la calidad del producto colapsa",
      },
      mefeTemplates: {
        oportunidad: "Insumos perifericos permiten flexibilidad en la cadena de suministro",
        amenaza: "Dependencia critica de insumos clave aumenta vulnerabilidad ante proveedores",
      },
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export const PORTER_FORCES: FuerzaDef[] = [
  RIVALIDAD,
  ENTRANTES,
  SUSTITUTOS,
  COMPRADORES,
  PROVEEDORES,
];
