// ---------------------------------------------------------------------------
// PESTEC Evaluation Data — D'Alessio methodology
// 6 macroeconomic variables: P, E, S, T, Ec, C
// ---------------------------------------------------------------------------

export interface PestecSubVariable {
  id: string;
  nombre: string;
  clase: "primaria" | "secundaria";
}

export interface PestecVariableData {
  key: string;
  letra: string;
  nombre: string;
  descripcion: string;
  color: string;
  colorLight: string;
  icono: string;
  subVariables: PestecSubVariable[];
}

// Rating labels for MEFE (how the org RESPONDS to the factor)
export const MEFE_RESPONSE_LABELS = {
  1: { label: "Respuesta deficiente", description: "La organizacion no sabe aprovechar la oportunidad o no puede defenderse de la amenaza" },
  2: { label: "Respuesta por debajo del promedio", description: "La respuesta esta por debajo del promedio del sector" },
  3: { label: "Respuesta por encima del promedio", description: "La respuesta esta por encima del promedio del sector" },
  4: { label: "Respuesta superior", description: "La organizacion explota la oportunidad o neutraliza la amenaza mejor que todos" },
} as const;

// Evidence chips common for external factors
const COMMON_CHIPS = [
  "Informe sectorial",
  "Publicacion oficial",
  "Estudio de mercado",
  "Nota de prensa",
  "Dato estadistico",
  "No tenemos evidencia",
];

// ---------------------------------------------------------------------------
// P — Politico
// ---------------------------------------------------------------------------

const P_VARS: PestecSubVariable[] = [
  { id: "P-01", nombre: "Estabilidad politica", clase: "primaria" },
  { id: "P-02", nombre: "Politica fiscal", clase: "primaria" },
  { id: "P-03", nombre: "Legislacion laboral", clase: "primaria" },
  { id: "P-04", nombre: "Legislacion medioambiental", clase: "primaria" },
  { id: "P-05", nombre: "Corrupcion", clase: "primaria" },
  { id: "P-06", nombre: "Informalidad", clase: "primaria" },
  { id: "P-07", nombre: "Politica monetaria", clase: "primaria" },
  { id: "P-08", nombre: "Regulaciones gubernamentales", clase: "primaria" },
  { id: "P-09", nombre: "Legislacion arancelaria", clase: "primaria" },
  { id: "P-10", nombre: "Seguridad juridica", clase: "primaria" },
  { id: "P-11", nombre: "Contrabando", clase: "primaria" },
  { id: "P-12", nombre: "Relaciones con organismos publicos", clase: "primaria" },
  { id: "P-13", nombre: "Partidos politicos en el poder", clase: "secundaria" },
  { id: "P-14", nombre: "Sistema de gobierno", clase: "secundaria" },
  { id: "P-15", nombre: "Politica de subsidios", clase: "secundaria" },
  { id: "P-16", nombre: "Defensa de la libre competencia", clase: "secundaria" },
  { id: "P-17", nombre: "Amenazas de expropiacion", clase: "secundaria" },
  { id: "P-18", nombre: "Presupuestos gubernamentales", clase: "secundaria" },
  { id: "P-19", nombre: "Defensa de la propiedad intelectual", clase: "secundaria" },
  { id: "P-20", nombre: "Seguridad y orden interno", clase: "secundaria" },
  { id: "P-21", nombre: "Situacion politica mundial", clase: "secundaria" },
  { id: "P-22", nombre: "Relaciones con gobiernos", clase: "secundaria" },
  { id: "P-23", nombre: "Leyes internacionales y derechos humanos", clase: "secundaria" },
  { id: "P-24", nombre: "Relaciones con organismos internacionales", clase: "secundaria" },
];

// ---------------------------------------------------------------------------
// E — Economico
// ---------------------------------------------------------------------------

