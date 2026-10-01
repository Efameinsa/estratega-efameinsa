// Plan estratégico real de Efameinsa (M1 → M5) con el diagnóstico digital y comercial
// del 28 y 29-09-2026. Toma de plantilla scripts/seed-full-example.ts.
//
// Uso: ALLOW_REMOTE_SEED=1 DATABASE_URL=<url> npx tsx scripts/seed-efameinsa.ts
//
// Es idempotente: borra el ciclo y los proyectos de org-efameinsa y los vuelve a crear.
// No crea usuarios: todo queda a nombre del propietario de la organización.
//
// Fuentes de los números: CRM (ventas 2021-2026, leads de septiembre), GA4, Search Console,
// Google Ads (información de subastas), Biblioteca de anuncios de Meta, Semrush/Similarweb
// (28-09) y revisión pública de webs, redes y Google Maps de cada competidor (29-09).
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { computeVector, PEYEA_CATALOG } from "../src/lib/peyea-catalog";
import { COMPETITIVE_CRITERIA, ATTRACTIVENESS_FACTORS } from "../src/lib/competitive-analysis-data";
import { AMOFHIT_EVALUATION_DATA } from "../src/lib/amofhit-evaluation-data";
import { ALERT_TYPES } from "../src/lib/alerts-catalog";
import { PRINCIPLES as ETHICS_PRINCIPLES } from "../src/lib/ethics-catalog";

const url = process.env.DATABASE_URL ?? "";
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
if (!isLocal && process.env.ALLOW_REMOTE_SEED !== "1") {
  console.error("Base remota: define ALLOW_REMOTE_SEED=1 para confirmar.");
  process.exit(1);
}
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const ORG_ID = "org-efameinsa";
const CYCLE_ID = "cycle-efameinsa-2026";
const OWNER_EMAIL = "corporacionefameinsa.sa@gmail.com";
const YEAR_START = 2025; // año base del diagnóstico; el horizonte del plan es 2026-2030
const YEAR_END = 2030;
const day = (s: string) => new Date(`${s}T12:00:00Z`);
const J = (v: unknown) => JSON.stringify(v);
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const dec = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Código de OCP igual al que calcula la app (src/server/routers/ocp.ts)
const ocpCode = (n: number, year: number) => `OCP${n}.${Math.max(1, year - YEAR_START + 1)}`;

