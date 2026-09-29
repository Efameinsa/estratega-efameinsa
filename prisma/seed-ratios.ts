import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

if (typeof globalThis.WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const YEAR = 2024;

interface MasterRow {
  key: string;
  area: string;
  category: string;
  name: string;
  formula?: string;
  unit: string;
  higherIsBetter: boolean;
  defaultActive: boolean;
  description?: string;
  sortOrder: number;
}

// ───────────────────────────────────────────────────────────────────────
// AREA F — FINANZAS (15 ratios)
// ───────────────────────────────────────────────────────────────────────
const F_RATIOS: MasterRow[] = [
  { key: "F.LIQ.CURRENT_RATIO", area: "F", category: "Liquidez", name: "Razon corriente", formula: "Activo corriente / Pasivo corriente", unit: "veces", higherIsBetter: true, defaultActive: true, sortOrder: 10 },
  { key: "F.LIQ.QUICK_RATIO", area: "F", category: "Liquidez", name: "Prueba acida", formula: "(AC - Inventarios) / PC", unit: "veces", higherIsBetter: true, defaultActive: true, sortOrder: 20 },
  { key: "F.LIQ.WORKING_CAPITAL", area: "F", category: "Liquidez", name: "Capital de trabajo", formula: "AC - PC", unit: "USD", higherIsBetter: true, defaultActive: false, sortOrder: 30 },
  { key: "F.END.DEBT_TO_ASSETS", area: "F", category: "Endeudamiento", name: "Deuda / Activo total", formula: "Pasivo total / Activo total", unit: "ratio", higherIsBetter: false, defaultActive: true, sortOrder: 110 },
  { key: "F.END.DEBT_TO_EQUITY", area: "F", category: "Endeudamiento", name: "Deuda / Patrimonio", formula: "Pasivo total / Patrimonio", unit: "ratio", higherIsBetter: false, defaultActive: true, sortOrder: 120 },
  { key: "F.END.INTEREST_COVERAGE", area: "F", category: "Endeudamiento", name: "Cobertura de intereses", formula: "EBIT / Gastos financieros", unit: "veces", higherIsBetter: true, defaultActive: false, sortOrder: 130 },
  { key: "F.REN.GROSS_MARGIN", area: "F", category: "Rentabilidad", name: "Margen bruto", formula: "Utilidad bruta / Ventas", unit: "%", higherIsBetter: true, defaultActive: true, sortOrder: 210 },
  { key: "F.REN.OPERATING_MARGIN", area: "F", category: "Rentabilidad", name: "Margen operativo", formula: "EBIT / Ventas", unit: "%", higherIsBetter: true, defaultActive: true, sortOrder: 220 },
  { key: "F.REN.NET_MARGIN", area: "F", category: "Rentabilidad", name: "Margen neto", formula: "Utilidad neta / Ventas", unit: "%", higherIsBetter: true, defaultActive: true, sortOrder: 230 },
  { key: "F.REN.EBITDA_MARGIN", area: "F", category: "Rentabilidad", name: "Margen EBITDA", formula: "EBITDA / Ventas", unit: "%", higherIsBetter: true, defaultActive: false, sortOrder: 240 },
  { key: "F.REN.ROA", area: "F", category: "Rentabilidad", name: "ROA", formula: "Utilidad neta / Activo total", unit: "%", higherIsBetter: true, defaultActive: true, sortOrder: 250 },
  { key: "F.REN.ROE", area: "F", category: "Rentabilidad", name: "ROE", formula: "Utilidad neta / Patrimonio", unit: "%", higherIsBetter: true, defaultActive: true, sortOrder: 260 },
  { key: "F.ACT.INV_TURNOVER", area: "F", category: "Actividad", name: "Rotacion de inventarios", formula: "Costo de ventas / Inventario promedio", unit: "veces", higherIsBetter: true, defaultActive: false, sortOrder: 310 },
  { key: "F.ACT.DSO", area: "F", category: "Actividad", name: "Dias de cobranza (DSO)", formula: "(Cuentas por cobrar / Ventas) x 365", unit: "dias", higherIsBetter: false, defaultActive: false, sortOrder: 320 },
  { key: "F.ACT.ASSET_TURNOVER", area: "F", category: "Actividad", name: "Rotacion de activos", formula: "Ventas / Activo total", unit: "veces", higherIsBetter: true, defaultActive: false, sortOrder: 330 },
];

// ───────────────────────────────────────────────────────────────────────
// AREA A — ADMINISTRACION Y GERENCIA (5 ratios, mayormente cualitativo)
// ───────────────────────────────────────────────────────────────────────
const A_RATIOS: MasterRow[] = [
  { key: "A.GOV.LAYERS", area: "A", category: "Estructura", name: "Capas jerarquicas", formula: "Numero de niveles desde CEO hasta operario", unit: "niveles", higherIsBetter: false, defaultActive: true, sortOrder: 10 },
  { key: "A.GOV.SPAN", area: "A", category: "Estructura", name: "Span of control promedio", formula: "Subordinados / jefe (optimo 5-9)", unit: "personas", higherIsBetter: true, defaultActive: true, sortOrder: 20 },
  { key: "A.GOV.SENIORITY", area: "A", category: "Liderazgo", name: "Antiguedad alta gerencia", formula: "Promedio de años de los directivos", unit: "años", higherIsBetter: true, defaultActive: false, sortOrder: 110 },
  { key: "A.GOV.EDUCATION", area: "A", category: "Liderazgo", name: "% directivos con educacion superior", formula: "Directivos con grado superior / total directivos", unit: "%", higherIsBetter: true, defaultActive: true, sortOrder: 120 },
  { key: "A.GOV.EXEC_TURNOVER", area: "A", category: "Liderazgo", name: "Rotacion de la alta gerencia", formula: "Salidas anuales / total directivos", unit: "%", higherIsBetter: false, defaultActive: false, sortOrder: 130 },
];

// ───────────────────────────────────────────────────────────────────────
// AREA M — MARKETING Y VENTAS (10 ratios)
// ───────────────────────────────────────────────────────────────────────
const M_RATIOS: MasterRow[] = [
  { key: "M.MKT.MARKET_SHARE", area: "M", category: "Posicionamiento", name: "Participacion de mercado", formula: "Ventas propias / Ventas totales del mercado", unit: "%", higherIsBetter: true, defaultActive: true, sortOrder: 10 },
  { key: "M.MKT.SOV", area: "M", category: "Posicionamiento", name: "Share of voice en medios", formula: "Tu inversion en medios / inversion total del sector", unit: "%", higherIsBetter: true, defaultActive: false, sortOrder: 20 },
  { key: "M.MKT.SALES_GROWTH", area: "M", category: "Crecimiento", name: "Crecimiento de ventas anual", formula: "(Ventas año actual - año anterior) / año anterior", unit: "%", higherIsBetter: true, defaultActive: true, sortOrder: 110 },
  { key: "M.MKT.CAC", area: "M", category: "Cliente", name: "CAC - Costo de adquisicion", formula: "Inversion comercial+marketing / clientes nuevos", unit: "USD", higherIsBetter: false, defaultActive: true, sortOrder: 210 },
  { key: "M.MKT.LTV", area: "M", category: "Cliente", name: "LTV - Valor de vida del cliente", formula: "Margen promedio x años promedio de retencion", unit: "USD", higherIsBetter: true, defaultActive: true, sortOrder: 220 },
  { key: "M.MKT.LTV_CAC", area: "M", category: "Cliente", name: "Ratio LTV / CAC", formula: "LTV / CAC (optimo > 3)", unit: "veces", higherIsBetter: true, defaultActive: true, sortOrder: 230 },
  { key: "M.MKT.NPS", area: "M", category: "Cliente", name: "NPS - Net Promoter Score", formula: "% promotores - % detractores", unit: "puntos", higherIsBetter: true, defaultActive: true, sortOrder: 240 },
  { key: "M.MKT.RETENTION", area: "M", category: "Cliente", name: "Tasa de retencion de clientes", formula: "Clientes que repiten / clientes totales", unit: "%", higherIsBetter: true, defaultActive: true, sortOrder: 250 },
  { key: "M.MKT.FUNNEL_CONV", area: "M", category: "Comercial", name: "Conversion del funnel comercial", formula: "Cierres / oportunidades calificadas", unit: "%", higherIsBetter: true, defaultActive: false, sortOrder: 310 },
  { key: "M.MKT.SALES_COVERAGE", area: "M", category: "Comercial", name: "Cobertura de la fuerza de ventas", formula: "Clientes/cuentas atendidos / mercado potencial", unit: "%", higherIsBetter: true, defaultActive: false, sortOrder: 320 },
];

// ───────────────────────────────────────────────────────────────────────
// AREA O — OPERACIONES Y LOGISTICA (10 ratios)
// ───────────────────────────────────────────────────────────────────────
const O_RATIOS: MasterRow[] = [
  { key: "O.OPS.OEE", area: "O", category: "Productividad", name: "OEE - Eficiencia global del equipo", formula: "Disponibilidad x rendimiento x calidad (optimo > 85%)", unit: "%", higherIsBetter: true, defaultActive: true, sortOrder: 10 },
  { key: "O.OPS.PRODUCTIVITY", area: "O", category: "Productividad", name: "Productividad por empleado", formula: "Ventas / numero de empleados", unit: "USD", higherIsBetter: true, defaultActive: true, sortOrder: 20 },
  { key: "O.OPS.UNIT_COST", area: "O", category: "Costos", name: "Costo unitario de produccion", formula: "Costo total / unidades producidas", unit: "USD", higherIsBetter: false, defaultActive: false, sortOrder: 110 },
  { key: "O.OPS.DEFECT_RATE", area: "O", category: "Calidad", name: "Tasa de defectos / mermas", formula: "Unidades defectuosas / total producido", unit: "%", higherIsBetter: false, defaultActive: true, sortOrder: 210 },
  { key: "O.OPS.OTD", area: "O", category: "Calidad", name: "Cumplimiento de entregas a tiempo", formula: "Entregas a tiempo / total entregas (OTD)", unit: "%", higherIsBetter: true, defaultActive: true, sortOrder: 220 },
  { key: "O.OPS.LEAD_TIME", area: "O", category: "Tiempos", name: "Lead time promedio", formula: "Dias desde el pedido hasta entrega", unit: "dias", higherIsBetter: false, defaultActive: false, sortOrder: 310 },
  { key: "O.OPS.CAPACITY", area: "O", category: "Tiempos", name: "Utilizacion de capacidad instalada", formula: "Capacidad utilizada / capacidad total (optimo 70-90%)", unit: "%", higherIsBetter: true, defaultActive: true, sortOrder: 320 },
  { key: "O.OPS.INV_TURNOVER", area: "O", category: "Inventarios", name: "Rotacion de inventarios", formula: "Costo de ventas / inventario promedio", unit: "veces", higherIsBetter: true, defaultActive: true, sortOrder: 410 },
  { key: "O.OPS.DOI", area: "O", category: "Inventarios", name: "Dias de inventario (DOI)", formula: "365 / rotacion de inventarios", unit: "dias", higherIsBetter: false, defaultActive: false, sortOrder: 420 },
  { key: "O.OPS.LOG_COST", area: "O", category: "Inventarios", name: "Costo logistico / ventas", formula: "Costo logistico total / ventas", unit: "%", higherIsBetter: false, defaultActive: false, sortOrder: 430 },
];

// ───────────────────────────────────────────────────────────────────────
// AREA H — RECURSOS HUMANOS (9 ratios)
// ───────────────────────────────────────────────────────────────────────
const H_RATIOS: MasterRow[] = [
  { key: "H.HR.TURNOVER", area: "H", category: "Talento", name: "Rotacion de personal anual", formula: "Salidas anuales / planilla promedio", unit: "%", higherIsBetter: false, defaultActive: true, sortOrder: 10 },
  { key: "H.HR.ABSENTEEISM", area: "H", category: "Talento", name: "Ausentismo", formula: "Horas ausentes / horas trabajadas", unit: "%", higherIsBetter: false, defaultActive: true, sortOrder: 20 },
  { key: "H.HR.TIME_TO_FILL", area: "H", category: "Talento", name: "Tiempo promedio para cubrir vacantes", formula: "Dias promedio desde apertura hasta cierre", unit: "dias", higherIsBetter: false, defaultActive: false, sortOrder: 30 },
  { key: "H.HR.SPAN", area: "H", category: "Talento", name: "Empleados por jefe", formula: "Total empleados / total jefes (optimo 5-9)", unit: "personas", higherIsBetter: true, defaultActive: false, sortOrder: 40 },
  { key: "H.HR.PAYROLL_RATIO", area: "H", category: "Compensacion", name: "Costo de planilla / ventas", formula: "Costo total de planilla / ventas", unit: "%", higherIsBetter: false, defaultActive: false, sortOrder: 110 },
  { key: "H.HR.TRAINING_HOURS", area: "H", category: "Desarrollo", name: "Horas de capacitacion per capita", formula: "Total horas de capacitacion / numero de empleados", unit: "horas", higherIsBetter: true, defaultActive: true, sortOrder: 210 },
  { key: "H.HR.CLIMATE", area: "H", category: "Cultura", name: "Indice de clima laboral", formula: "Encuesta interna escala 0-100", unit: "puntos", higherIsBetter: true, defaultActive: true, sortOrder: 310 },
  { key: "H.HR.ENPS", area: "H", category: "Cultura", name: "eNPS - Employee NPS", formula: "% promotores empleados - % detractores", unit: "puntos", higherIsBetter: true, defaultActive: true, sortOrder: 320 },
  { key: "H.HR.ACCIDENTS", area: "H", category: "Seguridad", name: "Accidentes laborales por mil trabajadores", formula: "Accidentes anuales / planilla promedio x 1000", unit: "casos", higherIsBetter: false, defaultActive: false, sortOrder: 410 },
];

// ───────────────────────────────────────────────────────────────────────
// AREA I — SISTEMAS DE INFORMACION (8 ratios)
// ───────────────────────────────────────────────────────────────────────
const I_RATIOS: MasterRow[] = [
  { key: "I.SYS.AUTOMATION", area: "I", category: "Sistemas", name: "% de procesos automatizados", formula: "Procesos con sistema / procesos totales", unit: "%", higherIsBetter: true, defaultActive: true, sortOrder: 10 },
  { key: "I.SYS.UPTIME", area: "I", category: "Infraestructura", name: "Disponibilidad de sistemas criticos (uptime)", formula: "Tiempo operativo / tiempo total (optimo > 99%)", unit: "%", higherIsBetter: true, defaultActive: true, sortOrder: 110 },
  { key: "I.SYS.MTTR", area: "I", category: "Infraestructura", name: "Tiempo promedio de resolucion de incidentes", formula: "Suma de horas resolucion / numero de incidentes", unit: "horas", higherIsBetter: false, defaultActive: false, sortOrder: 120 },
  { key: "I.SYS.CYBERSEC", area: "I", category: "Infraestructura", name: "Cobertura de ciberseguridad", formula: "Sistemas con proteccion / total sistemas", unit: "%", higherIsBetter: true, defaultActive: true, sortOrder: 130 },
  { key: "I.SYS.REAL_TIME", area: "I", category: "Datos", name: "% empleados con acceso a info en tiempo real", formula: "Empleados con acceso / total empleados", unit: "%", higherIsBetter: true, defaultActive: false, sortOrder: 210 },
  { key: "I.SYS.MATURITY", area: "I", category: "Datos", name: "Madurez digital", formula: "Auto-evaluacion escala 1-5", unit: "puntos", higherIsBetter: true, defaultActive: true, sortOrder: 220 },
  { key: "I.SYS.DATA_DRIVEN", area: "I", category: "Datos", name: "% decisiones basadas en datos", formula: "Decisiones con respaldo de data / total decisiones clave", unit: "%", higherIsBetter: true, defaultActive: false, sortOrder: 230 },
  { key: "I.SYS.IT_COST_RATIO", area: "I", category: "Costos", name: "Costo TI / ventas", formula: "Gasto total en TI / ventas anuales", unit: "%", higherIsBetter: true, defaultActive: false, sortOrder: 310 },
];

// ───────────────────────────────────────────────────────────────────────
// AREA T — TECNOLOGIA, I+D (8 ratios)
// ───────────────────────────────────────────────────────────────────────
const T_RATIOS: MasterRow[] = [
  { key: "T.RD.RD_RATIO", area: "T", category: "Inversion", name: "Gasto en I+D / ventas", formula: "Inversion I+D total / ventas anuales", unit: "%", higherIsBetter: true, defaultActive: true, sortOrder: 10 },
  { key: "T.RD.CAPEX_TECH", area: "T", category: "Inversion", name: "Inversion en CAPEX tecnologico / ventas", formula: "CAPEX en tecnologia / ventas anuales", unit: "%", higherIsBetter: true, defaultActive: false, sortOrder: 20 },
  { key: "T.RD.NEW_PRODUCT_REV", area: "T", category: "Innovacion", name: "% ventas de productos lanzados ult. 3 años", formula: "Ventas de productos nuevos / ventas totales", unit: "%", higherIsBetter: true, defaultActive: true, sortOrder: 110 },
  { key: "T.RD.TIME_TO_MARKET", area: "T", category: "Innovacion", name: "Time-to-market promedio", formula: "Meses desde concepto hasta lanzamiento", unit: "meses", higherIsBetter: false, defaultActive: false, sortOrder: 120 },
  { key: "T.RD.PATENTS", area: "T", category: "Propiedad", name: "Numero de patentes vigentes", formula: "Conteo de patentes activas", unit: "patentes", higherIsBetter: true, defaultActive: false, sortOrder: 210 },
  { key: "T.RD.RD_HEADCOUNT", area: "T", category: "Capacidad", name: "Personal dedicado a I+D / total empleados", formula: "Empleados de I+D / total empleados", unit: "%", higherIsBetter: true, defaultActive: false, sortOrder: 310 },
  { key: "T.RD.TECH_ALLIANCES", area: "T", category: "Capacidad", name: "Alianzas tecnologicas activas", formula: "Conteo de convenios y partnerships tecnologicos", unit: "alianzas", higherIsBetter: true, defaultActive: false, sortOrder: 320 },
  { key: "T.RD.TECH_AGE", area: "T", category: "Adopcion", name: "Edad promedio de la tecnologia instalada", formula: "Promedio años desde la instalacion", unit: "años", higherIsBetter: false, defaultActive: true, sortOrder: 410 },
];

const ALL_RATIOS = [...F_RATIOS, ...A_RATIOS, ...M_RATIOS, ...O_RATIOS, ...H_RATIOS, ...I_RATIOS, ...T_RATIOS];

// ───────────────────────────────────────────────────────────────────────
// Promedios sectoriales — referencias 2024 (Damodaran NYU, INEI, SBS, gremios)
// Valores aproximados, marcar para verificacion anual
// ───────────────────────────────────────────────────────────────────────
interface SectorBenchmark {
  ratioKey: string;
  values: Record<string, number>;
}

const BENCHMARKS_2024: SectorBenchmark[] = [
  // F — FINANZAS
  { ratioKey: "F.LIQ.CURRENT_RATIO", values: { manufactura: 1.65, retail: 1.20, servicios: 1.40, tecnologia: 2.10 } },
  { ratioKey: "F.LIQ.QUICK_RATIO",   values: { manufactura: 1.05, retail: 0.55, servicios: 1.25, tecnologia: 1.90 } },
  { ratioKey: "F.END.DEBT_TO_ASSETS",   values: { manufactura: 0.55, retail: 0.65, servicios: 0.50, tecnologia: 0.40 } },
  { ratioKey: "F.END.DEBT_TO_EQUITY",   values: { manufactura: 1.20, retail: 1.85, servicios: 1.00, tecnologia: 0.65 } },
  { ratioKey: "F.END.INTEREST_COVERAGE",values: { manufactura: 4.5,  retail: 3.8,  servicios: 6.0,  tecnologia: 12.0 } },
  { ratioKey: "F.REN.GROSS_MARGIN",     values: { manufactura: 28.0, retail: 26.0, servicios: 42.0, tecnologia: 60.0 } },
  { ratioKey: "F.REN.OPERATING_MARGIN", values: { manufactura: 9.5,  retail: 5.5,  servicios: 12.0, tecnologia: 22.0 } },
  { ratioKey: "F.REN.NET_MARGIN",       values: { manufactura: 6.2,  retail: 3.2,  servicios: 9.5,  tecnologia: 16.5 } },
  { ratioKey: "F.REN.EBITDA_MARGIN",    values: { manufactura: 13.0, retail: 8.5,  servicios: 16.0, tecnologia: 28.0 } },
  { ratioKey: "F.REN.ROA",              values: { manufactura: 5.5,  retail: 7.0,  servicios: 8.0,  tecnologia: 11.0 } },
  { ratioKey: "F.REN.ROE",              values: { manufactura: 12.0, retail: 15.5, servicios: 14.0, tecnologia: 18.5 } },
  { ratioKey: "F.ACT.INV_TURNOVER",     values: { manufactura: 6.0,  retail: 8.5,  servicios: 0,    tecnologia: 12.0 } },
  { ratioKey: "F.ACT.DSO",              values: { manufactura: 55,   retail: 18,   servicios: 45,   tecnologia: 60 } },
  { ratioKey: "F.ACT.ASSET_TURNOVER",   values: { manufactura: 1.10, retail: 2.20, servicios: 0.95, tecnologia: 0.75 } },

  // A — ADMINISTRACION
  { ratioKey: "A.GOV.LAYERS",         values: { manufactura: 5,   retail: 4,   servicios: 4,   tecnologia: 4 } },
  { ratioKey: "A.GOV.SPAN",           values: { manufactura: 7,   retail: 8,   servicios: 7,   tecnologia: 7 } },
  { ratioKey: "A.GOV.SENIORITY",      values: { manufactura: 8,   retail: 6,   servicios: 7,   tecnologia: 5 } },
  { ratioKey: "A.GOV.EDUCATION",      values: { manufactura: 75,  retail: 70,  servicios: 85,  tecnologia: 92 } },
  { ratioKey: "A.GOV.EXEC_TURNOVER",  values: { manufactura: 8,   retail: 12,  servicios: 9,   tecnologia: 14 } },

  // M — MARKETING
  { ratioKey: "M.MKT.MARKET_SHARE",   values: { manufactura: 12,  retail: 10,  servicios: 8,   tecnologia: 6 } },
  { ratioKey: "M.MKT.SOV",            values: { manufactura: 10,  retail: 12,  servicios: 9,   tecnologia: 8 } },
  { ratioKey: "M.MKT.SALES_GROWTH",   values: { manufactura: 6,   retail: 8,   servicios: 10,  tecnologia: 18 } },
  { ratioKey: "M.MKT.CAC",            values: { manufactura: 250, retail: 30,  servicios: 180, tecnologia: 320 } },
  { ratioKey: "M.MKT.LTV",            values: { manufactura: 1500,retail: 400, servicios: 900, tecnologia: 2200 } },
  { ratioKey: "M.MKT.LTV_CAC",        values: { manufactura: 6,   retail: 13,  servicios: 5,   tecnologia: 7 } },
  { ratioKey: "M.MKT.NPS",            values: { manufactura: 25,  retail: 30,  servicios: 35,  tecnologia: 42 } },
  { ratioKey: "M.MKT.RETENTION",      values: { manufactura: 75,  retail: 60,  servicios: 80,  tecnologia: 88 } },
  { ratioKey: "M.MKT.FUNNEL_CONV",    values: { manufactura: 18,  retail: 25,  servicios: 22,  tecnologia: 12 } },
  { ratioKey: "M.MKT.SALES_COVERAGE", values: { manufactura: 70,  retail: 85,  servicios: 65,  tecnologia: 55 } },

  // O — OPERACIONES
  { ratioKey: "O.OPS.OEE",          values: { manufactura: 75,    retail: 0,     servicios: 0,    tecnologia: 0 } },
  { ratioKey: "O.OPS.PRODUCTIVITY", values: { manufactura: 95000, retail: 85000, servicios: 110000, tecnologia: 220000 } },
  { ratioKey: "O.OPS.UNIT_COST",    values: { manufactura: 35,    retail: 0,     servicios: 0,    tecnologia: 0 } },
  { ratioKey: "O.OPS.DEFECT_RATE",  values: { manufactura: 2.5,   retail: 1.0,   servicios: 0.8,  tecnologia: 0.5 } },
  { ratioKey: "O.OPS.OTD",          values: { manufactura: 92,    retail: 95,    servicios: 90,   tecnologia: 95 } },
  { ratioKey: "O.OPS.LEAD_TIME",    values: { manufactura: 18,    retail: 5,     servicios: 7,    tecnologia: 14 } },
  { ratioKey: "O.OPS.CAPACITY",     values: { manufactura: 80,    retail: 85,    servicios: 78,   tecnologia: 70 } },
  { ratioKey: "O.OPS.INV_TURNOVER", values: { manufactura: 6.0,   retail: 8.5,   servicios: 0,    tecnologia: 12.0 } },
  { ratioKey: "O.OPS.DOI",          values: { manufactura: 60,    retail: 42,    servicios: 0,    tecnologia: 30 } },
  { ratioKey: "O.OPS.LOG_COST",     values: { manufactura: 8,     retail: 11,    servicios: 5,    tecnologia: 4 } },

  // H — RRHH
  { ratioKey: "H.HR.TURNOVER",        values: { manufactura: 12, retail: 25, servicios: 15, tecnologia: 18 } },
  { ratioKey: "H.HR.ABSENTEEISM",     values: { manufactura: 4.0,retail: 5.5,servicios: 3.5,tecnologia: 2.5 } },
  { ratioKey: "H.HR.TIME_TO_FILL",    values: { manufactura: 35, retail: 25, servicios: 40, tecnologia: 50 } },
  { ratioKey: "H.HR.SPAN",            values: { manufactura: 8,  retail: 10, servicios: 7,  tecnologia: 6 } },
  { ratioKey: "H.HR.PAYROLL_RATIO",   values: { manufactura: 18, retail: 14, servicios: 35, tecnologia: 45 } },
  { ratioKey: "H.HR.TRAINING_HOURS",  values: { manufactura: 24, retail: 18, servicios: 32, tecnologia: 48 } },
  { ratioKey: "H.HR.CLIMATE",         values: { manufactura: 70, retail: 65, servicios: 72, tecnologia: 78 } },
  { ratioKey: "H.HR.ENPS",            values: { manufactura: 15, retail: 10, servicios: 22, tecnologia: 30 } },
  { ratioKey: "H.HR.ACCIDENTS",       values: { manufactura: 18, retail: 6,  servicios: 4,  tecnologia: 1 } },

  // I — SISTEMAS DE INFO
  { ratioKey: "I.SYS.AUTOMATION",     values: { manufactura: 55, retail: 60, servicios: 65, tecnologia: 85 } },
  { ratioKey: "I.SYS.UPTIME",         values: { manufactura: 99.0, retail: 99.5, servicios: 99.7, tecnologia: 99.9 } },
  { ratioKey: "I.SYS.MTTR",           values: { manufactura: 4,  retail: 3,  servicios: 2,  tecnologia: 1 } },
  { ratioKey: "I.SYS.CYBERSEC",       values: { manufactura: 60, retail: 70, servicios: 75, tecnologia: 90 } },
  { ratioKey: "I.SYS.REAL_TIME",      values: { manufactura: 50, retail: 60, servicios: 70, tecnologia: 90 } },
  { ratioKey: "I.SYS.MATURITY",       values: { manufactura: 2.8, retail: 3.0, servicios: 3.4, tecnologia: 4.2 } },
  { ratioKey: "I.SYS.DATA_DRIVEN",    values: { manufactura: 45, retail: 55, servicios: 60, tecnologia: 80 } },
  { ratioKey: "I.SYS.IT_COST_RATIO",  values: { manufactura: 2.5, retail: 2.0, servicios: 4.5, tecnologia: 12.0 } },

  // T — TECNOLOGIA / I+D
  { ratioKey: "T.RD.RD_RATIO",          values: { manufactura: 2.5, retail: 0.5, servicios: 1.5, tecnologia: 12.0 } },
  { ratioKey: "T.RD.CAPEX_TECH",        values: { manufactura: 4,   retail: 2,   servicios: 3,   tecnologia: 8 } },
  { ratioKey: "T.RD.NEW_PRODUCT_REV",   values: { manufactura: 18,  retail: 25,  servicios: 22,  tecnologia: 40 } },
  { ratioKey: "T.RD.TIME_TO_MARKET",    values: { manufactura: 18,  retail: 8,   servicios: 6,   tecnologia: 9 } },
  { ratioKey: "T.RD.PATENTS",           values: { manufactura: 8,   retail: 0,   servicios: 2,   tecnologia: 25 } },
  { ratioKey: "T.RD.RD_HEADCOUNT",      values: { manufactura: 3,   retail: 1,   servicios: 5,   tecnologia: 22 } },
  { ratioKey: "T.RD.TECH_ALLIANCES",    values: { manufactura: 3,   retail: 2,   servicios: 4,   tecnologia: 8 } },
  { ratioKey: "T.RD.TECH_AGE",          values: { manufactura: 7,   retail: 4,   servicios: 3,   tecnologia: 2 } },
];

const SOURCE = "Damodaran NYU + SBS Peru + INEI + gremios sectoriales (2024) — verificar con fuente actualizada";

async function main() {
  console.log("Seeding RatioMaster (7 areas)...");
  for (const r of ALL_RATIOS) {
    await db.ratioMaster.upsert({
      where: { key: r.key },
      update: {
        area: r.area, category: r.category, name: r.name,
        formula: r.formula, unit: r.unit, higherIsBetter: r.higherIsBetter,
        defaultActive: r.defaultActive, description: r.description, sortOrder: r.sortOrder,
      },
      create: r,
    });
  }
  console.log(`✓ ${ALL_RATIOS.length} indicadores maestros cargados`);

  console.log("Seeding RatioIndustria (4 sectores)...");
  let count = 0;
  for (const b of BENCHMARKS_2024) {
    for (const [sector, value] of Object.entries(b.values)) {
      if (value === 0) continue; // sectores donde no aplica
      await db.ratioIndustria.upsert({
        where: { ratioKey_sector_year: { ratioKey: b.ratioKey, sector, year: YEAR } },
        update: { value, source: SOURCE },
        create: { ratioKey: b.ratioKey, sector, year: YEAR, value, source: SOURCE },
      });
      count++;
    }
  }
  console.log(`✓ ${count} valores sectoriales`);

  console.log("Listo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