const E_VARS: PestecSubVariable[] = [
  { id: "E-01", nombre: "PBI y tasa de crecimiento", clase: "primaria" },
  { id: "E-02", nombre: "Inflacion", clase: "primaria" },
  { id: "E-03", nombre: "Tipo de cambio", clase: "primaria" },
  { id: "E-04", nombre: "Tasa de interes", clase: "primaria" },
  { id: "E-05", nombre: "Niveles de empleo y desempleo", clase: "primaria" },
  { id: "E-06", nombre: "Deficit fiscal", clase: "primaria" },
  { id: "E-07", nombre: "Deuda publica", clase: "primaria" },
  { id: "E-08", nombre: "Balanza comercial", clase: "primaria" },
  { id: "E-09", nombre: "Inversion extranjera directa", clase: "primaria" },
  { id: "E-10", nombre: "Acceso al credito", clase: "primaria" },
  { id: "E-11", nombre: "Distribucion del ingreso", clase: "primaria" },
  { id: "E-12", nombre: "Poder adquisitivo del consumidor", clase: "primaria" },
  { id: "E-13", nombre: "Economias de escala disponibles", clase: "secundaria" },
  { id: "E-14", nombre: "Productividad del sector", clase: "secundaria" },
  { id: "E-15", nombre: "Costo de materias primas", clase: "secundaria" },
  { id: "E-16", nombre: "Variacion de precios internacionales", clase: "secundaria" },
  { id: "E-17", nombre: "Ciclos economicos", clase: "secundaria" },
  { id: "E-18", nombre: "Comportamiento de la bolsa de valores", clase: "secundaria" },
  { id: "E-19", nombre: "Tratados de libre comercio", clase: "secundaria" },
  { id: "E-20", nombre: "Integracion economica regional", clase: "secundaria" },
  { id: "E-21", nombre: "Costo de energia", clase: "secundaria" },
  { id: "E-22", nombre: "Reservas internacionales", clase: "secundaria" },
  { id: "E-23", nombre: "Mercados emergentes", clase: "secundaria" },
  { id: "E-24", nombre: "Volatilidad financiera global", clase: "secundaria" },
];

// ---------------------------------------------------------------------------
// S — Social
// ---------------------------------------------------------------------------

const S_VARS: PestecSubVariable[] = [
  { id: "S-01", nombre: "Tasa de crecimiento poblacional", clase: "primaria" },
  { id: "S-02", nombre: "Estructura de edades de la poblacion", clase: "primaria" },
  { id: "S-03", nombre: "Distribucion geografica de la poblacion", clase: "primaria" },
  { id: "S-04", nombre: "Tasa de alfabetizacion", clase: "primaria" },
  { id: "S-05", nombre: "Nivel educativo promedio", clase: "primaria" },
  { id: "S-06", nombre: "Indice de pobreza y pobreza extrema", clase: "primaria" },
  { id: "S-07", nombre: "Estilos de vida y tendencias de consumo", clase: "primaria" },
  { id: "S-08", nombre: "Actitudes hacia el trabajo y el ocio", clase: "primaria" },
  { id: "S-09", nombre: "Nivel de conciencia ambiental", clase: "primaria" },
  { id: "S-10", nombre: "Migracion interna y externa", clase: "primaria" },
  { id: "S-11", nombre: "Conflictos sociales y protestas", clase: "primaria" },
  { id: "S-12", nombre: "Seguridad ciudadana", clase: "primaria" },
  { id: "S-13", nombre: "Rol de la mujer en la sociedad", clase: "secundaria" },
  { id: "S-14", nombre: "Estructura familiar", clase: "secundaria" },
  { id: "S-15", nombre: "Acceso a salud publica", clase: "secundaria" },
  { id: "S-16", nombre: "Sistemas de salud", clase: "secundaria" },
  { id: "S-17", nombre: "Diversidad cultural", clase: "secundaria" },
  { id: "S-18", nombre: "Movimientos sociales", clase: "secundaria" },
  { id: "S-19", nombre: "Acceso a educacion superior", clase: "secundaria" },
  { id: "S-20", nombre: "Religiosidad e influencia religiosa", clase: "secundaria" },
  { id: "S-21", nombre: "Idiomas predominantes", clase: "secundaria" },
  { id: "S-22", nombre: "Habitos de consumo digital", clase: "secundaria" },
  { id: "S-23", nombre: "Responsabilidad social empresarial", clase: "secundaria" },
  { id: "S-24", nombre: "Expectativas de vida", clase: "secundaria" },
];

// ---------------------------------------------------------------------------
// T — Tecnologico
// ---------------------------------------------------------------------------