async function main() {
  // ───────────────────────────────────────────── Organización
  const org = await db.organization.update({
    where: { id: ORG_ID },
    data: { name: "Efameinsa", sector: "Equipos y servicio para lavandería industrial", type: "privada", color: "#8B1510" },
  });
  const owner = await db.user.findUniqueOrThrow({ where: { email: OWNER_EMAIL } });
  // Las presentaciones cuelgan del ciclo: se guardan y se vuelven a crear al final.
  const keptPresentations = await db.presentation.findMany({ where: { cycleId: CYCLE_ID } });
  console.log("Limpiando el plan anterior…");
  await db.project.deleteMany({ where: { orgId: ORG_ID } });
  await db.strategicCycle.deleteMany({ where: { organizationId: ORG_ID } });
  const O = { organizationId: org.id, cycleId: CYCLE_ID };
  await db.strategicCycle.create({
    data: { id: CYCLE_ID, organizationId: org.id, name: "Plan Estratégico 2026-2030", yearStart: YEAR_START, yearEnd: YEAR_END, status: "IN_PROGRESS" },
  });

  // ───────────────────────────────────────────── M1 Identidad
  // Misión y visión: las oficiales de la web (nosotros.json), precisadas con el alcance del negocio.
  await db.vision.create({
    data: {
      ...O, isActive: true, timeHorizon: 2030,
      text: "Al 2030, ser la compañía de lavandería industrial elegida en el Perú por su innovación y por los resultados que entrega en cada proyecto: ingeniería certificada, equipos en stock y servicio técnico propio para que la operación de nuestros clientes nunca se detenga, en Lima y en todas las regiones.",
    },
  });
  await db.mission.create({
    data: {
      ...O, isActive: true,
      text: "Brindamos soluciones confiables y eficientes de lavandería industrial y comercial —diseño, fabricación, representación oficial de marcas líderes, instalación y servicio técnico propio—, asesorando a hoteles, clínicas y hospitales, minería, industria y lavanderías desde la concepción hasta la realización de cada proyecto.",
    },
  });
  const VALUES = [
    ["Ingeniería propia", "Diseñamos, fabricamos e instalamos con planta propia en Huachipa desde el año 2000; los equipos que representamos cuentan con certificación ISO 9001 e ISO 14001.", "Entregamos plano de preinstalación, memoria de cálculo y protocolo de pruebas en cada proyecto."],
    ["Lo tenemos hoy", "Mantenemos stock permanente y respondemos rápido, porque una máquina detenida le cuesta al cliente.", "Respondemos en menos de una hora laboral y confirmamos el stock antes de cotizar."],
    ["No lo dejamos solo", "Servicio técnico propio, no tercerizado, durante toda la vida del equipo.", "Preventivo cada 4 meses, informe con foto, fecha y hora, y repuestos originales."],
    ["Se lo mostramos", "Preferimos mostrar antes que prometer: showroom, video, 3D y números de costo-beneficio.", "Invitamos al cliente a ver el equipo funcionando y le damos el cálculo por escrito."],
    ["Datos antes que opiniones", "Decidimos con lo que se mide: cada contacto, cotización y venta queda registrado.", "Todo lead entra al CRM con su origen; las campañas se evalúan por oportunidad cotizada."],
  ];
  const values = [];
  for (const [i, [name, description, behaviors]] of VALUES.entries()) {
    values.push(await db.value.create({ data: { ...O, name, description, behaviors, sortOrder: i } }));
  }
  const ETHICS = [
    ["Clientes", "Cotizamos con precios coherentes con el historial del cliente y solo prometemos stock y plazos que podemos cumplir."],
    ["Colaboradores", "Cada comercial es evaluado con datos del CRM, con las mismas reglas para todos y derecho a revisar sus números."],
    ["Marcas representadas", "Respetamos los acuerdos de representación y la política de precios de cada fabricante."],
    ["Estado y licitaciones", "Participamos en compras públicas con documentación veraz, sin dádivas ni conflictos de interés."],
    ["Medio ambiente", "Recomendamos el equipo que consume menos agua y energía para el volumen real del cliente."],
    ["Comunicación", "Publicamos casos, fotos y reseñas de clientes solo con su autorización, y nunca pagamos por reseñas."],
  ];
  for (const [i, [category, description]] of ETHICS.entries()) await db.ethicsCode.create({ data: { ...O, category, description, sortOrder: i } });
  const INTERESTS = [
    ["Crecer en los sectores industriales (salud, minería, hotelería, industria) frente a lo semi-industrial y de hogar", "vital", "Alliance (UniMac), Girbau, Primus, Milnor", "Tiendas por departamento", "Serfac, Novotec, Novinsa"],
    ["Liderar el canal digital: ser la primera opción cuando el comprador busca, compara y cotiza en línea", "vital", "Google, Meta, LinkedIn", "Agencias", "Serfac en Google, Novotec y Novinsa en Meta, entrantes como Yamamoto"],
    ["Cubrir las regiones con la misma respuesta que en Lima (el 53 % de las ventas con departamento registrado es de provincias)", "importante", "Clientes mineros y hoteleros del sur y el centro", "Transportistas", "Distribuidores regionales"],
    ["Hacer crecer el ingreso recurrente de servicio técnico, preventivo y repuestos", "importante", "Clientes con parque instalado", "—", "Técnicos independientes"],
    ["Ganar compras públicas de salud con lavandería hospitalaria y barrera sanitaria", "importante", "EsSalud, MINSA, gobiernos regionales", "OSCE", "Competidores con precio bajo"],
    ["Posicionar la marca propia Efamein", "periférico", "Planta de Huachipa", "—", "Importadores de equipos chinos"],
  ];
  for (const [i, [description, intensity, allies, neutrals, adversaries]] of INTERESTS.entries()) {
    await db.interest.create({ data: { ...O, description, intensity, allies, neutrals, adversaries, sortOrder: i } });
  }
  const CARDINAL = [
    ["influencia_terceras_partes", "Las marcas representadas pesan en el mercado: LG compite en nuestras propias búsquedas (lg.com tiene 35-37 % de cuota en la campaña Comercial) y Alliance y LG pueden cofinanciar publicidad con fondos cooperativos."],
    ["lazos_pasados_presentes", "26 años de mercado y proyectos con INEN, EsSalud, Sheraton y Buenaventura sostienen la reputación: tenemos la ficha de Google con más reseñas del sector (4,2★, 38)."],
    ["contrabalance_intereses", "Crecer en digital sin subir el gasto total: gerencia pidió (28-09) repartir Google Ads hacia Industrial en lugar de aumentar la inversión."],
    ["conservacion_enemigos", "Serfac nos gana la subasta industrial y Novinsa y Novotec publican a diario: esa presión obliga a ordenar el marketing y a comunicar lo que solo nosotros tenemos."],
  ];
  for (const [type, description] of CARDINAL) await db.cardinalPrinciple.create({ data: { ...O, type, description } });

  // ───────────────────────────────────────────── M2 Diagnóstico externo
  // [variable, nombre del catálogo, tipo, impacto (1-20), calificación (1-4), hallazgo, evidencia]
  const PESTEC: [string, string, "O" | "A", number, number, string, string[]][] = [
    ["politico", "Presupuestos gubernamentales", "O", 9, 3, "Hospitales de EsSalud, MINSA y gobiernos regionales compran lavanderías hospitalarias; Efameinsa ya ejecutó INEN, EsSalud Pasco, Cusco, Abancay y Virgen de la Puerta.", ["Publicacion oficial", "Registro interno"]],
    ["politico", "Estabilidad politica", "A", 6, 2, "El año electoral 2026 retrasa decisiones de inversión y licitaciones.", ["Informe sectorial"]],
    ["politico", "Informalidad", "A", 6, 2, "Importadores sin servicio técnico y equipos de hogar vendidos como semi-industriales compiten solo por precio.", ["Observacion de mercado"]],
    ["economico", "Tipo de cambio", "A", 7, 3, "Los equipos se importan y se cotizan en US$; una subida del dólar encarece la reposición del stock.", ["Registro interno"]],
    ["economico", "PBI y tasa de crecimiento", "O", 8, 3, "Minería, hotelería y salud siguen invirtiendo en lavandería: las ventas del CRM de enero a septiembre de 2026 suman US$ 1,82 M frente a US$ 1,09 M en todo 2025.", ["Registro interno", "Dato estadistico"]],
    ["economico", "Acceso al credito", "O", 5, 1, "El leasing y el crédito facilitan la compra de equipos para lavanderías pequeñas; hoy no ofrecemos ninguna opción de financiamiento.", ["Observacion de mercado"]],
    ["social", "Habitos de consumo digital", "O", 10, 3, "El comprador investiga en Google, WhatsApp y asistentes de IA antes de cotizar: el 54 % de las visitas a la web llega desde el celular y la web es la vía de 133 ventas en 2026.", ["Dato estadistico", "Registro interno"]],
    ["social", "Distribucion geografica de la poblacion", "O", 7, 3, "Hay demanda fuerte en regiones: Cusco, Arequipa, Junín, Ica, Ucayali y Puno suman más ventas que Lima en 2026; las campañas de Meta Norte y Sur rinden igual que Lima.", ["Registro interno"]],
    ["social", "Acceso a salud publica", "O", 6, 3, "La barrera sanitaria es obligatoria en lavanderías hospitalarias: es una oferta técnica que pocos pueden documentar.", ["Publicacion oficial"]],
    ["tecnologico", "Inteligencia artificial y machine learning", "O", 6, 2, "Los asistentes de IA ya son puerta de entrada: Serfac tiene 19 páginas citadas por IA contra 12 nuestras.", ["Informe sectorial"]],
    ["tecnologico", "Realidad aumentada y virtual", "O", 5, 3, "Tenemos 62 equipos en 3D con realidad aumentada; ningún competidor lo ofrece, pero casi no se ve (3 visitantes del showroom 3D en 17 días).", ["Registro interno"]],
    ["tecnologico", "Adopcion de comercio electronico", "O", 6, 1, "Ningún competidor publica precios de lavadoras industriales; «precio lavadora industrial» nos encuentra en la posición 27.", ["Observacion de mercado", "Dato estadistico"]],
    ["tecnologico", "Big Data y analitica avanzada", "O", 6, 2, "Google y Meta pueden optimizar con cotizaciones y ventas reales del CRM (conversiones sin conexión); todavía no se envían.", ["Registro interno"]],
    ["ecologico", "Certificaciones ambientales", "O", 6, 3, "Minería y licitaciones exigen documentación técnica y equipos certificados: las marcas que representamos tienen ISO 9001 e ISO 14001, pero ningún competidor lo comunica.", ["Publicacion oficial"]],
    ["competitivo", "Rivalidad entre competidores existentes", "A", 10, 2, "Serfac aparece en el 69 % de las búsquedas de «lavadora industrial» (nosotros 48 %) y nos gana la posición el 71,5 % de las veces.", ["Dato estadistico"]],
    ["competitivo", "Barreras de entrada al sector", "A", 7, 2, "Entran competidores con presupuesto: Yamamoto (dominio de enero de 2026) ya tiene 18 % de cuota en la campaña Industrial, Novinsa 12 %, y Kingstar y fabricantes chinos anuncian directo.", ["Dato estadistico", "Observacion de mercado"]],
    ["competitivo", "Reputacion y posicionamiento de marca de competidores", "A", 7, 1, "Novotec tiene 27 anuncios activos en Meta y Novinsa publica casi a diario (727 posts en Instagram, YouTube activo); nosotros no publicamos desde junio.", ["Observacion de mercado"]],
    ["competitivo", "Poder de negociacion de proveedores", "A", 6, 2, "LG, nuestro proveedor, compite por las mismas búsquedas comerciales y el clic de la campaña Comercial pasó de S/ 1,84 a S/ 3,66 entre mayo y septiembre.", ["Dato estadistico"]],
  ];
  const pestecRows = [];
  for (const [i, [variable, description, type, impact, rating, hallazgo, chips]] of PESTEC.entries()) {
    pestecRows.push(
      await db.pestecFactor.create({
        data: { ...O, variable, description, type, impact, rating, hallazgo, subVarType: "primaria", evidenceChips: J(chips), confirmed: true, includeInMefe: true, sortOrder: i },
      }),
    );
  }
  const P = (name: string) => {
    const i = PESTEC.findIndex((p) => p[1] === name);
    if (i < 0) throw new Error(`Factor PESTEC no encontrado: ${name}`);
    return i;
  };

  // Porter: presión de cada fuerza sobre el sector (1-5)
  const porter = {
    rivalidad: { "riv-1": 4, "riv-2": 3, "riv-3": 2, "riv-4": 2, "riv-5": 3 },
    entrantes: { "ent-1": 3, "ent-2": 3, "ent-3": 4, "ent-4": 3, "ent-5": 2 },
    sustitutos: { "sus-1": 3, "sus-2": 3, "sus-3": 2, "sus-4": 2 },
    compradores: { "com-1": 3, "com-2": 3, "com-3": 4, "com-4": 4, "com-5": 2 },
    proveedores: { "prov-1": 4, "prov-2": 2, "prov-3": 4, "prov-4": 4, "prov-5": 4 },
  };
  const avg = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0) / Object.values(o).length;
  await db.porterAnalysis.create({
    data: {
      ...O,
      overallScore: round(Object.values(porter).map(avg).reduce((a, b) => a + b, 0) / 5),
      data: J({ forces: Object.fromEntries(Object.entries(porter).map(([k, values]) => [k, { values, saved: true }])) }),
    },
  });

  // MEFE: 10 oportunidades + 6 amenazas. Calificación: 4 = respondemos muy bien … 1 = mal.
  const MEFE: [string, "O" | "A", number, number, string][] = [
    ["Búsquedas genéricas sin dueño en orgánico: «lavadora industrial» posición 7,3, «precio lavadora industrial» 27, «secadoras industriales» 32", "O", 0.08, 2, "Habitos de consumo digital"],
    ["Meta genera conversaciones a menos de S/ 1 y oportunidades cotizadas a ~S/ 4 (Google: ~S/ 116)", "O", 0.09, 1, "Habitos de consumo digital"],
    ["Ningún competidor publica precios o rangos de lavadoras industriales", "O", 0.05, 1, "Adopcion de comercio electronico"],
    ["Reseñas y contenido flojos en todo el sector (máx. 38 reseñas; 2 a 9 reacciones por publicación)", "O", 0.05, 3, "Reputacion y posicionamiento de marca de competidores"],
    ["LinkedIn B2B casi vacío (el rival con más seguidores tiene 930), donde están las jefaturas de mantenimiento y logística", "O", 0.05, 1, "Habitos de consumo digital"],
    ["Demanda fuerte en regiones: el 53 % de las ventas con departamento registrado es de provincias", "O", 0.07, 3, "Distribucion geografica de la poblacion"],
    ["Compras públicas de salud con lavandería hospitalaria y barrera sanitaria", "O", 0.07, 3, "Presupuestos gubernamentales"],
    ["Minería y licitaciones exigen equipos certificados y documentación técnica; ningún competidor lo comunica", "O", 0.06, 3, "Certificaciones ambientales"],
    ["Asistentes de IA como nueva puerta de entrada (Serfac 19 páginas citadas, nosotros 12)", "O", 0.04, 2, "Inteligencia artificial y machine learning"],
    ["Fondos cooperativos de LG y Alliance para financiar publicidad", "O", 0.04, 2, "Poder de negociacion de proveedores"],
    ["Serfac domina la subasta industrial de Google (69 % en «lavadora industrial») y mantiene Meta siempre encendido", "A", 0.10, 2, "Rivalidad entre competidores existentes"],
    ["Entrantes con presupuesto: Yamamoto 18 % y Novinsa 12 % de cuota en Industrial; Kingstar y fabricantes chinos anuncian directo", "A", 0.07, 2, "Barreras de entrada al sector"],
    ["Novotec (27 anuncios en Meta) y Novinsa (publicaciones diarias) dominan la conversación en redes", "A", 0.07, 1, "Reputacion y posicionamiento de marca de competidores"],
    ["LG y las tiendas encarecen las búsquedas comerciales: el clic pasó de S/ 1,84 a S/ 3,66 (may-sep)", "A", 0.07, 2, "Poder de negociacion de proveedores"],
    ["Tipo de cambio: equipos importados y cotizados en US$", "A", 0.05, 3, "Tipo de cambio"],
    ["Año electoral que retrasa inversiones y licitaciones", "A", 0.04, 2, "Estabilidad politica"],
  ];
  const mefe: Awaited<ReturnType<typeof db.mefeFactor.create>>[] = [];
  for (const [i, [description, type, weight, rating, src]] of MEFE.entries()) {
    const s = pestecRows[P(src)];
    mefe.push(
      await db.mefeFactor.create({
        data: { ...O, description, originalDescription: description, type, weight, rating, score: round(weight * rating, 4), variable: s.variable, sourceFactorId: s.id, sortOrder: i },
      }),
    );
  }
  const mefePpt = round(mefe.reduce((a, f) => a + f.score, 0), 2);
  await db.mefeState.create({ data: { ...O, status: "finalizada", pptFinal: mefePpt, finalizedAt: day("2026-09-29"), finalizedBy: owner.id } });

  const compValues = [15, 6, 7, 4, 6, 7, 7, 6, 5, 6];
  await db.competitiveAnalysis.create({
    data: { ...O, data: J(COMPETITIVE_CRITERIA.map((c, i) => ({ id: i + 1, label: c.nombre, value: compValues[i] ?? 6 }))) },
  });
  const attrScores = [7, 8, 6, 5, 6, 6, 8, 6, 6, 5, 6, 9, 6, 7, 5];
  await db.industryAttractiveness.create({
    data: { ...O, data: J(ATTRACTIVENESS_FACTORS.map((f, i) => ({ id: i + 1, factor: f.nombre, impulsor: f.impulsor, score: attrScores[i] ?? 6 }))) },
  });

  // MPC: factores digitales y de confianza, calificados con la revisión del 29-09
  const MPC_FACTORS: [string, number][] = [
    ["Visibilidad en Google Ads (cuota y posición)", 0.12],
    ["Posicionamiento orgánico y autoridad del dominio", 0.10],
    ["Web que convierte (WhatsApp, cotizador, velocidad, celular)", 0.12],
    ["Catálogo, precios y fichas técnicas en línea", 0.10],
    ["Publicidad en Meta (volumen y sofisticación)", 0.08],
    ["Alcance en redes (Facebook, Instagram, YouTube)", 0.08],
    ["Frecuencia de contenido orgánico", 0.10],
    ["Prueba social (reseñas de Google, clientes y casos)", 0.12],
    ["Presencia B2B en LinkedIn", 0.06],
    ["Credenciales verificables (planta, años, servicio técnico, marcas certificadas)", 0.07],
    ["Herramientas diferenciales (3D/RA, calculadora, cuenta de cliente)", 0.05],
  ];
  const mpcDefs = [];
  for (const [i, [name, weight]] of MPC_FACTORS.entries()) mpcDefs.push(await db.mpcFactorDef.create({ data: { ...O, name, weight, sortOrder: i } }));
  const MPC_COMP: [string, boolean, number[]][] = [
    ["Efameinsa", true, [3, 4, 4, 3, 2, 3, 1, 4, 2, 3, 4]],
    ["Serfac", false, [4, 2, 3, 3, 3, 2, 3, 3, 3, 3, 2]],
    ["Novotec", false, [2, 2, 2, 3, 4, 2, 3, 2, 3, 2, 2]],
    ["Novinsa", false, [2, 2, 2, 3, 3, 3, 4, 1, 1, 2, 2]],
    ["Panamerican Trading", false, [1, 2, 1, 1, 1, 1, 1, 2, 1, 3, 1]],
    ["Yamamoto Latam", false, [3, 1, 2, 2, 1, 1, 1, 1, 1, 2, 1]],
  ];
  const mpcTotals: Record<string, number> = {};
  for (const [i, [name, isOwnOrg, ratings]] of MPC_COMP.entries()) {
    const c = await db.mpcCompetitor.create({ data: { ...O, name, isOwnOrg, sortOrder: i } });
    let total = 0;
    for (const [j, def] of mpcDefs.entries()) {
      const score = round(def.weight * ratings[j], 4);
      total += score;
      await db.mpcScore.create({ data: { competitorId: c.id, factorDefId: def.id, rating: ratings[j], score } });
    }
    mpcTotals[name] = round(total, 2);
    await db.mpcCompetitor.update({ where: { id: c.id }, data: { totalScore: round(total, 2) } });
  }

  // ───────────────────────────────────────────── M2 Diagnóstico interno (AMOFHIT)
  // Calificación por variable (1 = debilidad mayor … 4 = fortaleza mayor), con criterio propio.
  const AMOFHIT_SCORES: Record<string, number> = {
    "A-1-1": 2, "A-1-2": 3, "A-1-3": 2, "A-1-4": 3, "A-1-5": 2, "A-2-1": 3, "A-2-2": 3, "A-2-3": 3, "A-2-4": 2, "A-2-5": 3,
    "A-3-1": 3, "A-3-2": 2, "A-4-1": 3, "A-4-2": 3, "A-4-3": 3,
    "M-1-1": 4, "M-1-2": 3, "M-1-3": 3, "M-2-1": 2, "M-3-1": 3, "M-4-1": 1, "M-4-2": 3, "M-5-1": 2,
    "O-1-1": 3, "O-1-2": 3, "O-2-1": 4, "O-3-1": 4,
    "F-1-1": 3, "F-1-2": 3, "F-2-1": 3, "F-3-1": 2,
    "H-1-1": 3, "H-2-1": 2, "H-3-1": 3,
    "I-1-1": 4, "I-2-1": 2, "I-3-1": 2,
    "T-1-1": 2, "T-2-1": 3, "T-3-1": 3,
  };
  const AREA_NOTES: Record<string, string> = {
    A: "Hay misión, visión y control diario en el CRM, pero hasta hoy no había plan estratégico formal ni revisión periódica de la estrategia.",
    M: "Producto y marca fuertes; el marketing digital es la debilidad mayor: contenido abandonado, Meta casi apagado y Google mal dirigido.",
    O: "Stock permanente, planta propia y servicio técnico propio son las fortalezas más difíciles de copiar.",
    F: "Calificación provisional: no se revisaron estados financieros. Ventas en fuerte crecimiento según el CRM; falta control presupuestal por área.",
    H: "Equipo comercial rápido (2 h a la primera gestión) pero con conversión desigual (22-38 %) y sin capacitación en calificación de leads.",
    I: "El CRM registra cada lead hasta la venta, pero la base gratuita se saturó (28-09) y faltan datos: 188 WhatsApp sin origen y 245 ventas de 2026 sin rubro.",
    T: "3D con realidad aumentada, calculadora y cotizador propios; poca inversión formal en I+D de la línea Efamein.",
  };
  for (const [areaKey, area] of Object.entries(AMOFHIT_EVALUATION_DATA)) {
    const findings: Record<string, unknown> = {};
    const scores: number[] = [];
    for (const sec of area.secciones) {
      for (const v of sec.variables) {
        const score = AMOFHIT_SCORES[v.id] ?? 3;
        scores.push(score);
        findings[v.id] = {
          score, hallazgo: v.hallazgos[score as 1 | 2 | 3 | 4], evidenceChips: v.chipsEvidencia.slice(0, 2),
          evidenceNotes: "", evidenceFiles: [], confirmed: true, includeInMefi: false,
        };
      }
    }
    await db.amofhitArea.create({
      data: { ...O, area: areaKey, findings: J(findings), score: round(scores.reduce((a, b) => a + b, 0) / scores.length, 2), notes: AREA_NOTES[areaKey] ?? "" },
    });
  }
  // MEFI: 7 fortalezas + 9 debilidades. [descripción, tipo, peso, calificación, área, variable AMOFHIT]
  const MEFI: [string, "F" | "D", number, number, string, string][] = [
    ["Planta propia en Huachipa desde el año 2000: diseñamos, fabricamos e instalamos (marca Efamein)", "F", 0.07, 4, "O", "O-3-1"],
    ["Stock permanente en Lima (~200 máquinas) y representación oficial de UniMac, Primus, Girbau, Milnor, LG y GMP", "F", 0.07, 4, "O", "O-2-1"],
    ["Servicio técnico propio y postventa con preventivo cada 4 meses y garantía por número de serie", "F", 0.06, 3, "O", "O-1-1"],
    ["Ventas en fuerte crecimiento: US$ 1,82 M de enero a septiembre de 2026 frente a US$ 1,09 M en 2025; 226 clientes y el top 10 pesa solo 36 %", "F", 0.07, 4, "F", "F-2-1"],
    ["La web más completa del sector (auditoría 91, 1,1 s, 3D/RA en 62 equipos, calculadora, cotizador) y autoridad de dominio 25 frente a 9-10", "F", 0.08, 4, "M", "M-3-1"],
    ["Prueba social: 4,2★ con 38 reseñas en Google (la mayor del sector) y 27 clientes de referencia con nombre", "F", 0.05, 3, "M", "M-1-2"],
    ["CRM propio con seguimiento del lead hasta la venta y comerciales que contactan en ~2 horas", "F", 0.06, 3, "I", "I-1-1"],
    ["Contenido orgánico abandonado: Facebook sin publicar desde junio, YouTube sin videos hace 5 años, LinkedIn vacío e Instagram sin enlazar", "D", 0.08, 1, "M", "M-4-1"],
    ["Meta subutilizado: 2 anuncios y ~S/ 240 al mes, solo para LG Titan Max", "D", 0.07, 1, "M", "M-4-1"],
    ["Google Ads mal dirigido: ~34 % del gasto en búsquedas de hogar y la campaña Industrial pierde la subasta frente a Serfac", "D", 0.07, 1, "M", "M-4-1"],
    ["Dependencia de la marca: solo 1,4 % de clics en las búsquedas sin «Efameinsa»", "D", 0.06, 2, "M", "M-1-2"],
    ["Conversión comercial desigual (22 a 38 % de leads cotizados según quién atiende) y 98 de 181 leads de Meta descartados", "D", 0.06, 2, "H", "H-2-1"],
    ["Fugas y datos incompletos: carrito 18 %, calculadora 50 %, 188 WhatsApp sin origen y 245 ventas de 2026 sin rubro", "D", 0.06, 2, "I", "I-3-1"],
    ["Infraestructura del CRM sin contingencia: la base gratuita se saturó y el sistema cayó el 28-09", "D", 0.05, 2, "I", "I-2-1"],
    ["Planeamiento informal: sin plan estratégico ni revisión periódica de objetivos hasta este ciclo", "D", 0.04, 2, "A", "A-1-1"],
    ["Postventa tarda de 12 a 16 horas en la primera gestión", "D", 0.05, 2, "M", "M-5-1"],
  ];
  const mefi: Awaited<ReturnType<typeof db.mefiFactor.create>>[] = [];
  for (const [i, [description, type, weight, rating, area, vid]] of MEFI.entries()) {
    mefi.push(
      await db.mefiFactor.create({
        data: { ...O, description, originalDescription: description, type, weight, rating, score: round(weight * rating, 4), area, sourceVariableId: vid, sortOrder: i },
      }),
    );
  }
  const mefiPpt = round(mefi.reduce((a, f) => a + f.score, 0), 2);
  await db.mefiState.create({ data: { ...O, status: "finalizada", pptFinal: mefiPpt, finalizedAt: day("2026-09-29"), finalizedBy: owner.id } });
  await db.areaSynthesis.create({ data: { ...O, area: "M", text: AREA_NOTES.M, version: 1 } }).catch(() => undefined);

  // Códigos F1.., D1.., O1.., A1.. como los muestra la app
  const code = (list: { id: string; type: string; description: string }[], t: string, i: number) => {
    const f = list.filter((x) => x.type === t)[i];
    return { factorType: t, factorId: f.id, factorCode: `${t}${i + 1}`, factorText: f.description };
  };
  const F = (n: number) => code(mefi, "F", n - 1);
  const D = (n: number) => code(mefi, "D", n - 1);
  const Op = (n: number) => code(mefe, "O", n - 1);
  const A = (n: number) => code(mefe, "A", n - 1);

  // ───────────────────────────────────────────── M3 Formulación
  const OLPS = [
    { dim: "FIN", desc: "Al 2030, alcanzar ventas anuales de US$ 5 millones, desde US$ 1,09 millones en 2025.", metric: "Ventas anuales", cur: 1.09, target: 5, unit: "millones US$", resp: "Gerencia General", area: "comercial", year: 2030 },
    { dim: "FIN", desc: "Al 2028, bajar el costo por oportunidad cotizada de Google Ads de S/ 116 a S/ 50 sin subir la inversión total.", metric: "Costo por oportunidad cotizada (Google)", cur: 116, target: 50, unit: "S/", resp: "Marketing", area: "marketing", lower: true, year: 2028 },
    { dim: "CLI", desc: "Al 2028, liderar la búsqueda industrial: 65 % de cuota de impresiones en la campaña Industrial, desde 37 %.", metric: "Cuota de impresiones Industrial", cur: 37, target: 65, unit: "%", resp: "Marketing", area: "marketing", year: 2028 },
    { dim: "CLI", desc: "Al 2029, ser la empresa mejor valorada del sector: 150 reseñas en Google con 4,5★ o más, desde 38 reseñas con 4,2★.", metric: "Reseñas en el Perfil de Google", cur: 38, target: 150, unit: "reseñas", resp: "Gerencia Comercial", area: "comercial", year: 2029 },
    { dim: "INT", desc: "Al 2028, que el 32 % de los leads llegue a cotización, desde 24,4 %.", metric: "Leads que llegan a cotización", cur: 24.4, target: 32, unit: "%", resp: "Jefatura Comercial", area: "comercial", year: 2028 },
    { dim: "INT", desc: "Al 2027, que el 95 % de los contactos y ventas tenga origen y rubro registrados en el CRM, desde 58 %.", metric: "Contactos con origen registrado", cur: 58, target: 95, unit: "%", resp: "Sistemas", area: "tecnologia", year: 2027 },
    { dim: "APR", desc: "Al 2027, publicar 12 piezas de contenido técnico propio al mes en LinkedIn, YouTube y redes, desde 0.", metric: "Piezas de contenido propio al mes", cur: 0, target: 12, unit: "piezas/mes", resp: "Marketing", area: "marketing", year: 2027 },
    { dim: "APR", desc: "Al 2027, que el 100 % de los comerciales y de postventa esté capacitado en calificación de leads y venta consultiva, desde 0 %.", metric: "Equipo capacitado", cur: 0, target: 100, unit: "%", resp: "Gerencia General", area: "rrhh", year: 2027 },
  ];
  const olps = [];
  for (const [i, o] of OLPS.entries()) {
    olps.push(
      await db.olp.create({
        data: {
          ...O, description: o.desc, metric: o.metric, currentValue: o.cur, targetValue: o.target, unit: o.unit,
          bscPerspective: o.dim, responsible: o.resp, priority: i === 3 || i === 7 ? "media" : "alta", targetYear: o.year, sortOrder: i,
        },
      }),
    );
  }
  const OLP_REFS = [[F(4), Op(6), Op(7)], [D(3), D(2), Op(2)], [D(3), A(1), Op(1)], [F(6), Op(4), A(2)], [D(5), F(7)], [D(6), F(7)], [D(1), Op(5)], [D(5), D(9)]];
  for (const [i, refs] of OLP_REFS.entries()) {
    for (const r of refs) await db.olpReference.create({ data: { olpId: olps[i].id, refType: r.factorType, refId: r.factorId, refCode: r.factorCode, refText: r.factorText } });
  }

  // FODA cruzado: 10 estrategias. olp = índices de OLPS.
  type Origin = ReturnType<typeof F>;
  const STRATS: { code: string; q: string; type: string; desc: string; origins: Origin[]; olp: number[]; horizon: string; dalessio: string }[] = [
    { code: "E1", q: "FO", type: "Penetracion de mercado", desc: "Contenido técnico propio con la planta, las instalaciones, el servicio técnico y el 3D: una pieza madre al mes y sus derivadas en LinkedIn, YouTube, Facebook e Instagram.", origins: [F(1), F(5), Op(4), Op(5)], olp: [6, 2], horizon: "corto", dalessio: "penetracion_mercado" },
    { code: "E2", q: "FO", type: "Desarrollo de mercado", desc: "Escalar Meta por escalones a UniMac, secadoras, calandrias e industrial, con campañas por región (Norte, Centro, Sur) y video 3D.", origins: [F(2), F(5), Op(2), Op(6)], olp: [0, 1], horizon: "corto", dalessio: "desarrollo_mercado" },
    { code: "E3", q: "FO", type: "Penetracion de mercado", desc: "Páginas por búsqueda genérica, capacidad y precio «desde» en US$, con preguntas frecuentes con datos que citen los asistentes de IA.", origins: [F(5), Op(1), Op(3), Op(9)], olp: [2, 0], horizon: "mediano", dalessio: "penetracion_mercado" },
    { code: "E4", q: "FO", type: "Desarrollo de producto", desc: "Línea salud y licitaciones: oferta de lavandería hospitalaria con barrera sanitaria, expediente técnico con las certificaciones de los equipos y casos (INEN, EsSalud).", origins: [F(1), F(6), Op(7), Op(8)], olp: [0], horizon: "mediano", dalessio: "desarrollo_producto" },
    { code: "E5", q: "FA", type: "Penetracion de mercado", desc: "Responder a Serfac en la subasta industrial: repartir Google Ads (menos hogar y semi-industrial, más Industrial, total igual) con anuncios de diferenciales reales: stock en Lima, planta, servicio técnico propio y 3D.", origins: [F(2), F(1), A(1), A(4)], olp: [2, 1], horizon: "corto", dalessio: "penetracion_mercado" },
    { code: "E6", q: "FA", type: "Penetracion de mercado", desc: "Blindar la reputación frente a entrantes sin historial: pedir reseña en cada entrega y servicio técnico y publicar casos con nombre.", origins: [F(6), F(3), A(2), A(3)], olp: [3], horizon: "corto", dalessio: "penetracion_mercado" },
    { code: "E7", q: "DO", type: "Integracion hacia adelante", desc: "Enviar a Google y Meta las cotizaciones y ventas del CRM (conversiones sin conexión) para que las plataformas aprendan de clientes reales.", origins: [D(3), D(6), Op(2), Op(1)], olp: [1, 5], horizon: "corto", dalessio: "integracion_adelante" },
    { code: "E8", q: "DO", type: "Penetracion de mercado", desc: "Cerrar las fugas de la web: carrito con datos en el mismo paso, calculadora con celular, formularios cortos y WhatsApp de la web por la línea de la API con origen.", origins: [D(6), Op(1)], olp: [4, 5], horizon: "corto", dalessio: "penetracion_mercado" },
    { code: "E9", q: "DA", type: "Atrincheramiento", desc: "Guion de calificación por canal, capacitación comercial y revisión semanal de descartes para no pagar leads que no compran.", origins: [D(5), A(3)], olp: [7, 4], horizon: "corto", dalessio: "atrincheramiento" },
    { code: "E10", q: "DA", type: "Atrincheramiento", desc: "Continuidad operativa: CRM en infraestructura propia con respaldo diario y alerta de saldo en Google Ads para que las campañas no se apaguen.", origins: [D(7), A(1)], olp: [5], horizon: "corto", dalessio: "atrincheramiento" },
  ];
  const strategies: { id: string; code: string }[] = [];
  for (const [i, s] of STRATS.entries()) {
    const st = await db.strategy.create({
      data: {
        ...O, code: s.code, description: s.desc, swotQuadrant: s.q, crossType: s.q, type: s.type, horizon: s.horizon,
        priority: i < 8 ? "alta" : "media", justification: `Combina ${s.origins.map((o) => o.factorCode).join(" + ")}.`, status: "proposed", sortOrder: i,
      },
    });
    for (const o of s.origins) await db.strategyOrigin.create({ data: { strategyId: st.id, ...o } });
    for (const oi of s.olp) await db.strategyOlp.create({ data: { strategyId: st.id, olpId: olps[oi].id } });
    strategies.push({ id: st.id, code: s.code });
  }
  // Estrategias que proponen las otras matrices (to = índice en STRATS)
  const derived: { type: string; q: string; code: string; desc: string; to: number | null }[] = [
    { type: "PEYEA", q: "DERIVED_PEYEA", code: "P1", to: 4, desc: "Penetración de mercado: ganar cuota en las búsquedas industriales donde hoy manda Serfac." },
    { type: "PEYEA", q: "DERIVED_PEYEA", code: "P2", to: 1, desc: "Desarrollo de mercado: llevar las líneas industriales a las regiones con campañas propias." },
    { type: "PEYEA", q: "DERIVED_PEYEA", code: "P3", to: 3, desc: "Desarrollo de producto: oferta hospitalaria con barrera sanitaria y expediente técnico." },
    { type: "PEYEA", q: "DERIVED_PEYEA", code: "P4", to: 0, desc: "Penetración de mercado: contenido técnico que convierta la ventaja de ingeniería en preferencia." },
    { type: "IE", q: "DERIVED_IE", code: "I1", to: 4, desc: "Conservar y mantener · penetración de mercado: ganar la subasta industrial con los diferenciales reales." },
    { type: "IE", q: "DERIVED_IE", code: "I2", to: 2, desc: "Conservar y mantener · penetración de mercado: páginas por búsqueda genérica y precio «desde»." },
    { type: "IE", q: "DERIVED_IE", code: "I3", to: 3, desc: "Conservar y mantener · desarrollo de producto: línea salud y licitaciones." },
    { type: "GE", q: "DERIVED_GE", code: "G1", to: 1, desc: "Cuadrante I · desarrollo de mercado: campañas por región para las líneas industriales." },
    { type: "GE", q: "DERIVED_GE", code: "G2", to: 0, desc: "Cuadrante I · penetración de mercado: contenido técnico y presencia en LinkedIn." },
    { type: "GE", q: "DERIVED_GE", code: "G3", to: 3, desc: "Cuadrante I · desarrollo de producto: oferta hospitalaria documentada." },
    { type: "BCG", q: "DERIVED_BCG", code: "BCG-A", to: 4, desc: "Estrella · Lavado y secado industrial: invertir para ganar la búsqueda industrial y mantener el liderazgo." },
    { type: "BCG", q: "DERIVED_BCG", code: "BCG-B", to: 1, desc: "Interrogante · Lavadoras comerciales y semi-industriales: crecer solo donde Meta rinde (Titan Max) y dejar de pujar contra LG y las tiendas en Google." },
    { type: "BCG", q: "DERIVED_BCG", code: "BCG-C", to: 5, desc: "Vaca lechera · Servicio técnico y repuestos: cuidar la base instalada con reseñas y preventivo; su flujo financia el crecimiento." },
    { type: "BCG", q: "DERIVED_BCG", code: "BCG-D", to: 2, desc: "Perro · Planchado y calandrias: venderlos dentro de proyectos integrales y en páginas por capacidad, sin campaña propia." },
  ];
  const derivedRows: { id: string; type: string | null; description: string; to: number | null }[] = [];
  for (const [i, d] of derived.entries()) {
    const row = await db.strategy.create({ data: { ...O, code: d.code, description: d.desc, swotQuadrant: d.q, type: d.type, priority: "alta", status: "proposed", sortOrder: 20 + i } });
    derivedRows.push({ id: row.id, type: row.type, description: row.description, to: d.to });
  }

  // PEYEA (escala 1-6). La fuerza financiera es provisional: no se revisaron estados financieros.
  const PEYEA_SCORES: Record<string, number> = {
    "FF.ROE": 4, "FF.LEVERAGE": 4, "FF.LIQUIDITY": 3, "FF.CASH_FLOW": 4, "FF.WORKING_CAPITAL": 3, "FF.RISK": 4, "FF.EXIT": 3,
    "VC.MARKET_SHARE": 4, "VC.QUALITY": 5, "VC.LOYALTY": 4, "VC.TECH_KNOW": 5, "VC.SUPPLIER_CONTROL": 3, "VC.LIFECYCLE": 4, "VC.INNOVATION_SPEED": 4,
    "EE.TECH_CHANGE": 4, "EE.DEMAND_VAR": 3, "EE.COMPETITION": 3, "EE.ENTRY_BARRIERS": 3, "EE.INFLATION": 5, "EE.FX_RISK": 3,
    "FI.GROWTH": 5, "FI.PROFIT": 4, "FI.STABILITY": 4, "FI.TECH_KNOW": 4, "FI.RESOURCE_USE": 4, "FI.ENTRY_EASE": 3,
  };
  const dimRows = (dim: "FF" | "VC" | "EE" | "FI") =>
    PEYEA_CATALOG.filter((v) => v.dimension === dim).map((v) => ({ key: v.key, factor: v.name, score: PEYEA_SCORES[v.key] ?? 3.5, modified: true }));
  const pv = { FF: dimRows("FF"), VC: dimRows("VC"), EE: dimRows("EE"), FI: dimRows("FI") };
  const vec = computeVector({ FF: pv.FF.map((r) => r.score), VC: pv.VC.map((r) => r.score), EE: pv.EE.map((r) => r.score), FI: pv.FI.map((r) => r.score) });
  await db.peyeaAnalysis.create({
    data: { ...O, financialStrength: J(pv.FF), competitiveAdvantage: J(pv.VC), environmentalStability: J(pv.EE), industryStrength: J(pv.FI), vectorX: round(vec.x), vectorY: round(vec.y), quadrant: vec.quadrant },
  });

  // BCG: el CRM no guarda el detalle por producto de la mayoría de ventas (24 de 701 con ítems),
  // así que las ventas por línea y el tamaño de mercado son una ESTIMACIÓN a validar con gerencia.
  const uid = (n: number) => `efa-bcg-${n}`;
  await db.matrixState.create({
    data: {
      cycleId: CYCLE_ID, kind: "bcg",
      data: J({
        empresa: "Efameinsa (estimación por línea, validar con gerencia)", anioActual: "2026", anioAnterior: "2025",
        cortoY: "10", cortoX: "1.0", moneda: "US$", unidades: "Miles",
        productos: [
          { id: uid(1), nombre: "Lavado y secado industrial", ventasPropias: "1300", ventasLider: "1100", mercadoActual: "6500", mercadoAnterior: "5800" },
          { id: uid(2), nombre: "Lavadoras comerciales y semi-industriales", ventasPropias: "500", ventasLider: "900", mercadoActual: "3000", mercadoAnterior: "2600" },
          { id: uid(3), nombre: "Servicio técnico y repuestos", ventasPropias: "300", ventasLider: "200", mercadoActual: "1000", mercadoAnterior: "950" },
          { id: uid(4), nombre: "Planchado y calandrias", ventasPropias: "180", ventasLider: "250", mercadoActual: "900", mercadoAnterior: "850" },
        ],
      }),
    },
  });
  await db.matrixState.create({
    data: { cycleId: CYCLE_ID, kind: "ge", data: J({ growth: 12, position: mpcTotals["Efameinsa"], growthSource: "manual", positionSource: "mpc", growthThreshold: 5, positionThreshold: 2.5 }) },
  });

  // MD: estrategias consolidadas
  // Se retienen a mano E6-E9: pesan poco en convergencia, pero son baratas y habilitan a las demás.
  const MANUAL = ["E6", "E7", "E8", "E9"];
  const consolidated = [];
  for (const [i, s] of STRATS.entries()) {
    const extra = derivedRows.filter((d) => d.to === i);
    const appearances = new Set(["foda_cruzado", ...extra.map((d) => (d.type ?? "").toLowerCase())]).size;
    const status = appearances >= 3 ? "retenida" : MANUAL.includes(s.code) ? "retenida_manual" : "contingencia";
    const c = await db.consolidatedStrategy.create({
      data: {
        cycleId: CYCLE_ID, code: s.code, text: s.desc, type: s.type, dalessioType: s.dalessio, responsible: OLPS[s.olp[0]].resp,
        priority: status === "contingencia" ? "media" : "alta", status, totalAppearances: appearances, sortOrder: i,
      },
    });
    await db.consolidatedStrategyOrigin.create({ data: { consolidatedId: c.id, sourceStrategyId: strategies[i].id, sourceMatrix: "foda_cruzado", sourceText: s.desc, sourceCode: s.code } });
    for (const d of extra) await db.consolidatedStrategyOrigin.create({ data: { consolidatedId: c.id, sourceStrategyId: d.id, sourceMatrix: (d.type ?? "foda").toLowerCase(), sourceText: d.description } });
    for (const oi of s.olp) await db.consolidatedStrategyOlp.create({ data: { consolidatedId: c.id, olpId: olps[oi].id, origin: "user" } });
    consolidated.push(c);
  }

  // MCPE: atractivo (1-4) de cada estrategia frente a los factores que toca; el resto queda N/A.
  const MCPE_PA: Record<string, Record<string, number>> = {
    E1: { F1: 4, F5: 3, F6: 3, D1: 4, D4: 3, O4: 4, O5: 4, O9: 3, A3: 3, A2: 3 },
    E2: { F2: 4, F5: 3, D2: 4, D5: 2, O2: 4, O6: 4, A3: 3, A4: 3 },
    E3: { F5: 4, D4: 4, D3: 3, O1: 4, O3: 4, O9: 4, A1: 3, A4: 3, A2: 2 },
    E4: { F1: 4, F6: 4, F3: 3, F4: 3, O7: 4, O8: 4, A6: 2, A2: 3 },
    E5: { F2: 4, F1: 3, D3: 4, D4: 3, O1: 3, A1: 4, A4: 4, A2: 3 },
    E6: { F6: 4, F3: 4, O4: 4, A2: 3, A3: 2, D4: 2 },
    E7: { F7: 4, D3: 4, D6: 3, O2: 3, O1: 2, A1: 3, A4: 3 },
    E8: { F5: 4, F7: 3, D6: 4, O1: 3, O2: 2, A1: 2 },
    E9: { F7: 3, D5: 4, O2: 3, A3: 3, F4: 3 },
    E10: { D7: 4, F7: 3, A1: 2, D6: 2 },
  };
  const mcpe = await db.mcpeAnalysis.create({ data: { cycleId: CYCLE_ID, status: "completo", progress: 100 } });
  const factorCode = (f: { id: string; type: string }) => {
    const list = f.type === "F" || f.type === "D" ? mefi : mefe;
    return `${f.type}${list.filter((x) => x.type === f.type).findIndex((x) => x.id === f.id) + 1}`;
  };
  const factors = [...mefi, ...mefe];
  const ranking: { code: string; total: number }[] = [];
  for (const [ci, c] of consolidated.entries()) {
    const pa = MCPE_PA[STRATS[ci].code];
    const data = factors.map((f) => {
      const v = pa[factorCode(f)] ?? null;
      return { analysisId: mcpe.id, factorId: f.id, factorType: f.type, consolidatedId: c.id, pa: v, pta: v == null ? 0 : round(f.weight * v, 4), origin: "user" };
    });
    await db.mcpeRating.createMany({ data });
    const total = round(data.reduce((a, r) => a + r.pta, 0), 2);
    ranking.push({ code: STRATS[ci].code, total });
    await db.consolidatedStrategy.update({ where: { id: c.id }, data: { priorityScore: total } });
  }
  ranking.sort((a, b) => b.total - a.total);

  // Rumelt: todas pasan los cuatro criterios; E10 depende de la aprobación de gerencia del cambio de DNS.
  const CRITERIA = ["consistencia", "consonancia", "ventaja", "factibilidad"];
  for (const [ci, c] of consolidated.entries()) {
    const ev = await db.rumeltEvaluation.create({ data: { cycleId: CYCLE_ID, consolidatedId: c.id, status: "aprobada", autoVerdict: "aprobada", finalVerdict: "aprobada" } });
    for (const criterion of CRITERIA) {
      const why =
        criterion === "factibilidad" && STRATS[ci].code === "E10" ? "Factible con la VM ya probada; depende de que gerencia apruebe el cambio de nameservers." :
        criterion === "ventaja" ? "Se apoya en fortalezas que la competencia no tiene (planta, stock, servicio técnico propio, 3D, CRM)." :
        "Coherente con la misión, la visión y los objetivos de largo plazo.";
      await db.rumeltCriterion.create({ data: { evaluationId: ev.id, criterion, passes: true, justification: why } });
    }
  }
  // Ética: E1 y E6 muestran clientes y reseñas → mitigante de privacidad y de reseñas sin incentivo.
  const MITIGANTS: Record<string, string> = {
    E1: "Publicar fotos, videos y casos de clientes solo con autorización escrita y sin datos sensibles de la operación.",
    E6: "Pedir reseñas a todos los clientes por igual, sin descuentos ni regalos a cambio y sin filtrar a los insatisfechos.",
  };
  let mitigantId: string | null = null;
  for (const [ci, c] of consolidated.entries()) {
    const sc = STRATS[ci].code;
    const withMitigant = sc in MITIGANTS;
    const ev = await db.ethicsEvaluation.create({
      data: { cycleId: CYCLE_ID, consolidatedId: c.id, status: withMitigant ? "aprobada_con_mitigantes" : "aprobada", autoVerdict: withMitigant ? "requiere_mitigacion" : "aprobada", finalVerdict: withMitigant ? "aprobada_con_mitigantes" : "aprobada" },
    });
    for (const p of ETHICS_PRINCIPLES) {
      const rating = withMitigant && p.key === "der.privacidad" ? "viola" : p.key === "uti.fines" ? "promueve" : "neutral";
      const pr = await db.ethicsPrinciple.create({
        data: {
          evaluationId: ev.id, block: p.block, principleKey: p.key, rating,
          justification: rating === "viola" ? "Expone información de clientes si se publica sin su permiso." : rating === "promueve" ? "Mejora la información con la que el cliente decide su compra." : null,
        },
      });
      if (rating === "viola") {
        const m = await db.ethicsMitigant.create({
          data: { evaluationId: ev.id, principleId: pr.id, text: MITIGANTS[sc], responsible: "Marketing", deadline: "previo_lanzamiento", indicator: "Casos y reseñas publicados con autorización (%)", postSeverity: "neutral" },
        });
        if (sc === "E1") mitigantId = m.id;
      }
    }
  }
  await db.peiDocument.create({
    data: {
      cycleId: CYCLE_ID,
      customExecutiveSummary:
        `Efameinsa lidera el canal digital del sector (MPC ${dec(mpcTotals["Efameinsa"])} frente a ${dec(mpcTotals["Serfac"])} de Serfac) gracias a lo que no se mueve solo: web, dominio, reseñas, planta propia y stock. Pierde en lo que la competencia activa cada semana: anuncios, contenido y LinkedIn. MEFE ${dec(mefePpt)} y MEFI ${dec(mefiPpt)}: las oportunidades baratas (Meta, contenido, búsquedas genéricas, regiones) se toman a medias. El plan lleva las ventas de US$ 1,09 M (2025) a US$ 5 M en 2030 con diez estrategias; la MCPE prioriza ${ranking.slice(0, 3).map((r) => r.code).join(", ")}.`,
    },
  });

  // ───────────────────────────────────────────── M4 Implementación
  const AREAS = [
    ["gerencia-general", "Gerencia General", "Crown"], ["comercial", "Comercial / Ventas", "TrendingUp"], ["marketing", "Marketing", "Megaphone"],
    ["operaciones", "Operaciones / Postventa", "Factory"], ["finanzas", "Finanzas", "Wallet"], ["rrhh", "Recursos Humanos", "Users"], ["tecnologia", "Tecnología / Sistemas", "Cpu"],
  ];
  const areas: Record<string, { id: string }> = {};
  for (const [i, [key, name, icon]] of AREAS.entries()) areas[key] = await db.ocpArea.create({ data: { ...O, key, name, icon, kind: "predefined", sortOrder: i } });

  // 2026: solo el cuarto trimestre (el plan arranca en octubre). 2027: los cuatro trimestres.
  const OCP_PLAN: { meta: [number, number]; d: [string, string]; ind: string; support: string[]; budget: number; q4: string[]; y2: [string, string][] }[] = [
    { meta: [2.4, 3.0], d: ["Cerrar 2026 con US$ 2,4 millones en ventas", "Vender US$ 3,0 millones en 2027"], ind: "Ventas anuales (millones US$)", support: ["marketing"], budget: 0,
      q4: ["Cerrar en bloque las oportunidades viejas del Excel y revisar la proyección semanal", "Priorizar las 30 cuentas industriales con cotización abierta"],
      y2: [["Q1", "Metas por comercial y por sector con seguimiento semanal"], ["Q2", "Campaña de preventivo y renovación a la base instalada"], ["Q3", "Programa de visitas al showroom para cuentas industriales"], ["Q4", "Revisión anual de cartera (3 meses sin venta)"]] },
    { meta: [90, 70], d: ["Bajar el costo por oportunidad cotizada de Google a S/ 90", "Bajar el costo por oportunidad cotizada de Google a S/ 70"], ind: "Costo por oportunidad cotizada (S/)", support: ["tecnologia"], budget: 0,
      q4: ["Palabras negativas seguras y exactas; revisar «de ropa» y LG de hogar con el CRM", "Reparto: Industrial con CPA S/ 25-30 financiado con lo que sale de hogar y semi-industrial", "Conversiones sin conexión (cotización y venta) desde el CRM a Google Ads"],
      y2: [["Q1", "Revisión mensual de términos de búsqueda"], ["Q2", "Pujas por valor de cotización"], ["Q3", "Prueba de campañas por sector"], ["Q4", "Plan anual con LG y Alliance (fondos cooperativos)"]] },
    { meta: [45, 55], d: ["Llegar a 45 % de cuota de impresiones en Industrial", "Llegar a 55 % de cuota de impresiones en Industrial"], ind: "Cuota de impresiones Industrial (%)", support: ["gerencia-general"], budget: 0,
      q4: ["Anuncios nuevos con planta, stock en Lima, servicio técnico propio, 3D y visitas", "Todos los grupos de anuncios a las páginas de campaña", "3 páginas SEO: «lavadora industrial», precio y capacidad"],
      y2: [["Q1", "5 páginas SEO por sector y por marca"], ["Q2", "Preguntas frecuentes con datos en las fichas (para IA)"], ["Q3", "Precio «desde» en las fichas industriales"], ["Q4", "Medir las páginas citadas por IA (meta: 20)"]] },
    { meta: [60, 90], d: ["Llegar a 60 reseñas en Google", "Llegar a 90 reseñas en Google"], ind: "Reseñas en el Perfil de Google", support: ["operaciones"], budget: 0,
      q4: ["Pedido de reseña en cada entrega y en cada servicio técnico (QR en el informe)", "Perfil de Google con fotos de la planta, el showroom y las instalaciones"],
      y2: [["Q1", "Casos con nombre en la web (con autorización)"], ["Q2", "Responder todas las reseñas en 48 horas"], ["Q3", "Encuesta de satisfacción tras el servicio"], ["Q4", "Revisión anual de la calificación y los comentarios"]] },
    { meta: [27, 29], d: ["Llevar a 27 % los leads que llegan a cotización", "Llevar a 29 % los leads que llegan a cotización"], ind: "Leads que llegan a cotización (%)", support: ["marketing"], budget: 0,
      q4: ["Carrito con «Pedir cotización ahora» y datos en el mismo panel", "Calculadora: nombre y celular en un paso para ver el resultado", "Revisión semanal de descartes de Meta con la jefatura comercial"],
      y2: [["Q1", "Formularios con menos campos y celular primero"], ["Q2", "Etiqueta «Véalo en 3D» y botón fijo de cotizar en el celular"], ["Q3", "Tablero de conversión por comercial y por canal"], ["Q4", "Ajustar reparto de leads según conversión"]] },
    { meta: [85, 95], d: ["Registrar el origen del 85 % de los contactos", "Registrar origen y rubro del 95 % de los contactos y ventas"], ind: "Contactos con origen registrado (%)", support: ["gerencia-general"], budget: 0,
      q4: ["Decisión de gerencia: WhatsApp de la web por la línea de la API", "CRM en infraestructura propia con respaldo diario (VM + Cloudflare)", "Alerta de saldo o recarga automática en Google Ads"],
      y2: [["Q1", "Rubro obligatorio en cada venta nueva"], ["Q2", "Completar el rubro de las 245 ventas de 2026"], ["Q3", "Auditoría trimestral de origen por canal"], ["Q4", "Tablero de ventas por sector y región"]] },
    { meta: [6, 12], d: ["Publicar 6 piezas de contenido propio al mes", "Publicar 12 piezas de contenido propio al mes"], ind: "Piezas de contenido propio al mes", support: ["operaciones"], budget: 1500,
      q4: ["Calendario de contenido: 1 pieza madre al mes y 5 derivadas", "Reactivar LinkedIn de la empresa y enlazar Instagram desde la web", "Video de 30 s del 3D y de la planta para Meta y YouTube"],
      y2: [["Q1", "Serie de YouTube: instalaciones y servicio técnico"], ["Q2", "Casos por sector en LinkedIn"], ["Q3", "Contenido regional (Cusco, Arequipa, Junín)"], ["Q4", "Medir alcance e interacción frente a Novinsa y Novotec"]] },
    { meta: [60, 100], d: ["Capacitar al 60 % del equipo en calificación de leads", "Capacitar al 100 % del equipo en calificación y venta consultiva"], ind: "Equipo capacitado (%)", support: ["comercial"], budget: 600,
      q4: ["Guion de calificación por canal (Meta, Google, web, WhatsApp)", "Taller con Katerine y Brenda (mejor conversión) para el resto del equipo"],
      y2: [["Q1", "Inducción comercial en Crece para ingresos nuevos"], ["Q2", "Capacitación técnica por línea con la planta"], ["Q3", "Evaluación de conversión después de la capacitación"], ["Q4", "Plan de carrera comercial"]] },
  ];
  // Prioridad del OCP según la MCPE: las cinco estrategias con más puntaje marcan sus OLP como alta.
  const topCodes = new Set(ranking.slice(0, 5).map((r) => r.code));
  const olpPriority = (i: number) => (STRATS.some((s) => topCodes.has(s.code) && s.olp.includes(i)) ? "alta" : "media");
  const ocps: { id: string; olp: number; year: number; meta: number; code: string }[] = [];
  for (const [i, plan] of OCP_PLAN.entries()) {
    for (const [yi, year] of [2026, 2027].entries()) {
      const actions = year === 2026 ? plan.q4.map((d) => ["Q4", d] as [string, string]) : plan.y2;
      const ocp = await db.ocp.create({
        data: {
          ...O, olpId: olps[i].id, code: ocpCode(i + 1, year), description: plan.d[yi], year, metaValue: plan.meta[yi], unit: OLPS[i].unit,
          responsibleAreaId: areas[OLPS[i].area].id, indicator: plan.ind, frequency: year === 2026 ? "mensual" : "trimestral", priority: olpPriority(i),
          status: year === 2026 ? "en_ejecucion" : "definido", sortOrder: i,
          actions: { create: actions.map(([q, d], k) => ({ quarter: q, description: d, status: "pendiente", sortOrder: k })) },
          resource: { create: { budgetEstimate: plan.budget * (year === 2026 ? 3 : 12), budgetCurrency: "PEN", ftesRequired: 1, techRequired: i === 5 ? "VM propia, túnel Cloudflare, línea de WhatsApp API" : i === 1 ? "API de Google Ads (conversiones sin conexión)" : null } },
        },
      });
      for (const s of plan.support) await db.ocpAreaSupport.create({ data: { ocpId: ocp.id, areaId: areas[s].id } });
      for (const [si, s] of STRATS.entries()) if (s.olp.includes(i)) await db.ocpStrategy.create({ data: { ocpId: ocp.id, strategyId: strategies[si].id } });
      ocps.push({ id: ocp.id, olp: i, year, meta: plan.meta[yi], code: ocp.code });
    }
  }

  // Políticas
  const POLICIES: { code: string; cat: string; name: string; text: string; strat: number[]; olp: number[]; vals: number[]; mandatory?: boolean }[] = [
    { code: "POL-COM-01", cat: "comercial", name: "Todo contacto entra al CRM", text: "Ningún contacto se atiende fuera del CRM: cada lead, cotización y venta se registra con su origen y su rubro.", strat: [6, 7], olp: [5, 4], vals: [4] },
    { code: "POL-MKT-01", cat: "comercial", name: "Se invierte por oportunidad cotizada", text: "Las campañas se evalúan por costo por oportunidad cotizada en el CRM, no por clics ni por conversiones de la plataforma; todo aumento de un canal sale de otro (total igual).", strat: [4, 1, 6], olp: [1, 2], vals: [4] },
    { code: "POL-MKT-02", cat: "comercial", name: "Mostrar lo que es verdad", text: "Los anuncios y contenidos solo usan diferenciales comprobables: planta, stock, servicio técnico propio, marcas certificadas y 3D. Lema: «Ingeniería Certificada».", strat: [0, 4], olp: [6, 2], vals: [0, 3] },
    { code: "POL-OPE-01", cat: "operacional", name: "Cada entrega pide su reseña", text: "Toda entrega, instalación y servicio técnico termina con el pedido de reseña y el informe con foto, fecha y hora.", strat: [5], olp: [3], vals: [2] },
    { code: "POL-ETI-01", cat: "etica_social", name: "Clientes solo con permiso", text: "Ningún caso, foto o reseña de un cliente se publica sin su autorización escrita; nunca se ofrecen incentivos a cambio de reseñas.", strat: [0, 5], olp: [6, 3], vals: [2], mandatory: true },
  ];
  const policies = [];
  for (const [i, p] of POLICIES.entries()) {
    const pol = await db.politica.create({
      data: {
        ...O, code: p.code, category: p.cat, name: p.name, enunciado: p.text, justification: "Deriva de las estrategias retenidas del plan.",
        origin: p.mandatory ? "mitigant" : "suggested", ethicsMitigantId: p.mandatory ? mitigantId : null, mandatory: !!p.mandatory,
        scope: "toda_organizacion", responsible: OLPS[p.olp[0]].resp, indicator: OCP_PLAN[p.olp[0]].ind, reviewFrequency: "anual",
        validFrom: day("2026-10-01"), nextReview: day("2027-10-01"), status: "confirmada", sortOrder: i,
      },
    });
    for (const s of p.strat) await db.policyStrategy.create({ data: { politicaId: pol.id, strategyId: strategies[s].id } });
    for (const s of p.strat) await db.policyConsolidatedStrategy.create({ data: { politicaId: pol.id, consolidatedStrategyId: consolidated[s].id } });
    for (const oi of p.olp) for (const o of ocps.filter((x) => x.olp === oi)) await db.policyOcp.create({ data: { politicaId: pol.id, ocpId: o.id } });
    for (const v of p.vals) await db.policyValue.create({ data: { politicaId: pol.id, valueId: values[v].id } });
    policies.push(pol);
  }

  // Estructura (por puestos, sin nombres de personas)
  const structure = await db.orgStructure.create({ data: { ...O, type: "funcional", name: "Estructura funcional 2026", status: "confirmada" } });
  const NODES: [string, string, string, number, string, string | null][] = [
    ["GG", "Gerencia General", "ceo", 1, "Gerente general", null],
    ["GCOM", "Gerencia Comercial", "gerencia", 2, "Gerencia comercial", "GG"],
    ["MKT", "Marketing y Sistemas", "gerencia", 2, "Responsable de marketing y sistemas", "GG"],
    ["OPE", "Operaciones: planta, almacén e importaciones", "gerencia", 2, "Jefatura de operaciones", "GG"],
    ["PV", "Postventa y servicio técnico", "jefatura", 3, "Jefatura de postventa", "OPE"],
    ["FIN", "Finanzas", "gerencia", 2, "Responsable de finanzas", "GG"],
    ["RH", "Recursos Humanos", "jefatura", 2, "Recursos humanos", "GG"],
    ["CEST", "Comité de Estrategia", "comite", 2, "Gerente general", "GG"],
  ];
  const nodes: Record<string, { id: string }> = {};
  for (const [i, [codeN, name, nodeType, lvl, role, parent]] of NODES.entries()) {
    nodes[codeN] = await db.orgNode.create({
      data: { structureId: structure.id, code: codeN, name, nodeType, hierarchyLevel: lvl, responsibleRole: role, positionX: (i % 5) * 220, positionY: lvl * 140, origin: "auto_generated", ftesEstimated: 1 },
    });
    if (parent) await db.orgRelation.create({ data: { structureId: structure.id, parentNodeId: nodes[parent].id, childNodeId: nodes[codeN].id, relationType: nodeType === "comite" ? "coordinacion" : "reporta_directo" } });
  }
  const AREA_NODE: Record<string, string> = { comercial: "GCOM", marketing: "MKT", tecnologia: "MKT", operaciones: "OPE", finanzas: "FIN", rrhh: "RH" };
  for (const o of ocps) {
    await db.orgNodeOcp.create({ data: { nodeId: nodes[AREA_NODE[OLPS[o.olp].area]].id, ocpId: o.id, raciRole: "R", origin: "auto_generated" } });
    await db.orgNodeOcp.create({ data: { nodeId: nodes.GG.id, ocpId: o.id, raciRole: "A", origin: "auto_generated" } });
  }
  for (const p of policies) await db.orgNodePolicy.create({ data: { nodeId: nodes.GG.id, politicaId: p.id } });

  // Recursos (7M) 2026-2027 en soles. El reparto de Google no suma: sale del mismo presupuesto.
  const plan7m = await db.resourcePlan.create({ data: { ...O, horizonStart: 2026, horizonEnd: 2030, currency: "PEN", status: "borrador" } });
  const NEEDS: [string, string, number, number, string, string][] = [
    ["money", "Meta por escalones (S/ 1 500 al mes) y producción de contenido", 27000, 0, "planeada", "medio"],
    ["manpower", "Horas de marketing para contenido y de comerciales para capacitación", 0, 0, "comprometida", "medio"],
    ["machines", "Servidor propio del CRM (VM ya instalada) y línea de WhatsApp API", 3000, 3000, "asegurada", "bajo"],
    ["materials", "QR y material para pedir reseñas en cada entrega e informe técnico", 800, 0, "planeada", "bajo"],
    ["methods", "Guion de calificación, calendario de contenido y conversiones sin conexión", 0, 0, "en_gestion", "bajo"],
    ["mentality", "Cultura de registrar todo en el CRM y decidir con datos", 0, 0, "en_gestion", "medio"],
    ["medio_ambiente", "Comunicar el consumo de agua y energía y las certificaciones de cada equipo", 0, 0, "planeada", "bajo"],
  ];
  let total = 0;
  for (const [category, description, amount, secured, provisionStatus, riskLevel] of NEEDS) {
    total += amount;
    const need = await db.resourceNeed.create({ data: { planId: plan7m.id, category, description, yearStart: 2026, yearEnd: 2027, amountEstimated: amount, amountSecured: secured, provisionStatus, riskLevel, origin: "auto_generated" } });
    await db.resourceLink.create({ data: { needId: need.id, linkType: "ocp", referenceId: ocps[0].id, referenceLabel: ocps[0].code } });
  }
  await db.resourcePlan.update({ where: { id: plan7m.id }, data: { totalInvestment: total } });

  // ───────────────────────────────────────────── M5 Control: Balanced Scorecard
  const DIM: Record<string, [string, string]> = { FIN: ["resultados_economicos", "RE"], CLI: ["posicion_mercado", "PM"], INT: ["como_opera_empresa", "OP"], APR: ["personas_cultura", "PC"] };
  // Valores reales medidos. Ventas: CRM por trimestre (millones US$). El resto: línea base de septiembre (2026-Q3).
  const KPIS: { name: string; unit: string; olp: number; node: string; real: Record<string, number>; quarterly?: boolean; formula: string }[] = [
    { name: "Ventas del trimestre", unit: "millones US$", olp: 0, node: "GCOM", real: { "2026-Q1": 0.54, "2026-Q2": 0.66, "2026-Q3": 0.63 }, quarterly: true, formula: "Suma de ventas no anuladas del CRM en el trimestre (PEN a 3,7)" },
    { name: "Costo por oportunidad cotizada (Google)", unit: "S/", olp: 1, node: "MKT", real: { "2026-Q3": 116 }, formula: "Gasto de Google Ads ÷ leads de Google que recibieron cotización" },
    { name: "Cuota de impresiones Industrial", unit: "%", olp: 2, node: "MKT", real: { "2026-Q3": 37 }, formula: "Cuota de impresiones de la campaña Industrial (Google Ads)" },
    { name: "Reseñas en el Perfil de Google", unit: "reseñas", olp: 3, node: "GCOM", real: { "2026-Q3": 38 }, formula: "Número de reseñas de la ficha de Huachipa al cierre" },
    { name: "Leads que llegan a cotización", unit: "%", olp: 4, node: "GCOM", real: { "2026-Q3": 24.4 }, formula: "Leads con cotización enviada ÷ leads asignados (CRM)" },
    { name: "Contactos con origen registrado", unit: "%", olp: 5, node: "MKT", real: { "2026-Q3": 58 }, formula: "Contactos con canal de origen ÷ contactos del periodo (CRM)" },
    { name: "Piezas de contenido propio al mes", unit: "piezas/mes", olp: 6, node: "MKT", real: { "2026-Q3": 0 }, formula: "Publicaciones propias en LinkedIn, YouTube, Facebook e Instagram (promedio mensual)" },
    { name: "Equipo capacitado en calificación", unit: "%", olp: 7, node: "RH", real: { "2026-Q3": 0 }, formula: "Comerciales y postventa capacitados ÷ total del equipo" },
  ];
  const quarters = (y: number) => [1, 2, 3, 4].map((q) => `${y}-Q${q}`);
  const PERIODS = [...quarters(2026), ...quarters(2027), ...quarters(2028)];
  const kpis: (Awaited<ReturnType<typeof db.kpi.create>> & { dim: string })[] = [];
  const counters: Record<string, number> = {};
  const redKpis: string[] = [];
  for (const [ki, k] of KPIS.entries()) {
    const olpDef = OLPS[k.olp];
    const [dimension, dcode] = DIM[olpDef.dim];
    counters[dcode] = (counters[dcode] ?? 0) + 1;
    const lower = !!olpDef.lower;
    const kpi = await db.kpi.create({
      data: {
        ...O, code: `KPI-${dcode}-${String(counters[dcode]).padStart(2, "0")}`, name: k.name, description: `Mide el avance del OLP${k.olp + 1}.`, formula: k.formula,
        dimensionBsc: dimension, unit: k.unit, frequency: "trimestral", direction: lower ? "menor_mejor" : "mayor_mejor", source: "manual",
        responsibleAreaId: nodes[k.node].id, responsibleRole: olpDef.resp, status: "confirmado", origin: "manual", sortOrder: ki,
      },
    });
    await db.kpiOlp.create({ data: { kpiId: kpi.id, olpId: olps[k.olp].id } });
    for (const o of ocps.filter((x) => x.olp === k.olp)) await db.kpiOcp.create({ data: { kpiId: kpi.id, ocpId: o.id } });
    const ocpMeta = (year: number) => ocps.find((x) => x.olp === k.olp && x.year === year)?.meta ?? olpDef.target;
    for (const period of PERIODS) {
      const year = Number(period.slice(0, 4));
      const q = Number(period.slice(-1));
      let meta: number;
      if (k.quarterly) meta = round((year === 2028 ? 3.7 : ocpMeta(year)) / 4, 2);
      else if (year === 2026) meta = q <= 3 ? olpDef.cur : ocpMeta(2026); // la meta de 2026 vale para el Q4; Q1-Q3 = línea base
      else {
        const prev = ocpMeta(year - 1 > 2027 ? 2027 : year - 1);
        const goal = year >= 2028 ? olpDef.target - (olpDef.target - ocpMeta(2027)) / 2 : ocpMeta(year);
        meta = round(prev + ((goal - prev) * q) / 4, 2);
      }
      const green = meta;
      const amber = lower ? round(meta * 1.15, 2) : round(meta * 0.85, 2);
      const red = lower ? round(meta * 1.3, 2) : round(meta * 0.7, 2);
      const real = k.real[period] ?? null;
      let semaforo = "sin_dato";
      let pct: number | null = null;
      if (real != null) {
        pct = meta === 0 ? 100 : round(Math.min(200, lower ? (meta / real) * 100 : (real / meta) * 100), 1);
        semaforo = lower ? (real <= green ? "verde" : real <= amber ? "ambar" : "rojo") : real >= green ? "verde" : real >= amber ? "ambar" : "rojo";
        if (period === "2026-Q3" && semaforo === "rojo") redKpis.push(kpi.id);
      }
      const received = real != null ? day(`2026-${String(q * 3).padStart(2, "0")}-28`) : null;
      await db.kpiPeriod.create({
        data: {
          kpiId: kpi.id, period, metaGreen: green, metaAmber: amber, metaRed: red, realValue: real, semaforoActual: semaforo,
          percentCompletion: pct, dataReceivedAt: received, periodDataSource: real != null ? "manual" : null,
          observation: real != null && !k.quarterly && period === "2026-Q3" ? "Línea base medida en septiembre de 2026." : null,
        },
      });
      if (real != null) {
        await db.kpiValueHistory.create({ data: { kpiId: kpi.id, period, value: real, receivedAt: received!, source: "manual", idempotencyKey: `efa-${kpi.id}-${period}`, metadata: J({ registradoPor: "diagnóstico 29-09-2026" }) } });
      }
    }
    kpis.push({ ...kpi, dim: olpDef.dim });
  }
  const byDim = (d: string) => kpis.filter((k) => k.dim === d);
  for (const [a, b] of [["APR", "INT"], ["INT", "CLI"], ["CLI", "FIN"]]) {
    for (const s of byDim(a)) for (const t of byDim(b)) {
      await db.kpiRelation.create({ data: { cycleId: CYCLE_ID, sourceKpiId: s.id, targetKpiId: t.id, relationType: "causa_efecto", intensity: "media", origin: "auto_inferida" } });
    }
  }
  for (const t of ALERT_TYPES.filter((x) => x.key !== "personalizada")) {
    await db.alertRule.create({ data: { cycleId: CYCLE_ID, type: t.key, name: t.defaultRuleName, configuration: J(t.defaultConfig), defaultPriority: t.defaultPriority, isDefault: true, triggerCount: 0 } });
  }
  await db.review.create({
    data: { ...O, type: "trimestral", title: "Revisión estratégica 2026-Q4", period: "2026-Q4", scheduledAt: day("2027-01-15"), location: "Oficina de Huachipa", status: "programada", presidentId: owner.id, secretaryId: owner.id },
  });
  const MODULES: [string, string, number][] = [["M1", "COMPLETADO", 100], ["M2", "COMPLETADO", 100], ["M3", "COMPLETADO", 100], ["M4", "EN_CURSO", 80], ["M5", "EN_CURSO", 30]];
  for (const [moduleId, status, progress] of MODULES) await db.moduleStatus.create({ data: { cycleId: CYCLE_ID, moduleId, status, progress } });

  // ───────────────────────────────────────────── Portafolio y proyectos (generados desde el plan)
  const { planFromCycle } = await import("../src/server/routers/pm");
  const gen = await planFromCycle(db as never, org.id, CYCLE_ID, owner.id, true);
  console.log("Portafolio generado:", gen.summary);
  const projects = await db.project.findMany({ where: { orgId: org.id }, select: { id: true } });
  for (const p of projects) {
    await db.project.update({ where: { id: p.id }, data: { ownerId: owner.id } });
    await db.projectMember.upsert({ where: { projectId_userId: { projectId: p.id, userId: owner.id } }, update: {}, create: { projectId: p.id, userId: owner.id, role: "PM" } });
  }

  // OCP de 2028 a 2030 en borrador, sin proyecto todavía
  for (const [i, plan] of OCP_PLAN.entries()) {
    const olpDef = OLPS[i];
    for (const year of [2028, 2029, 2030]) {
      if (year > olpDef.year) continue;
      const frac = (year - 2027) / (olpDef.year - 2027);
      const meta = round(plan.meta[1] + (olpDef.target - plan.meta[1]) * frac, 1);
      await db.ocp.create({
        data: {
          ...O, olpId: olps[i].id, code: ocpCode(i + 1, year), description: `${olpDef.metric}: meta ${meta} ${olpDef.unit} al cierre de ${year}`, year,
          metaValue: meta, unit: olpDef.unit, responsibleAreaId: areas[olpDef.area].id, indicator: plan.ind, frequency: "trimestral", priority: "media", status: "borrador", sortOrder: i,
        },
      });
    }
  }

  for (const p of keptPresentations) await db.presentation.create({ data: { id: p.id, cycleId: CYCLE_ID, name: p.name, config: p.config } });

  console.log("Plan de Efameinsa creado:", {
    mefe: mefePpt, mefi: mefiPpt, mpc: mpcTotals, peyea: { x: round(vec.x), y: round(vec.y), cuadrante: vec.quadrant }, porter: round(Object.values(porter).map(avg).reduce((a, b) => a + b, 0) / 5),
    mcpe: ranking, kpisEnRojo: redKpis.length, proyectos: projects.length, tareas: await db.issue.count({ where: { project: { orgId: org.id } } }),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