const T_VARS: PestecSubVariable[] = [
  { id: "T-01", nombre: "Nivel de automatizacion e industria 4.0", clase: "primaria" },
  { id: "T-02", nombre: "Inteligencia artificial y machine learning", clase: "primaria" },
  { id: "T-03", nombre: "Penetracion de internet y banda ancha", clase: "primaria" },
  { id: "T-04", nombre: "Adopcion de comercio electronico", clase: "primaria" },
  { id: "T-05", nombre: "Ciberseguridad y proteccion de datos", clase: "primaria" },
  { id: "T-06", nombre: "Velocidad de innovacion tecnologica", clase: "primaria" },
  { id: "T-07", nombre: "Inversion en I+D del sector", clase: "primaria" },
  { id: "T-08", nombre: "Infraestructura tecnologica del pais", clase: "primaria" },
  { id: "T-09", nombre: "Adopcion de tecnologias moviles", clase: "primaria" },
  { id: "T-10", nombre: "Digitalizacion de procesos gubernamentales", clase: "primaria" },
  { id: "T-11", nombre: "Blockchain y tecnologias descentralizadas", clase: "secundaria" },
  { id: "T-12", nombre: "Internet de las cosas (IoT)", clase: "secundaria" },
  { id: "T-13", nombre: "Computacion en la nube", clase: "secundaria" },
  { id: "T-14", nombre: "Impresion 3D", clase: "secundaria" },
  { id: "T-15", nombre: "Robotica y automatizacion industrial", clase: "secundaria" },
  { id: "T-16", nombre: "Big Data y analitica avanzada", clase: "secundaria" },
  { id: "T-17", nombre: "Realidad aumentada y virtual", clase: "secundaria" },
  { id: "T-18", nombre: "Patentes y propiedad intelectual tecnologica", clase: "secundaria" },
  { id: "T-19", nombre: "Transferencia tecnologica internacional", clase: "secundaria" },
  { id: "T-20", nombre: "Startups y ecosistema de innovacion", clase: "secundaria" },
  { id: "T-21", nombre: "Energias renovables y tecnologia verde", clase: "secundaria" },
  { id: "T-22", nombre: "Biotecnologia", clase: "secundaria" },
];

// ---------------------------------------------------------------------------
// Ec — Ecologico
// ---------------------------------------------------------------------------

const Ec_VARS: PestecSubVariable[] = [
  { id: "Ec-01", nombre: "Cambio climatico y calentamiento global", clase: "primaria" },
  { id: "Ec-02", nombre: "Regulaciones medioambientales", clase: "primaria" },
  { id: "Ec-03", nombre: "Gestion de residuos y economia circular", clase: "primaria" },
  { id: "Ec-04", nombre: "Escasez de recursos naturales", clase: "primaria" },
  { id: "Ec-05", nombre: "Contaminacion del aire y agua", clase: "primaria" },
  { id: "Ec-06", nombre: "Deforestacion y perdida de biodiversidad", clase: "primaria" },
  { id: "Ec-07", nombre: "Desastres naturales y eventos climaticos extremos", clase: "primaria" },
  { id: "Ec-08", nombre: "Acceso al agua potable", clase: "primaria" },
  { id: "Ec-09", nombre: "Huella de carbono y emisiones de CO2", clase: "primaria" },
  { id: "Ec-10", nombre: "Sostenibilidad y economia verde", clase: "primaria" },
  { id: "Ec-11", nombre: "Certificaciones ambientales", clase: "secundaria" },
  { id: "Ec-12", nombre: "Energia renovable", clase: "secundaria" },
  { id: "Ec-13", nombre: "Responsabilidad ambiental corporativa", clase: "secundaria" },
  { id: "Ec-14", nombre: "Acuerdos internacionales ambientales (COP, Acuerdo de Paris)", clase: "secundaria" },
  { id: "Ec-15", nombre: "Impacto ambiental de la cadena de suministro", clase: "secundaria" },
  { id: "Ec-16", nombre: "Reciclaje y reutilizacion", clase: "secundaria" },
  { id: "Ec-17", nombre: "Agricultura sostenible", clase: "secundaria" },
  { id: "Ec-18", nombre: "Mineria responsable", clase: "secundaria" },
  { id: "Ec-19", nombre: "Turismo sostenible", clase: "secundaria" },
  { id: "Ec-20", nombre: "Gestion de ecosistemas", clase: "secundaria" },
  { id: "Ec-21", nombre: "Contaminacion sonora y luminica", clase: "secundaria" },
  { id: "Ec-22", nombre: "Impacto en fauna y flora", clase: "secundaria" },
];

// ---------------------------------------------------------------------------
// C — Competitivo
// ---------------------------------------------------------------------------

const C_VARS: PestecSubVariable[] = [
  { id: "C-01", nombre: "Numero y tamano de competidores directos", clase: "primaria" },
  { id: "C-02", nombre: "Barreras de entrada al sector", clase: "primaria" },
  { id: "C-03", nombre: "Poder de negociacion de proveedores", clase: "primaria" },
  { id: "C-04", nombre: "Poder de negociacion de compradores", clase: "primaria" },
  { id: "C-05", nombre: "Amenaza de productos sustitutos", clase: "primaria" },
  { id: "C-06", nombre: "Rivalidad entre competidores existentes", clase: "primaria" },
  { id: "C-07", nombre: "Diferenciacion de productos y servicios", clase: "primaria" },
  { id: "C-08", nombre: "Participacion de mercado de los principales actores", clase: "primaria" },
  { id: "C-09", nombre: "Estrategias de precios del sector", clase: "primaria" },
  { id: "C-10", nombre: "Acceso a canales de distribucion", clase: "primaria" },
  { id: "C-11", nombre: "Alianzas estrategicas y joint ventures", clase: "secundaria" },
  { id: "C-12", nombre: "Integracion vertical en el sector", clase: "secundaria" },
  { id: "C-13", nombre: "Economias de escala de los competidores", clase: "secundaria" },
  { id: "C-14", nombre: "Reputacion y posicionamiento de marca de competidores", clase: "secundaria" },
  { id: "C-15", nombre: "Capacidad de innovacion de la competencia", clase: "secundaria" },
  { id: "C-16", nombre: "Presencia internacional de los competidores", clase: "secundaria" },
  { id: "C-17", nombre: "Benchmarking sectorial", clase: "secundaria" },
  { id: "C-18", nombre: "Certificaciones y estandares del sector", clase: "secundaria" },
  { id: "C-19", nombre: "Clusteres industriales", clase: "secundaria" },
  { id: "C-20", nombre: "Competencia de productos importados", clase: "secundaria" },
  { id: "C-21", nombre: "Competencia desleal", clase: "secundaria" },
  { id: "C-22", nombre: "Vigilancia competitiva", clase: "secundaria" },
];

// ---------------------------------------------------------------------------
// EXPORT: All variables consolidated
// ---------------------------------------------------------------------------

export const PESTEC_VARIABLES: PestecVariableData[] = [
  {
    key: "politico", letra: "P", nombre: "Politico",
    descripcion: "Fuerzas politicas, gubernamentales y legales que afectan al sector",
    color: "#185FA5", colorLight: "transparent", icono: "landmark",
    subVariables: P_VARS,
  },
  {
    key: "economico", letra: "E", nombre: "Economico",
    descripcion: "Variables macroeconomicas, financieras y de mercado",
    color: "#059669", colorLight: "transparent", icono: "trending-up",
    subVariables: E_VARS,
  },
  {
    key: "social", letra: "S", nombre: "Social",
    descripcion: "Factores demograficos, culturales y de estilo de vida",
    color: "#D97706", colorLight: "transparent", icono: "users",
    subVariables: S_VARS,
  },
  {
    key: "tecnologico", letra: "T", nombre: "Tecnologico",
    descripcion: "Innovacion, digitalizacion e infraestructura tecnologica",
    color: "#7C3AED", colorLight: "transparent", icono: "cpu",
    subVariables: T_VARS,
  },
  {
    key: "ecologico", letra: "Ec", nombre: "Ecologico",
    descripcion: "Medio ambiente, sostenibilidad y regulacion ambiental",
    color: "#0D9488", colorLight: "transparent", icono: "leaf",
    subVariables: Ec_VARS,
  },
  {
    key: "competitivo", letra: "C", nombre: "Competitivo",
    descripcion: "Estructura competitiva del sector, fuerzas de Porter",
    color: "#BE185D", colorLight: "transparent", icono: "swords",
    subVariables: C_VARS,
  },
];

export const PESTEC_EVIDENCE_CHIPS = COMMON_CHIPS;

// Color config for O/A type — dark theme: sin fondo claro, solo borde + texto
export const OA_CONFIG = {
  O: { label: "Oportunidad", bg: "transparent", border: "#7aa8e0", text: "#9ec2ec" },
  A: { label: "Amenaza", bg: "transparent", border: "#e08a8a", text: "#ee9c9c" },
} as const;
