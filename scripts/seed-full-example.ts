// Ejemplo completo de punta a punta: una empresa con su plan estratégico lleno
// (M1 → M5), el Balanced Scorecard con datos reales y el portafolio de proyectos
// generado desde el plan, enriquecido con responsables, subtareas, horas,
// dependencias, comentarios y evidencias.
//
// Uso local:   npx tsx scripts/seed-full-example.ts
// Uso remoto:  ALLOW_REMOTE_SEED=1 SEED_FULL_PASSWORD=<clave> DATABASE_URL=<url> npx tsx scripts/seed-full-example.ts
//
// Es idempotente: si la organización "org-andina" ya existe, borra su ciclo y sus
// proyectos y los vuelve a crear.
import "dotenv/config";
import bcrypt from "bcryptjs";
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
if (!isLocal && !process.env.SEED_FULL_PASSWORD) {
  console.error("Base remota: define SEED_FULL_PASSWORD.");
  process.exit(1);
}
const PASSWORD = process.env.SEED_FULL_PASSWORD ?? "demo1234";
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const ORG_ID = "org-andina";
const CYCLE_ID = "cycle-andina";
const YEAR_START = 2025; // año base del diagnóstico; el horizonte del plan es 2026-2030
const YEAR_END = 2030;
const TODAY = new Date("2026-09-28T12:00:00Z");
const day = (s: string) => new Date(`${s}T12:00:00Z`);
const J = (v: unknown) => JSON.stringify(v);
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

async function main() {
  // ───────────────────────────────────────────── Organización y equipo
  const existing = await db.organization.findUnique({ where: { id: ORG_ID } });
  if (existing) {
    console.log("Limpiando el ejemplo anterior…");
    await db.project.deleteMany({ where: { orgId: ORG_ID } });
    await db.strategicCycle.deleteMany({ where: { organizationId: ORG_ID } });
  }
  const org = await db.organization.upsert({
    where: { id: ORG_ID },
    update: { name: "Andina Servicios Integrales S.A.C.", sector: "servicios" },
    create: { id: ORG_ID, name: "Andina Servicios Integrales S.A.C.", sector: "servicios", country: "PE", type: "privada" },
  });

  const hashed = await bcrypt.hash(PASSWORD, 10);
  const PEOPLE = [
    { key: "gg", email: "gerencia@andina.pe", name: "Rosa Quispe Huamán", area: "Gerencia General", orgRole: "PROPIETARIO" as const },
    { key: "com", email: "comercial@andina.pe", name: "Miguel Salazar Ríos", area: "Comercial", orgRole: "ADMINISTRADOR" as const },
    { key: "mkt", email: "marketing@andina.pe", name: "Valeria Torres Chávez", area: "Marketing", orgRole: "MIEMBRO" as const },
    { key: "ops", email: "operaciones@andina.pe", name: "Luis Mamani Condori", area: "Operaciones", orgRole: "MIEMBRO" as const },
    { key: "fin", email: "finanzas@andina.pe", name: "Carmen Paredes Vilca", area: "Finanzas", orgRole: "MIEMBRO" as const },
    { key: "rh", email: "talento@andina.pe", name: "Jorge Huertas Alva", area: "Gestión Humana", orgRole: "MIEMBRO" as const },
  ];
  const U: Record<string, { id: string; name: string }> = {};
  for (const p of PEOPLE) {
    const u = await db.user.upsert({
      where: { email: p.email },
      update: { name: p.name, area: p.area, hashedPassword: hashed, activeOrganizationId: org.id, organizationId: org.id, onboardingCompleted: true },
      create: {
        email: p.email, name: p.name, area: p.area, hashedPassword: hashed, role: "ADMIN",
        organizationId: org.id, activeOrganizationId: org.id, onboardingCompleted: true, onboardingStep: "DONE",
      },
    });
    await db.organizationMember.upsert({
      where: { userId_organizationId: { userId: u.id, organizationId: org.id } },
      update: { orgRole: p.orgRole },
      create: { userId: u.id, organizationId: org.id, orgRole: p.orgRole },
    });
    U[p.key] = u;
  }
  const O = { organizationId: org.id, cycleId: CYCLE_ID };

  const cycle = await db.strategicCycle.create({
    data: { id: CYCLE_ID, organizationId: org.id, name: "Plan Estratégico 2025-2030", yearStart: YEAR_START, yearEnd: YEAR_END, status: "IN_PROGRESS" },
  });

  // ───────────────────────────────────────────── M1 Identidad
  await db.vision.create({
    data: {
      ...O, isActive: true, timeHorizon: 2030, approvedById: U.gg.id, approvedAt: day("2026-01-20"),
      text: "Al 2030, ser la empresa de servicios integrales para edificios e industrias más confiable del Perú, reconocida por la calidad certificada de su operación, el cuidado de su gente y el uso de tecnología para anticiparse a las necesidades de sus clientes en Lima, Arequipa y Trujillo.",
    },
  });
  await db.mission.create({
    data: {
      ...O, isActive: true, approvedById: U.gg.id, approvedAt: day("2026-01-20"),
      text: "Brindamos servicios de limpieza profesional, mantenimiento y facility management a empresas corporativas, industriales y del sector público, con personal capacitado, procesos certificados y supervisión digital en tiempo real, generando espacios seguros y productivos para nuestros clientes, desarrollo para nuestros colaboradores y rentabilidad sostenible para nuestros accionistas.",
    },
  });
  const VALUES = [
    ["Integridad", "Actuamos con honestidad y transparencia en cada servicio.", "Reportamos incidencias sin ocultarlas; cumplimos lo que ofrecemos."],
    ["Seguridad primero", "Ninguna tarea vale más que la vida y la salud de las personas.", "Usamos siempre EPP; detenemos el trabajo ante un riesgo."],
    ["Excelencia en el servicio", "Superamos las expectativas del cliente con calidad medible.", "Medimos la satisfacción y corregimos en 24 horas."],
    ["Respeto por las personas", "Valoramos a cada colaborador y cliente sin distinción.", "Trato digno, pago puntual, escucha activa."],
    ["Innovación práctica", "Adoptamos tecnología que simplifica el trabajo.", "Supervisión digital, rutas optimizadas, mejora continua."],
  ];
  const values = [];
  for (const [i, [name, description, behaviors]] of VALUES.entries()) {
    values.push(await db.value.create({ data: { ...O, name, description, behaviors, sortOrder: i } }));
  }
  const ETHICS = [
    ["Clientes", "Tratamos la información y los espacios de nuestros clientes con absoluta confidencialidad."],
    ["Colaboradores", "Garantizamos condiciones laborales formales, seguras y libres de acoso."],
    ["Proveedores", "Seleccionamos proveedores por mérito, sin conflictos de interés ni dádivas."],
    ["Medio ambiente", "Priorizamos insumos biodegradables y la correcta disposición de residuos."],
  ];
  for (const [i, [category, description]] of ETHICS.entries()) await db.ethicsCode.create({ data: { ...O, category, description, sortOrder: i } });
  const INTERESTS = [
    ["Crecer en clientes corporativos e industriales de Lima y el sur", "vital", "Gremios empresariales, bancos", "Municipalidades", "Competidores informales"],
    ["Operar con procesos certificados en calidad y seguridad", "vital", "Certificadoras, clientes mineros", "Proveedores de insumos", "—"],
    ["Retener y desarrollar al personal operativo", "importante", "Institutos técnicos, SENATI", "Agencias de empleo", "Competidores que ofrecen más sueldo"],
    ["Digitalizar la supervisión del servicio", "importante", "Startups de software local", "Operadores de telecomunicaciones", "—"],
    ["Diversificar hacia mantenimiento técnico", "periférico", "Fabricantes de equipos", "—", "Empresas especializadas de mantenimiento"],
  ];
  for (const [i, [description, intensity, allies, neutrals, adversaries]] of INTERESTS.entries()) {
    await db.interest.create({ data: { ...O, description, intensity, allies, neutrals, adversaries, sortOrder: i } });
  }
  const CARDINAL = [
    ["influencia_terceras_partes", "Los grandes clientes mineros e industriales imponen estándares de seguridad que elevan la exigencia de todo el sector."],
    ["lazos_pasados_presentes", "Quince años de relación con clientes corporativos de San Isidro y Miraflores sostienen la reputación de la marca."],
    ["contrabalance_intereses", "El crecimiento debe equilibrar el costo laboral formal con la competencia de empresas informales."],
    ["conservacion_enemigos", "La competencia de empresas formales grandes obliga a innovar y a mejorar la eficiencia operativa."],
  ];
  for (const [type, description] of CARDINAL) await db.cardinalPrinciple.create({ data: { ...O, type, description } });

  // ───────────────────────────────────────────── M2 Diagnóstico externo
  // [variable, nombre del catálogo, tipo O/A, peso(slider 1-20), calificación 1-4, hallazgo]
  const PESTEC: [string, string, "O" | "A", number, number, string][] = [
    ["politico", "Legislacion laboral", "A", 9, 2, "La reforma de tercerización eleva los costos y la fiscalización de SUNAFIL sobre empresas de servicios."],
    ["politico", "Informalidad", "A", 8, 2, "El 70 % del mercado de limpieza es informal y compite con precios 30 % menores."],
    ["politico", "Seguridad juridica", "A", 6, 3, "La inestabilidad política retrasa licitaciones públicas de servicios generales."],
    ["economico", "PBI y tasa de crecimiento", "O", 10, 3, "El PBI crecerá 3,2 % en 2026 con impulso de construcción y minería."],
    ["economico", "Inflacion", "A", 6, 3, "La inflación controlada (2,4 %) permite contratos anuales con reajuste previsible."],
    ["economico", "Tipo de cambio", "A", 5, 3, "Los insumos químicos importados dependen del tipo de cambio."],
    ["economico", "Acceso al credito", "O", 7, 3, "Las tasas de leasing bajaron y facilitan renovar maquinaria de limpieza industrial."],
    ["social", "Estilos de vida y tendencias de consumo", "O", 8, 3, "Las empresas exigen espacios más higienizados y certificados tras la pandemia."],
    ["social", "Seguridad ciudadana", "A", 5, 2, "La inseguridad eleva el costo de transporte y los turnos nocturnos del personal."],
    ["tecnologico", "Nivel de automatizacion e industria 4.0", "O", 9, 2, "Robots de limpieza y sensores IoT reducen hasta 25 % el tiempo de operación."],
    ["tecnologico", "Adopcion de tecnologias moviles", "O", 7, 3, "El 95 % de supervisores usa smartphone: habilita la supervisión digital en campo."],
    ["ecologico", "Regulaciones medioambientales", "O", 6, 2, "Las nuevas normas de residuos favorecen a proveedores con insumos biodegradables."],
    ["ecologico", "Sostenibilidad y economia verde", "O", 5, 3, "Los clientes corporativos piden reportes ESG a sus proveedores."],
    ["competitivo", "Rivalidad entre competidores existentes", "A", 9, 2, "Tres grupos grandes compiten por las mismas cuentas corporativas con descuentos agresivos."],
  ];
  const pestecRows = [];
  for (const [i, [variable, description, type, impact, rating, hallazgo]] of PESTEC.entries()) {
    pestecRows.push(
      await db.pestecFactor.create({
        data: {
          ...O, variable, description, type, impact, rating, hallazgo, subVarType: "primaria",
          evidenceChips: J(i % 3 === 0 ? ["Informe sectorial", "Dato estadistico"] : ["Publicacion oficial"]),
          confirmed: true, includeInMefe: i < 12, sortOrder: i,
        },
      }),
    );
  }

  await db.porterAnalysis.create({
    data: {
      ...O,
      overallScore: 3.4,
      data: J({
        forces: {
          rivalidad: { values: { "riv-1": 4, "riv-2": 4, "riv-3": 3, "riv-4": 4, "riv-5": 4 }, saved: true },
          entrantes: { values: { "ent-1": 4, "ent-2": 3, "ent-3": 4, "ent-4": 3, "ent-5": 3 }, saved: true },
          sustitutos: { values: { "sus-1": 2, "sus-2": 3, "sus-3": 2, "sus-4": 3 }, saved: true },
          compradores: { values: { "com-1": 4, "com-2": 4, "com-3": 3, "com-4": 4, "com-5": 3 }, saved: true },
          proveedores: { values: { "prov-1": 2, "prov-2": 3, "prov-3": 2, "prov-4": 3, "prov-5": 2 }, saved: true },
        },
      }),
    },
  });

  // MEFE: 6 oportunidades + 6 amenazas, pesos que suman 1,00
  const MEFE: [string, "O" | "A", number, number, number][] = [
    // [descripción, tipo, peso, calificación, índice del factor PESTEC de origen]
    ["Crecimiento del PBI con impulso de construcción y minería", "O", 0.10, 3, 3],
    ["Mayor exigencia de higiene y certificación en empresas", "O", 0.09, 3, 7],
    ["Robots de limpieza y sensores IoT disponibles en el mercado", "O", 0.08, 2, 9],
    ["Supervisores con smartphone: supervisión digital viable", "O", 0.07, 3, 10],
    ["Leasing más barato para renovar maquinaria", "O", 0.06, 3, 6],
    ["Clientes corporativos exigen reportes ESG a proveedores", "O", 0.08, 2, 11],
    ["Mayor costo y fiscalización laboral de la tercerización", "A", 0.10, 2, 0],
    ["Competencia informal con precios 30 % menores", "A", 0.09, 2, 1],
    ["Rivalidad de grupos grandes con descuentos agresivos", "A", 0.10, 2, 13],
    ["Retraso de licitaciones públicas por inestabilidad política", "A", 0.07, 3, 2],
    ["Insumos importados sensibles al tipo de cambio", "A", 0.07, 3, 5],
    ["Inseguridad que encarece turnos nocturnos", "A", 0.09, 2, 8],
  ];
  const mefe: Awaited<ReturnType<typeof db.mefeFactor.create>>[] = [];
  for (const [i, [description, type, weight, rating, src]] of MEFE.entries()) {
    mefe.push(
      await db.mefeFactor.create({
        data: {
          ...O, description, originalDescription: description, type, weight, rating, score: round(weight * rating, 4),
          variable: pestecRows[src].variable, sourceFactorId: pestecRows[src].id, sortOrder: i,
        },
      }),
    );
  }
  const mefePpt = round(mefe.reduce((a, f) => a + f.score, 0), 2);
  await db.mefeState.create({ data: { ...O, status: "finalizada", pptFinal: mefePpt, finalizedAt: day("2026-03-10"), finalizedBy: U.gg.id } });

  const compValues = [8, 7, 6, 6, 5, 7, 6, 5, 7, 6];
  await db.competitiveAnalysis.create({
    data: { ...O, data: J(COMPETITIVE_CRITERIA.map((c, i) => ({ id: i + 1, label: c.nombre, value: compValues[i] ?? 6 }))) },
  });
  const attrScores = [7, 6, 7, 5, 6, 7, 6, 8, 5, 6, 7, 6, 5, 7, 6];
  await db.industryAttractiveness.create({
    data: { ...O, data: J(ATTRACTIVENESS_FACTORS.map((f, i) => ({ id: i + 1, factor: f.nombre, impulsor: f.impulsor, score: attrScores[i] ?? 6 }))) },
  });

  // MPC: factores clave de éxito y 4 competidores (incluida Andina)
  const MPC_FACTORS: [string, number][] = [
    ["Calidad y consistencia del servicio", 0.22],
    ["Precio competitivo", 0.18],
    ["Cobertura geográfica", 0.14],
    ["Certificaciones de calidad y seguridad", 0.16],
    ["Tecnología de supervisión", 0.12],
    ["Rotación y capacitación del personal", 0.18],
  ];
  const mpcDefs = [];
  for (const [i, [name, weight]] of MPC_FACTORS.entries()) mpcDefs.push(await db.mpcFactorDef.create({ data: { ...O, name, weight, sortOrder: i } }));
  const MPC_COMP: [string, boolean, number[]][] = [
    ["Andina Servicios Integrales", true, [3, 3, 2, 2, 2, 2]],
    ["Grupo Limpieza Total", false, [3, 2, 4, 3, 3, 2]],
    ["Servicios Generales del Pacífico", false, [2, 4, 3, 2, 1, 2]],
    ["Facility Pro Perú", false, [4, 2, 2, 4, 3, 3]],
  ];
  for (const [i, [name, isOwnOrg, ratings]] of MPC_COMP.entries()) {
    const c = await db.mpcCompetitor.create({ data: { ...O, name, isOwnOrg, sortOrder: i } });
    let total = 0;
    for (const [j, def] of mpcDefs.entries()) {
      const score = round(def.weight * ratings[j], 4);
      total += score;
      await db.mpcScore.create({ data: { competitorId: c.id, factorDefId: def.id, rating: ratings[j], score } });
    }
    await db.mpcCompetitor.update({ where: { id: c.id }, data: { totalScore: round(total, 2) } });
  }

  // ───────────────────────────────────────────── M2 Diagnóstico interno (AMOFHIT)
  const AREA_BIAS: Record<string, number[]> = {
    A: [3, 3, 2, 3, 4, 3, 2, 3], M: [3, 2, 3, 2, 3], O: [3, 4, 2, 3], F: [3, 2, 3, 2], H: [2, 2, 3], I: [2, 3, 2], T: [2, 1, 2],
  };
  for (const [areaKey, area] of Object.entries(AMOFHIT_EVALUATION_DATA)) {
    const findings: Record<string, unknown> = {};
    const scores: number[] = [];
    let k = 0;
    for (const sec of area.secciones) {
      for (const v of sec.variables) {
        const bias = AREA_BIAS[areaKey] ?? [3];
        const score = bias[k % bias.length];
        k++;
        scores.push(score);
        findings[v.id] = {
          score,
          hallazgo: v.hallazgos[score as 1 | 2 | 3 | 4],
          evidenceChips: v.chipsEvidencia.slice(0, 2),
          evidenceNotes: "",
          evidenceFiles: [],
          confirmed: true,
          includeInMefi: score === 1 || score === 4,
        };
      }
    }
    await db.amofhitArea.create({
      data: { ...O, area: areaKey, findings: J(findings), score: round(scores.reduce((a, b) => a + b, 0) / scores.length, 2), notes: `Evaluación de ${area.nombre} validada con la gerencia.` },
    });
  }
  const firstVar = (a: string, n = 0) => AMOFHIT_EVALUATION_DATA[a].secciones.flatMap((s) => s.variables)[n]?.id ?? null;
  // MEFI: 6 fortalezas + 6 debilidades
  const MEFI: [string, "F" | "D", number, number, string, number][] = [
    ["Cartera de 120 clientes corporativos con contratos de más de 3 años", "F", 0.10, 4, "M", 0],
    ["Procesos operativos estandarizados en limpieza corporativa", "F", 0.09, 4, "O", 1],
    ["Liderazgo de la gerencia general con planeamiento formal", "F", 0.08, 3, "A", 0],
    ["Solvencia financiera y bajo endeudamiento", "F", 0.08, 3, "F", 0],
    ["Marca reconocida en San Isidro y Miraflores", "F", 0.07, 3, "M", 2],
    ["Buena relación con proveedores de insumos biodegradables", "F", 0.06, 3, "O", 0],
    ["Alta rotación del personal operativo (32 % anual)", "D", 0.11, 1, "H", 0],
    ["Supervisión en papel, sin datos en tiempo real", "D", 0.10, 1, "T", 1],
    ["Sin certificaciones ISO 9001 ni ISO 45001", "D", 0.09, 2, "O", 2],
    ["Cobertura limitada fuera de Lima", "D", 0.08, 2, "M", 1],
    ["Sistemas de información aislados (Excel por área)", "D", 0.07, 1, "I", 0],
    ["Margen EBITDA bajo (11 %) frente al sector", "D", 0.07, 2, "F", 1],
  ];
  const mefi: Awaited<ReturnType<typeof db.mefiFactor.create>>[] = [];
  for (const [i, [description, type, weight, rating, area, vi]] of MEFI.entries()) {
    mefi.push(
      await db.mefiFactor.create({
        data: {
          ...O, description, originalDescription: description, type, weight, rating, score: round(weight * rating, 4), area,
          sourceVariableId: firstVar(area, vi), sortOrder: i,
        },
      }),
    );
  }
  const mefiPpt = round(mefi.reduce((a, f) => a + f.score, 0), 2);
  await db.mefiState.create({ data: { ...O, status: "finalizada", pptFinal: mefiPpt, finalizedAt: day("2026-03-18"), finalizedBy: U.gg.id } });
  await db.areaSynthesis.create({ data: { ...O, area: "H", text: "La rotación del personal operativo es la principal debilidad interna; impacta calidad y costos de reclutamiento.", version: 1 } }).catch(() => undefined);

  if ((await db.ratioMaster.count()) > 0) {
    const METRICS: [string, number][] = [["F.REN.ROE", 14.5], ["F.LIQ.CURRENT_RATIO", 1.6], ["F.REN.EBITDA_MARGIN", 11], ["F.END.DEBT_TO_EQUITY", 0.6], ["F.LIQ.QUICK_RATIO", 1.2]];
    for (const [ratioKey, value] of METRICS) {
      if (await db.ratioMaster.findUnique({ where: { key: ratioKey } })) {
        await db.companyMetric.create({ data: { cycleId: CYCLE_ID, ratioKey, value, year: 2025 } });
      }
    }
  }

  // Códigos F1..F6, D1..D6, O1..O6, A1..A6 como los muestra la app (orden por tipo y sortOrder)
  const code = (list: { id: string; type: string; description: string }[], t: string, i: number) => {
    const f = list.filter((x) => x.type === t)[i];
    return { factorType: t, factorId: f.id, factorCode: `${t}${i + 1}`, factorText: f.description };
  };
  const F = (i: number) => code(mefi, "F", i);
  const D = (i: number) => code(mefi, "D", i);
  const Op = (i: number) => code(mefe, "O", i);
  const A = (i: number) => code(mefe, "A", i);

  // ───────────────────────────────────────────── M3 Formulación
  const OLPS = [
    { dim: "FIN", desc: "Al 2030, alcanzar ventas anuales de S/ 60 millones, desde S/ 28 millones en 2025.", metric: "Ventas anuales", cur: 28, target: 60, unit: "millones S/", resp: "Gerencia Comercial", area: "comercial" },
    { dim: "FIN", desc: "Al 2030, lograr un margen EBITDA de 18 %, desde 11 % en 2025.", metric: "Margen EBITDA", cur: 11, target: 18, unit: "%", resp: "Gerencia de Finanzas", area: "finanzas" },
    { dim: "CLI", desc: "Al 2030, alcanzar 12 % de participación en facility management corporativo en Lima.", metric: "Participación de mercado", cur: 5, target: 12, unit: "%", resp: "Gerencia Comercial", area: "comercial" },
    { dim: "CLI", desc: "Al 2029, lograr un Net Promoter Score de 70 puntos entre clientes corporativos.", metric: "NPS", cur: 38, target: 70, unit: "puntos", resp: "Gerencia de Marketing", area: "marketing" },
    { dim: "INT", desc: "Al 2028, certificar ISO 9001 e ISO 45001 en las 3 sedes (Lima, Arequipa y Trujillo).", metric: "Sedes certificadas", cur: 0, target: 3, unit: "sedes", resp: "Gerencia de Operaciones", area: "operaciones" },
    { dim: "INT", desc: "Al 2030, reducir el tiempo de atención de incidencias de 48 a 12 horas.", metric: "Tiempo de atención", cur: 48, target: 12, unit: "horas", resp: "Gerencia de Operaciones", area: "operaciones", lower: true },
    { dim: "APR", desc: "Al 2030, reducir la rotación anual del personal operativo de 32 % a 12 %.", metric: "Rotación anual", cur: 32, target: 12, unit: "%", resp: "Gestión Humana", area: "rrhh", lower: true },
    { dim: "APR", desc: "Al 2030, que el 100 % de supervisores culmine el programa de liderazgo y seguridad.", metric: "Supervisores certificados", cur: 15, target: 100, unit: "%", resp: "Gestión Humana", area: "rrhh" },
  ];
  const olps = [];
  for (const [i, o] of OLPS.entries()) {
    olps.push(
      await db.olp.create({
        data: {
          ...O, description: o.desc, metric: o.metric, currentValue: o.cur, targetValue: o.target, unit: o.unit,
          bscPerspective: o.dim, responsible: o.resp, priority: i % 3 === 2 ? "media" : "alta", targetYear: o.dim === "INT" && i === 4 ? 2028 : 2030, sortOrder: i,
        },
      }),
    );
  }
  // Referencias FODA de cada OLP
  const OLP_REFS = [[F(0), Op(0)], [F(3), D(5)], [F(4), Op(1)], [F(0), A(2)], [D(2), Op(1)], [D(1), Op(3)], [D(0), A(0)], [F(2), D(0)]];
  for (const [i, refs] of OLP_REFS.entries()) {
    for (const r of refs) await db.olpReference.create({ data: { olpId: olps[i].id, refType: r.factorType, refId: r.factorId, refCode: r.factorCode, refText: r.factorText } });
  }

  // FODA cruzado (2 estrategias por cuadrante) + derivadas de PEYEA, IE y GE
  const STRATS: { code: string; q: string; type: string; desc: string; origins: ReturnType<typeof F>[]; olp: number[]; horizon: string; dalessio: string }[] = [
    { code: "E1", q: "FO", type: "Penetracion de mercado", desc: "Ampliar la venta de servicios integrales a la cartera corporativa actual aprovechando el crecimiento de construcción y minería.", origins: [F(0), Op(0)], olp: [0, 2], horizon: "corto", dalessio: "penetracion_mercado" },
    { code: "E2", q: "FO", type: "Desarrollo de mercado", desc: "Abrir operaciones en Arequipa y Trujillo con clientes mineros e industriales.", origins: [F(1), Op(0)], olp: [0, 2], horizon: "mediano", dalessio: "desarrollo_mercado" },
    { code: "E3", q: "FA", type: "Desarrollo de producto", desc: "Crear paquetes de limpieza certificada con reporte ESG para diferenciarse de la competencia informal.", origins: [F(5), A(1)], olp: [3, 1], horizon: "corto", dalessio: "desarrollo_producto" },
    { code: "E4", q: "FA", type: "Aventura conjunta", desc: "Alianza con un proveedor de robots de limpieza para ofrecer servicios de alta eficiencia.", origins: [F(3), A(2)], olp: [1, 5], horizon: "mediano", dalessio: "aventura_conjunta" },
    { code: "E5", q: "DO", type: "Integracion horizontal", desc: "Implementar supervisión digital en campo con app móvil y sensores IoT.", origins: [D(1), Op(3)], olp: [5, 3], horizon: "corto", dalessio: "integracion_horizontal" },
    { code: "E6", q: "DO", type: "Desarrollo de producto", desc: "Certificar ISO 9001 e ISO 45001 para acceder a licitaciones de grandes clientes.", origins: [D(2), Op(1)], olp: [4], horizon: "mediano", dalessio: "desarrollo_producto" },
    { code: "E7", q: "DA", type: "Atrincheramiento", desc: "Programa de retención: línea de carrera, bonos por permanencia y escuela de supervisores.", origins: [D(0), A(0)], olp: [6, 7], horizon: "corto", dalessio: "atrincheramiento" },
    { code: "E8", q: "DA", type: "Desinversion", desc: "Salir de contratos de bajo margen con el Estado para concentrar recursos en el sector privado.", origins: [D(5), A(3)], olp: [1], horizon: "corto", dalessio: "desinversion" },
  ];
  const strategies: { id: string; code: string }[] = [];
  for (const [i, s] of STRATS.entries()) {
    const st = await db.strategy.create({
      data: {
        ...O, code: s.code, description: s.desc, swotQuadrant: s.q, crossType: s.q, type: s.type, horizon: s.horizon,
        priority: i < 6 ? "alta" : "media", justification: `Combina ${s.origins.map((o) => o.factorCode).join(" + ")}.`,
        status: s.code === "E8" ? "descartada" : "retenida", sortOrder: i,
      },
    });
    for (const o of s.origins) await db.strategyOrigin.create({ data: { strategyId: st.id, ...o } });
    for (const oi of s.olp) await db.strategyOlp.create({ data: { strategyId: st.id, olpId: olps[oi].id } });
    strategies.push({ id: st.id, code: s.code });
  }
  const derived = [
    { type: "PEYEA", q: "DERIVED_PEYEA", desc: "Agresivo: Penetración de mercado en segmentos corporativos de alto consumo." },
    { type: "PEYEA", q: "DERIVED_PEYEA", desc: "Agresivo: Desarrollo de mercado en el sur del país." },
    { type: "IE", q: "DERIVED_IE", desc: "Crecer y construir: desarrollo de mercado y de producto." },
    { type: "GE", q: "DERIVED_GE", desc: "Invertir para crecer en servicios certificados de alto valor." },
  ];
  const derivedRows = [];
  for (const [i, d] of derived.entries()) {
    derivedRows.push(await db.strategy.create({ data: { ...O, description: d.desc, swotQuadrant: d.q, type: d.type, priority: "alta", status: "proposed", sortOrder: 20 + i } }));
  }

  // PEYEA con el vector calculado por la misma función de la app
  const PEYEA_SCORES: Record<string, number> = {
    "FF.ROE": 4, "FF.LEVERAGE": 5, "FF.LIQUIDITY": 4, "FF.CASH_FLOW": 3, "FF.WORKING_CAPITAL": 4, "FF.RISK": 4, "FF.EXIT": 3,
    "VC.MARKET_SHARE": 3, "VC.QUALITY": 5, "VC.LOYALTY": 5, "VC.TECH_KNOW": 2, "VC.SUPPLIER_CONTROL": 4, "VC.LIFECYCLE": 4, "VC.INNOVATION_SPEED": 3,
    "EE.TECH_CHANGE": 4, "EE.DEMAND_VAR": 5, "EE.COMPETITION": 2, "EE.ENTRY_BARRIERS": 2, "EE.INFLATION": 5, "EE.FX_RISK": 4,
    "FI.GROWTH": 5, "FI.PROFIT": 4, "FI.STABILITY": 4, "FI.TECH_KNOW": 3, "FI.RESOURCE_USE": 4, "FI.ENTRY_EASE": 4,
  };
  const dimRows = (dim: "FF" | "VC" | "EE" | "FI") =>
    PEYEA_CATALOG.filter((v) => v.dimension === dim).map((v) => ({ key: v.key, factor: v.name, score: PEYEA_SCORES[v.key] ?? 3, modified: true }));
  const pv = { FF: dimRows("FF"), VC: dimRows("VC"), EE: dimRows("EE"), FI: dimRows("FI") };
  const vec = computeVector({ FF: pv.FF.map((r) => r.score), VC: pv.VC.map((r) => r.score), EE: pv.EE.map((r) => r.score), FI: pv.FI.map((r) => r.score) });
  await db.peyeaAnalysis.create({
    data: {
      ...O, financialStrength: J(pv.FF), competitiveAdvantage: J(pv.VC), environmentalStability: J(pv.EE), industryStrength: J(pv.FI),
      vectorX: round(vec.x), vectorY: round(vec.y), quadrant: vec.quadrant,
    },
  });

  // MD: estrategias consolidadas (las 8 del FODA cruzado)
  const consolidated = [];
  for (const [i, s] of STRATS.entries()) {
    const extra = i === 0 ? [derivedRows[0]] : i === 1 ? [derivedRows[1], derivedRows[2]] : i === 5 ? [derivedRows[3]] : [];
    const c = await db.consolidatedStrategy.create({
      data: {
        cycleId: CYCLE_ID, code: s.code, text: s.desc, type: s.type, dalessioType: s.dalessio,
        responsible: OLPS[s.olp[0]].resp, priority: i < 6 ? "alta" : "media",
        status: s.code === "E8" ? "descartada" : "retenida", totalAppearances: 1 + (extra.length > 0 ? 1 : 0) + (i === 1 ? 1 : 0),
        priorityScore: round(4 - i * 0.3), sortOrder: i,
      },
    });
    await db.consolidatedStrategyOrigin.create({ data: { consolidatedId: c.id, sourceStrategyId: strategies[i].id, sourceMatrix: "foda_cruzado", sourceText: s.desc, sourceCode: s.code } });
    for (const d of extra) {
      await db.consolidatedStrategyOrigin.create({ data: { consolidatedId: c.id, sourceStrategyId: d.id, sourceMatrix: (d.type ?? "foda").toLowerCase(), sourceText: d.description } });
    }
    for (const oi of s.olp) await db.consolidatedStrategyOlp.create({ data: { consolidatedId: c.id, olpId: olps[oi].id, origin: "user" } });
    consolidated.push(c);
  }

  // MCPE: atractivo de cada estrategia frente a cada factor
  const mcpe = await db.mcpeAnalysis.create({ data: { cycleId: CYCLE_ID, status: "completo", progress: 100 } });
  const factors = [...mefi.map((f) => ({ ...f, t: f.type })), ...mefe.map((f) => ({ ...f, t: f.type }))];
  for (const [ci, c] of consolidated.entries()) {
    const data = factors.map((f, fi) => {
      const pa = ((ci + fi) % 4) + 1 === 1 && ci < 6 ? 3 : ((ci * 3 + fi) % 4) + 1;
      return { analysisId: mcpe.id, factorId: f.id, factorType: f.t, consolidatedId: c.id, pa, pta: round(f.weight * pa, 4), origin: "suggested_accepted" };
    });
    await db.mcpeRating.createMany({ data });
  }

  // Rumelt: 7 aprobadas y 1 rechazada (E8)
  const CRITERIA = ["consistencia", "consonancia", "ventaja", "factibilidad"];
  for (const [ci, c] of consolidated.entries()) {
    const rejected = STRATS[ci].code === "E8";
    const ev = await db.rumeltEvaluation.create({
      data: { cycleId: CYCLE_ID, consolidatedId: c.id, status: rejected ? "rechazada" : "aprobada", autoVerdict: rejected ? "rechazada" : "aprobada", finalVerdict: rejected ? "rechazada" : "aprobada" },
    });
    for (const [k, criterion] of CRITERIA.entries()) {
      const passes = rejected ? k < 2 : true;
      await db.rumeltCriterion.create({
        data: { evaluationId: ev.id, criterion, passes, justification: passes ? "Cumple el criterio según el análisis del comité." : "No genera ventaja sostenible ni es factible con los recursos actuales." },
      });
    }
  }

  // Ética: las aprobadas por Rumelt; E7 requiere un mitigante
  let mitigantId: string | null = null;
  for (const [ci, c] of consolidated.entries()) {
    if (STRATS[ci].code === "E8") continue;
    const withMitigant = STRATS[ci].code === "E4";
    const ev = await db.ethicsEvaluation.create({
      data: {
        cycleId: CYCLE_ID, consolidatedId: c.id, status: withMitigant ? "aprobada_con_mitigantes" : "aprobada",
        autoVerdict: withMitigant ? "requiere_mitigantes" : "aprobada", finalVerdict: withMitigant ? "aprobada_con_mitigantes" : "aprobada",
      },
    });
    for (const [pi, p] of ETHICS_PRINCIPLES.entries()) {
      const rating = withMitigant && p.key === "jus.compensacion" ? "viola" : (pi + ci) % 3 === 0 ? "promueve" : "neutral";
      const pr = await db.ethicsPrinciple.create({
        data: {
          evaluationId: ev.id, block: p.block, principleKey: p.key, rating,
          justification: rating === "viola" ? "La automatización puede reducir puestos operativos sin compensación." : rating === "promueve" ? "Mejora las condiciones y la seguridad del personal." : null,
        },
      });
      if (rating === "viola") {
        const m = await db.ethicsMitigant.create({
          data: {
            evaluationId: ev.id, principleId: pr.id,
            text: "Reubicar y reentrenar como operadores técnicos a todo colaborador cuyo puesto sea automatizado, sin reducción de sueldo.",
            responsible: "Gestión Humana", deadline: "previo_lanzamiento", indicator: "% de colaboradores reubicados", postSeverity: "neutral",
          },
        });
        mitigantId = m.id;
      }
    }
  }
  await db.peiDocument.create({
    data: {
      cycleId: CYCLE_ID,
      customExecutiveSummary:
        "Andina Servicios Integrales duplicará sus ventas al 2030 creciendo en clientes corporativos e industriales de Lima y el sur, con operación certificada, supervisión digital y un equipo estable. Siete estrategias retenidas se despliegan en objetivos de corto plazo, políticas, estructura y recursos, y se controlan con un Balanced Scorecard trimestral.",
    },
  });

  // ───────────────────────────────────────────── M4 Implementación
  const AREAS = [
    ["gerencia-general", "Gerencia General", "Crown"], ["comercial", "Comercial / Ventas", "TrendingUp"], ["marketing", "Marketing", "Megaphone"],
    ["operaciones", "Operaciones / Producción", "Factory"], ["finanzas", "Finanzas", "Wallet"], ["rrhh", "Recursos Humanos", "Users"],
    ["tecnologia", "Tecnología / I+D", "Cpu"], ["calidad", "Calidad", "ShieldCheck"],
  ];
  const areas: Record<string, { id: string }> = {};
  for (const [i, [key, name, icon]] of AREAS.entries()) areas[key] = await db.ocpArea.create({ data: { ...O, key, name, icon, kind: "predefined", sortOrder: i } });

  // Metas anuales por OLP (2026 y 2027) y acciones trimestrales
  const OCP_PLAN: { meta: [number, number]; d: [string, string]; ind: string; support: string[]; actions: [string, string][] }[] = [
    { meta: [34, 40], d: ["Incrementar las ventas anuales a S/ 34 millones", "Incrementar las ventas anuales a S/ 40 millones"], ind: "Ventas anuales (millones S/)", support: ["marketing"],
      actions: [["Q1", "Segmentar la cartera y definir cuotas por ejecutivo"], ["Q2", "Lanzar el programa de venta cruzada a clientes actuales"], ["Q3", "Cerrar 15 nuevos contratos corporativos"], ["Q4", "Renovar el 90 % de contratos que vencen"]] },
    { meta: [12.5, 14], d: ["Elevar el margen EBITDA a 12,5 %", "Elevar el margen EBITDA a 14 %"], ind: "Margen EBITDA (%)", support: ["operaciones"],
      actions: [["Q1", "Costeo por contrato y ranking de rentabilidad"], ["Q2", "Renegociar compras de insumos con 3 proveedores"], ["Q3", "Optimizar rutas y turnos del personal"], ["Q4", "Salir de 5 contratos de margen negativo"]] },
    { meta: [6.5, 8], d: ["Alcanzar 6,5 % de participación en Lima", "Alcanzar 8 % de participación en Lima"], ind: "Participación de mercado (%)", support: ["comercial"],
      actions: [["Q1", "Estudio de mercado de facility management en Lima"], ["Q2", "Campaña digital para gerentes de administración"], ["Q3", "Participar en 2 ferias del sector inmobiliario"], ["Q4", "Programa de referidos con incentivos"]] },
    { meta: [48, 56], d: ["Elevar el NPS de clientes a 48 puntos", "Elevar el NPS de clientes a 56 puntos"], ind: "NPS (puntos)", support: ["operaciones"],
      actions: [["Q1", "Implementar la encuesta NPS después de cada servicio"], ["Q2", "Rediseñar el protocolo de atención al cliente"], ["Q3", "Visitas trimestrales de la gerencia a cuentas clave"], ["Q4", "Programa de fidelización para clientes recurrentes"]] },
    { meta: [1, 2], d: ["Certificar ISO 9001 en la sede Lima", "Certificar ISO 9001 e ISO 45001 en Arequipa"], ind: "Sedes certificadas", support: ["calidad", "rrhh"],
      actions: [["Q1", "Diagnóstico de brechas frente a ISO 9001"], ["Q2", "Documentar procesos y procedimientos"], ["Q3", "Capacitar a supervisores y auditoría interna"], ["Q4", "Auditoría de certificación"]] },
    { meta: [36, 28], d: ["Reducir el tiempo de atención de incidencias a 36 horas", "Reducir el tiempo de atención de incidencias a 28 horas"], ind: "Tiempo de atención (horas)", support: ["tecnologia"],
      actions: [["Q1", "Mapear el flujo actual de incidencias"], ["Q2", "Piloto de la app de supervisión digital en 10 sedes"], ["Q3", "Desplegar la app en todas las sedes de Lima"], ["Q4", "Tablero de incidencias en tiempo real"]] },
    { meta: [26, 21], d: ["Reducir la rotación del personal operativo a 26 %", "Reducir la rotación del personal operativo a 21 %"], ind: "Rotación anual (%)", support: ["gerencia-general"],
      actions: [["Q1", "Encuesta de clima y entrevistas de salida"], ["Q2", "Línea de carrera para operarios"], ["Q3", "Bono por permanencia y reconocimiento mensual"], ["Q4", "Medir el clima y ajustar el plan"]] },
    { meta: [40, 60], d: ["Que el 40 % de supervisores culmine el programa de liderazgo", "Que el 60 % de supervisores culmine el programa de liderazgo"], ind: "Supervisores certificados (%)", support: ["operaciones"],
      actions: [["Q1", "Diseñar la escuela de supervisores con un instituto aliado"], ["Q2", "Primera promoción: 25 supervisores"], ["Q3", "Evaluación de desempeño post programa"], ["Q4", "Segunda promoción: 30 supervisores"]] },
  ];
  // Estado de cada acción de 2026 a hoy (28 de setiembre): Q1-Q2 hechas, Q3 en curso, Q4 pendiente
  const status2026 = (q: string, i: number) =>
    q === "Q1" ? "completada" : q === "Q2" ? (i === 5 ? "en_curso" : "completada") : q === "Q3" ? ([0, 3, 7].includes(i) ? "completada" : "en_curso") : "pendiente";
  const ocps: { id: string; olp: number; year: number; meta: number; code: string }[] = [];
  const BUDGET = [180000, 60000, 95000, 40000, 120000, 150000, 85000, 70000];
  for (const [i, plan] of OCP_PLAN.entries()) {
    for (const [yi, year] of [2026, 2027].entries()) {
      const ocp = await db.ocp.create({
        data: {
          ...O, olpId: olps[i].id, code: `OCP${i + 1}.${year - YEAR_START}`, description: plan.d[yi], year, metaValue: plan.meta[yi], unit: OLPS[i].unit,
          responsibleAreaId: areas[OLPS[i].area].id, indicator: plan.ind, frequency: "trimestral", priority: i < 6 ? "alta" : "media",
          status: year === 2026 ? "en_ejecucion" : "definido", sortOrder: i,
          actions: {
            create: plan.actions.map(([q, d], k) => ({
              quarter: q, description: year === 2026 ? d : `${d} (segunda etapa)`, status: year === 2026 ? status2026(q, i) : "pendiente", sortOrder: k,
            })),
          },
          resource: { create: { budgetEstimate: BUDGET[i] * (yi ? 1.2 : 1), budgetCurrency: "PEN", ftesRequired: 1 + (i % 3), techRequired: i === 5 ? "App móvil de supervisión, sensores IoT" : null } },
        },
      });
      for (const s of plan.support) await db.ocpAreaSupport.create({ data: { ocpId: ocp.id, areaId: areas[s].id } });
      for (const [si, s] of STRATS.entries()) if (s.olp.includes(i) && s.code !== "E8") await db.ocpStrategy.create({ data: { ocpId: ocp.id, strategyId: strategies[si].id } });
      ocps.push({ id: ocp.id, olp: i, year, meta: plan.meta[yi], code: ocp.code });
    }
  }

  // Políticas confirmadas
  const POLICIES: { code: string; cat: string; name: string; text: string; strat: number[]; olp: number[]; vals: number[]; mandatory?: boolean }[] = [
    { code: "POL-GEN-01", cat: "general", name: "Crecimiento rentable", text: "Todo nuevo contrato debe proyectar un margen EBITDA igual o superior al 12 %.", strat: [0, 1], olp: [0, 1], vals: [2] },
    { code: "POL-COM-01", cat: "comercial", name: "Foco en el sector privado", text: "Priorizar clientes corporativos e industriales; las licitaciones públicas requieren aprobación de la gerencia general.", strat: [0, 1], olp: [0, 2], vals: [0] },
    { code: "POL-OPE-01", cat: "operacional", name: "Operación estandarizada y certificada", text: "Cada servicio se ejecuta con el procedimiento documentado vigente y su lista de verificación digital.", strat: [5, 4], olp: [4, 5], vals: [2, 4] },
    { code: "POL-RHU-01", cat: "rrhh", name: "Desarrollo y permanencia del talento", text: "Toda vacante de supervisor se cubre primero con personal interno formado en la escuela de supervisores.", strat: [6], olp: [6, 7], vals: [3] },
    { code: "POL-TEC-01", cat: "tecnologia", name: "Datos en tiempo real", text: "Toda incidencia se registra en la app de supervisión en el momento en que ocurre.", strat: [4], olp: [5], vals: [4] },
    { code: "POL-FIN-01", cat: "financiera", name: "Disciplina de inversión", text: "Las inversiones mayores a S/ 50 000 requieren evaluación de retorno y aprobación del comité.", strat: [3], olp: [1], vals: [0] },
    { code: "POL-ETI-01", cat: "etica_social", name: "Automatización responsable", text: "Ningún colaborador pierde su empleo por automatización: se le reubica y reentrena sin reducción de sueldo.", strat: [3], olp: [6], vals: [3], mandatory: true },
  ];
  const policies = [];
  for (const [i, p] of POLICIES.entries()) {
    const pol = await db.politica.create({
      data: {
        ...O, code: p.code, category: p.cat, name: p.name, enunciado: p.text, justification: "Deriva de las estrategias retenidas del plan.",
        origin: p.mandatory ? "mitigant" : "suggested", ethicsMitigantId: p.mandatory ? mitigantId : null, mandatory: !!p.mandatory,
        scope: "toda_organizacion", responsible: OLPS[p.olp[0]].resp, indicator: OCP_PLAN[p.olp[0]].ind, reviewFrequency: "anual",
        validFrom: day("2026-02-01"), nextReview: day("2027-02-01"), status: "confirmada", sortOrder: i,
      },
    });
    for (const s of p.strat) await db.policyStrategy.create({ data: { politicaId: pol.id, strategyId: strategies[s].id } });
    for (const s of p.strat) await db.policyConsolidatedStrategy.create({ data: { politicaId: pol.id, consolidatedStrategyId: consolidated[s].id } });
    for (const oi of p.olp) for (const o of ocps.filter((x) => x.olp === oi)) await db.policyOcp.create({ data: { politicaId: pol.id, ocpId: o.id } });
    for (const v of p.vals) await db.policyValue.create({ data: { politicaId: pol.id, valueId: values[v].id } });
    policies.push(pol);
  }

  // Estructura organizacional
  const structure = await db.orgStructure.create({ data: { ...O, type: "funcional", name: "Estructura funcional 2026", status: "confirmada" } });
  const NODES: [string, string, string, number, string, string | null][] = [
    ["DIR", "Directorio", "directorio", 0, "Presidente del directorio", null],
    ["GG", "Gerencia General", "ceo", 1, "Gerente general", "DIR"],
    ["GCOM", "Gerencia Comercial", "gerencia", 2, "Gerente comercial", "GG"],
    ["GMKT", "Gerencia de Marketing", "gerencia", 2, "Gerente de marketing", "GG"],
    ["GOPE", "Gerencia de Operaciones", "gerencia", 2, "Gerente de operaciones", "GG"],
    ["GFIN", "Gerencia de Finanzas", "gerencia", 2, "Gerente de finanzas", "GG"],
    ["GRH", "Gestión Humana", "gerencia", 2, "Jefe de gestión humana", "GG"],
    ["JCAL", "Jefatura de Calidad y SST", "jefatura", 3, "Jefe de calidad", "GOPE"],
    ["JTI", "Jefatura de Tecnología", "jefatura", 3, "Jefe de TI", "GOPE"],
    ["CEST", "Comité de Estrategia", "comite", 2, "Gerente general", "GG"],
  ];
  const nodes: Record<string, { id: string }> = {};
  for (const [i, [codeN, name, nodeType, lvl, role, parent]] of NODES.entries()) {
    nodes[codeN] = await db.orgNode.create({
      data: { structureId: structure.id, code: codeN, name, nodeType, hierarchyLevel: lvl, responsibleRole: role, positionX: (i % 5) * 220, positionY: lvl * 140, origin: "auto_generated", ftesEstimated: lvl >= 2 ? 3 + i : 1 },
    });
    if (parent) {
      await db.orgRelation.create({ data: { structureId: structure.id, parentNodeId: nodes[parent].id, childNodeId: nodes[codeN].id, relationType: nodeType === "comite" ? "coordinacion" : "reporta_directo" } });
    }
  }
  const AREA_NODE: Record<string, string> = { comercial: "GCOM", marketing: "GMKT", operaciones: "GOPE", finanzas: "GFIN", rrhh: "GRH" };
  for (const o of ocps) {
    await db.orgNodeOcp.create({ data: { nodeId: nodes[AREA_NODE[OLPS[o.olp].area]].id, ocpId: o.id, raciRole: "R", origin: "auto_generated" } });
    await db.orgNodeOcp.create({ data: { nodeId: nodes.GG.id, ocpId: o.id, raciRole: "A", origin: "auto_generated" } });
  }
  for (const p of policies) await db.orgNodePolicy.create({ data: { nodeId: nodes.GG.id, politicaId: p.id } });

  // Recursos (7M)
  const plan7m = await db.resourcePlan.create({ data: { ...O, horizonStart: 2026, horizonEnd: 2030, currency: "PEN", status: "confirmado" } });
  const NEEDS: [string, string, number, number, string, string][] = [
    ["money", "Capital de trabajo para la expansión a Arequipa y Trujillo", 450000, 300000, "comprometida", "medio"],
    ["manpower", "Supervisores y operarios para las nuevas sedes", 380000, 120000, "en_gestion", "alto"],
    ["machines", "Máquinas fregadoras industriales y robots de limpieza", 260000, 260000, "asegurada", "bajo"],
    ["materials", "Insumos biodegradables certificados", 120000, 60000, "comprometida", "bajo"],
    ["methods", "Consultoría de implementación ISO 9001 e ISO 45001", 85000, 85000, "asegurada", "medio"],
    ["mentality", "Escuela de supervisores y programa de cultura de seguridad", 70000, 20000, "planeada", "medio"],
    ["medio_ambiente", "Gestión de residuos y reporte ESG", 30000, 0, "faltante", "alto"],
  ];
  let total = 0;
  for (const [category, description, amount, secured, provisionStatus, riskLevel] of NEEDS) {
    total += amount;
    const need = await db.resourceNeed.create({ data: { planId: plan7m.id, category, description, yearStart: 2026, yearEnd: 2028, amountEstimated: amount, amountSecured: secured, provisionStatus, riskLevel, origin: "auto_generated" } });
    await db.resourceLink.create({ data: { needId: need.id, linkType: "ocp", referenceId: ocps[0].id, referenceLabel: ocps[0].code } });
  }
  await db.resourcePlan.update({ where: { id: plan7m.id }, data: { totalInvestment: total } });

  // ───────────────────────────────────────────── M5 Control: Balanced Scorecard
  const DIM: Record<string, [string, string]> = {
    FIN: ["resultados_economicos", "RE"], CLI: ["posicion_mercado", "PM"], INT: ["como_opera_empresa", "OP"], APR: ["personas_cultura", "PC"],
  };
  const KPIS = [
    // [nombre, unidad, olp, nodo responsable, valores reales 2026 Q1-Q3 (en relación con la meta)]
    { name: "Ventas trimestrales", unit: "millones S/", olp: 0, node: "GCOM", real: [7.9, 8.3, 7.6], quarterly: true },
    { name: "Margen EBITDA", unit: "%", olp: 1, node: "GFIN", real: [11.4, 11.9, 12.1] },
    { name: "Participación de mercado en Lima", unit: "%", olp: 2, node: "GCOM", real: [5.4, 5.8, 5.1] },
    { name: "Net Promoter Score", unit: "puntos", olp: 3, node: "GMKT", real: [41, 45, 47] },
    { name: "Avance de certificación ISO (sede Lima)", unit: "%", olp: 4, node: "JCAL", real: [20, 45, 66] },
    { name: "Tiempo de atención de incidencias", unit: "horas", olp: 5, node: "GOPE", real: [46, 44, 45] },
    { name: "Rotación anual del personal operativo", unit: "%", olp: 6, node: "GRH", real: [31, 29, 27] },
    { name: "Supervisores que culminaron el programa", unit: "%", olp: 7, node: "GRH", real: [15, 24, 33] },
  ];
  const quarters = (y: number) => [1, 2, 3, 4].map((q) => `${y}-Q${q}`);
  const PERIODS = [...quarters(2026), ...quarters(2027), ...quarters(2028)];
  const kpis: (Awaited<ReturnType<typeof db.kpi.create>> & { dim: string })[] = [];
  const counters: Record<string, number> = {};
  for (const [ki, k] of KPIS.entries()) {
    const olpDef = OLPS[k.olp];
    const [dimension, dcode] = DIM[olpDef.dim];
    counters[dcode] = (counters[dcode] ?? 0) + 1;
    const lower = !!olpDef.lower;
    const direction = lower ? "menor_mejor" : "mayor_mejor";
    const kpi = await db.kpi.create({
      data: {
        ...O, code: `KPI-${dcode}-${String(counters[dcode]).padStart(2, "0")}`, name: k.name, description: `Mide el avance del OLP${k.olp + 1}.`,
        formula: k.quarterly ? "Suma de ventas facturadas en el trimestre" : `${olpDef.metric} al cierre del trimestre`,
        dimensionBsc: dimension, unit: k.unit, frequency: "trimestral", direction, source: "manual",
        manualResponsible: PEOPLE.find((p) => p.area === (olpDef.area === "rrhh" ? "Gestión Humana" : olpDef.resp.replace(/^Gerencia (de )?/, "")))?.name ?? null,
        responsibleAreaId: nodes[k.node].id, responsibleRole: olpDef.resp, status: "confirmado", origin: "manual", sortOrder: ki,
      },
    });
    await db.kpiOlp.create({ data: { kpiId: kpi.id, olpId: olps[k.olp].id } });
    for (const o of ocps.filter((x) => x.olp === k.olp)) await db.kpiOcp.create({ data: { kpiId: kpi.id, ocpId: o.id } });

    const ocpMeta = (year: number) => ocps.find((x) => x.olp === k.olp && x.year === year)?.meta ?? olpDef.target;
    for (const [pi, period] of PERIODS.entries()) {
      const year = Number(period.slice(0, 4));
      const q = Number(period.slice(-1));
      // Meta trimestral: ventas se reparten; el resto avanza linealmente hacia la meta anual del OCP.
      let meta: number;
      if (k.quarterly) meta = round((year === 2028 ? 46 : ocpMeta(year)) / 4, 2);
      else if (olpDef.metric === "Avance de certificación ISO (sede Lima)" || k.name.startsWith("Avance de certificación")) meta = year === 2026 ? [25, 50, 75, 100][q - 1] : 100;
      else {
        const prev = year === 2026 ? olpDef.cur : ocpMeta(year - 1 > 2027 ? 2027 : year - 1);
        const goal = year >= 2028 ? olpDef.target - (olpDef.target - ocpMeta(2027)) / 2 : ocpMeta(year);
        meta = round(prev + ((goal - prev) * q) / 4, 2);
      }
      const green = meta;
      const amber = lower ? round(meta * 1.15, 2) : round(meta * 0.85, 2);
      const red = lower ? round(meta * 1.3, 2) : round(meta * 0.7, 2);
      const real = year === 2026 && q <= 3 ? k.real[q - 1] : null;
      let semaforo: string | null = null;
      let pct: number | null = null;
      if (real != null) {
        pct = round(Math.min(200, lower ? (meta / real) * 100 : (real / meta) * 100), 1);
        semaforo = lower ? (real <= green ? "verde" : real <= amber ? "ambar" : "rojo") : real >= green ? "verde" : real >= amber ? "ambar" : "rojo";
      }
      const received = real != null ? day(`2026-${String(q * 3 + 1).padStart(2, "0")}-08`) : null;
      await db.kpiPeriod.create({
        data: {
          kpiId: kpi.id, period, metaGreen: green, metaAmber: amber, metaRed: red, realValue: real, semaforoActual: semaforo ?? "sin_dato",
          percentCompletion: pct, dataReceivedAt: received, periodDataSource: real != null ? "manual" : null,
          observation: semaforo === "rojo" ? "Por debajo del umbral crítico: revisar en el comité." : null,
        },
      });
      if (real != null) {
        await db.kpiValueHistory.create({
          data: { kpiId: kpi.id, period, value: real, receivedAt: received!, source: "manual", idempotencyKey: `andina-${kpi.id}-${period}`, metadata: J({ registradoPor: "seed" }) },
        });
      }
      void pi;
    }
    kpis.push({ ...kpi, dim: olpDef.dim });
  }
  // Relaciones causa-efecto del mapa estratégico: Personas → Operación → Mercado → Resultados
  const byDim = (d: string) => kpis.filter((k) => k.dim === d);
  const REL: [string, string][] = [["APR", "INT"], ["INT", "CLI"], ["CLI", "FIN"]];
  for (const [a, b] of REL) {
    for (const s of byDim(a)) for (const t of byDim(b)) {
      await db.kpiRelation.create({ data: { cycleId: CYCLE_ID, sourceKpiId: s.id, targetKpiId: t.id, relationType: "causa_efecto", intensity: "media", origin: "auto_inferida" } });
    }
  }

  // Reglas por defecto y alertas activas
  const rules: Record<string, { id: string }> = {};
  for (const t of ALERT_TYPES.filter((x) => x.key !== "personalizada")) {
    rules[t.key] = await db.alertRule.create({
      data: { cycleId: CYCLE_ID, type: t.key, name: t.defaultRuleName, configuration: J(t.defaultConfig), defaultPriority: t.defaultPriority, isDefault: true, triggerCount: 0 },
    });
  }
  const periodsQ3 = await db.kpiPeriod.findMany({ where: { kpiId: { in: kpis.map((k) => k.id) }, period: "2026-Q3" } });
  for (const p of periodsQ3.filter((x) => x.semaforoActual === "rojo")) {
    const k = kpis.find((x) => x.id === p.kpiId)!;
    const al = await db.alert.create({
      data: {
        ...O, type: "semaforo_critico", title: `${k.code} en rojo: ${k.name}`, description: `El valor de 2026-Q3 (${p.realValue} ${k.unit}) está por debajo del umbral crítico (${p.metaRed}).`,
        priority: "alta", status: "activa", objectType: "kpi", objectId: k.id, ruleId: rules.semaforo_critico.id, dedupeKey: `semaforo_critico::kpi::${k.id}`,
        contextData: J({ period: "2026-Q3", value: p.realValue, metaRed: p.metaRed }), assigneeId: U.com.id, generatedAt: day("2026-09-08"),
      },
    });
    await db.alertAction.create({ data: { alertId: al.id, actionType: "generada", data: "{}" } });
  }
  const tiempo = kpis.find((k) => k.name.startsWith("Tiempo"))!;
  const al2 = await db.alert.create({
    data: {
      ...O, type: "hito_incumplido", title: `${ocps.find((o) => o.olp === 5 && o.year === 2026)!.code}: tiempo de atención sin mejora`, description: "El tiempo de atención se mantiene en 45 horas y la meta anual es 36 horas.",
      priority: "media", status: "en_seguimiento", objectType: "kpi", objectId: tiempo.id, ruleId: rules.hito_incumplido.id, dedupeKey: `hito_incumplido::kpi::${tiempo.id}`,
      contextData: J({ period: "2026-Q3" }), assigneeId: U.ops.id, assignedAt: day("2026-09-10"), generatedAt: day("2026-09-09"),
    },
  });
  await db.alertAction.create({ data: { alertId: al2.id, actionType: "generada", data: "{}" } });
  await db.alertAction.create({ data: { alertId: al2.id, actionType: "asignada", userId: U.gg.id, data: J({ to: U.ops.id }) } });
  for (const r of Object.values(rules)) await db.alertRule.update({ where: { id: r.id }, data: { triggerCount: 1, lastTriggeredAt: day("2026-09-09") } });

  // Revisión estratégica del segundo trimestre (completada) y la del tercero (programada)
  const q2 = await db.kpiPeriod.findMany({ where: { kpiId: { in: kpis.map((k) => k.id) }, period: "2026-Q2" } });
  const count = (s: string) => q2.filter((p) => p.semaforoActual === s).length;
  const review = await db.review.create({
    data: {
      ...O, type: "trimestral", title: "Revisión estratégica 2026-Q2", period: "2026-Q2", scheduledAt: day("2026-07-15"),
      startedAt: new Date("2026-07-15T14:00:00Z"), finishedAt: new Date("2026-07-15T16:10:00Z"), durationMinutes: 130, location: "Sala de directorio, San Isidro",
      status: "completada", presidentId: U.gg.id, secretaryId: U.fin.id, actSigned: true, presidentSignedAt: day("2026-07-16"), presidentSignedName: U.gg.name,
      secretarySignedAt: day("2026-07-16"), secretarySignedName: U.fin.name,
      bscSnapshot: J({
        summary: { total: q2.length, verde: count("verde"), ambar: count("ambar"), rojo: count("rojo"), sin_dato: count("sin_dato"), byDimension: {} },
        kpis: q2.map((p) => ({ kpiId: p.kpiId, period: p.period, real: p.realValue, meta: p.metaGreen, semaforo: p.semaforoActual })),
        capturedAt: "2026-07-15T14:00:00Z",
      }),
      executiveSummary: "El semestre cierra con ventas y NPS al alza. Preocupa el tiempo de atención de incidencias: se acelera el despliegue de la app de supervisión.",
    },
  });
  for (const [i, p] of PEOPLE.entries()) {
    await db.reviewAttendee.create({ data: { reviewId: review.id, userId: U[p.key].id, roleInReview: i === 0 ? "presidente" : i === 4 ? "secretario" : "miembro", attendanceStatus: i === 5 ? "ausente_justificado" : "presente" } });
  }
  const AGENDA: [string, string, number][] = [
    ["Bienvenida y objetivos de la sesión", "bienvenida", 5], ["Estado del Balanced Scorecard al 2026-Q2", "snapshot_bsc", 25], ["Alertas activas", "alertas", 15],
    ["KPIs de la perspectiva de procesos", "kpis_dimension", 20], ["OCP con riesgo de incumplimiento", "ocps_incumplidos", 20], ["Decisiones y acuerdos", "decision", 20], ["Acciones correctivas", "accion", 15],
  ];
  for (const [i, [title, itemType, min]] of AGENDA.entries()) {
    await db.reviewAgendaItem.create({ data: { reviewId: review.id, order: i, title, itemType, assignedMinutes: min, actualMinutes: min + (i % 2 ? 5 : -2), origin: "plantilla", covered: true } });
  }
  const DECISIONS: [string, string, string][] = [
    ["Adelantar al 2026-Q3 el despliegue de la app de supervisión en todas las sedes de Lima.", "tactica", "olp"],
    ["Aprobar el bono por permanencia para operarios con más de 12 meses.", "estrategica", "olp"],
    ["Priorizar 20 cuentas corporativas para el programa de venta cruzada.", "tactica", "olp"],
  ];
  for (const [i, [text, decisionType, linkType]] of DECISIONS.entries()) {
    await db.reviewDecision.create({ data: { reviewId: review.id, number: i + 1, text, decisionType, linkType, linkId: olps[[5, 6, 0][i]].id, createdById: U.gg.id } });
  }
  const ACTIONS: [string, string, string, string][] = [
    ["Presentar el cronograma acelerado de la app de supervisión", "ops", "2026-08-01", "completada"],
    ["Diseñar la política del bono por permanencia", "rh", "2026-08-15", "completada"],
    ["Plan de acción para recuperar la participación de mercado", "com", "2026-10-15", "en_curso"],
  ];
  for (const [i, [description, who, due, status]] of ACTIONS.entries()) {
    await db.reviewCorrectiveAction.create({
      data: { reviewId: review.id, number: i + 1, description, responsibleId: U[who].id, responsibleName: U[who].name, dueDate: day(due), priority: i === 2 ? "alta" : "media", status, completedAt: status === "completada" ? day(due) : null },
    });
  }
  await db.review.create({
    data: { ...O, type: "trimestral", title: "Revisión estratégica 2026-Q3", period: "2026-Q3", scheduledAt: day("2026-10-14"), location: "Sala de directorio, San Isidro", status: "programada", presidentId: U.gg.id, secretaryId: U.fin.id },
  });

  for (const [i, m] of ["M1", "M2", "M3", "M4", "M5"].entries()) {
    await db.moduleStatus.create({ data: { cycleId: CYCLE_ID, moduleId: m, status: i < 4 ? "COMPLETADO" : "EN_CURSO", progress: i < 4 ? 100 : 75 } });
  }

  // ───────────────────────────────────────────── Portafolio y proyectos (generados desde el plan)
  const { planFromCycle } = await import("../src/server/routers/pm");
  const gen = await planFromCycle(db as never, org.id, CYCLE_ID, U.gg.id, true);
  console.log("Portafolio generado:", gen.summary);

  const OWNER_BY_AREA: Record<string, string> = { comercial: "com", marketing: "mkt", operaciones: "ops", finanzas: "fin", rrhh: "rh" };
  const TEAM_BY_AREA: Record<string, string[]> = { comercial: ["com", "mkt"], marketing: ["mkt", "com"], operaciones: ["ops", "rh"], finanzas: ["fin", "com"], rrhh: ["rh", "ops"] };
  const EVIDENCE = [
    { name: "acta-reunion-kickoff.jpg", url: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=70", mime: "image/jpeg", size: 184000, note: "Acta de la reunión de arranque con el equipo" },
    { name: "tablero-de-seguimiento.jpg", url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=70", mime: "image/jpeg", size: 152000, note: "Captura del tablero de indicadores del trimestre" },
    { name: "capacitacion-supervisores.jpg", url: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=70", mime: "image/jpeg", size: 201000, note: "Sesión de capacitación en campo" },
    { name: "informe-de-avance.pdf", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", mime: "application/pdf", size: 13264, note: "Informe de avance firmado por el responsable" },
  ];
  const SUBTASKS = [
    ["Recopilar información de base", "Validar con el área responsable", "Presentar resultados al comité"],
    ["Definir el alcance y el presupuesto", "Coordinar con proveedores", "Ejecutar y documentar"],
    ["Preparar materiales", "Ejecutar el piloto", "Medir resultados y ajustar"],
  ];
  const projects = await db.project.findMany({ where: { orgId: org.id }, include: { ocp: true, workflows: true, issues: { orderBy: { number: "asc" } } }, orderBy: { createdAt: "asc" } });
  let evidenceCount = 0;
  let timeCount = 0;
  let extraCount = 0;
  for (const [pi, p] of projects.entries()) {
    const olpIdx = olps.findIndex((o) => o.id === p.ocp?.olpId);
    const areaKey = OLPS[olpIdx]?.area ?? "operaciones";
    const ownerKey = OWNER_BY_AREA[areaKey] ?? "ops";
    const team = TEAM_BY_AREA[areaKey] ?? ["ops"];
    await db.project.update({ where: { id: p.id }, data: { ownerId: U[ownerKey].id } });
    for (const k of new Set([ownerKey, ...team])) {
      await db.projectMember.upsert({
        where: { projectId_userId: { projectId: p.id, userId: U[k].id } },
        update: {}, create: { projectId: p.id, userId: U[k].id, role: k === ownerKey ? "PM" : "MEMBER" },
      });
    }
    const st = (cat: string) => p.workflows.filter((w) => w.category === cat).sort((a, b) => a.sortOrder - b.sortOrder);
    const TODO = st("TODO")[0].id;
    const INPROG = st("IN_PROGRESS")[0].id;
    const REVIEW = st("IN_PROGRESS")[1]?.id ?? INPROG;
    const DONE = st("DONE")[0].id;
    let number = p.issues.reduce((a, i) => Math.max(a, i.number), 0);
    const tasks = p.issues.filter((i) => i.type === "TASK");
    const is2026 = p.ocp?.year === 2026;
    for (const m of p.issues.filter((i) => i.type === "MILESTONE")) await db.issue.update({ where: { id: m.id }, data: { assigneeId: U[ownerKey].id } });
    const ahead = is2026 && [0, 3, 7].includes(olpIdx); // proyectos que van adelantados
    // Responsables, estimaciones y cadena de dependencias Q1 → Q2 → Q3 → Q4
    for (const [ti, t] of tasks.entries()) {
      const assignee = U[team[ti % team.length]].id;
      const estimate = 16 + ((ti * 7 + pi) % 4) * 8;
      const cat0 = p.workflows.find((w) => w.id === t.statusId)?.category;
      await db.issue.update({ where: { id: t.id }, data: { assigneeId: assignee, estimateHours: estimate, ...(is2026 && ti === 2 && cat0 !== "DONE" ? { statusId: REVIEW } : {}) } });
      if (ti > 0) await db.issueLink.create({ data: { fromIssueId: tasks[ti - 1].id, toIssueId: t.id, type: "BLOCKS" } });
      const cat = p.workflows.find((w) => w.id === t.statusId)?.category;
      if (is2026 && (cat === "DONE" || cat === "IN_PROGRESS")) {
        const factor = cat === "DONE" ? 0.9 + (ti % 3) * 0.1 : 0.45;
        const hours = round(estimate * factor, 1);
        const parts = [round(hours * 0.4, 1), round(hours * 0.35, 1), round(hours * 0.25, 1)];
        for (const [hi, h] of parts.entries()) {
          await db.timeEntry.create({ data: { issueId: t.id, userId: team[hi % team.length] ? U[team[hi % team.length]].id : assignee, hours: h, date: new Date((t.startDate ?? TODAY).getTime() + (hi + 1) * 9 * 86400000), notes: ["Trabajo de campo", "Reunión de coordinación", "Elaboración del informe"][hi] } });
          timeCount++;
        }
        await db.issue.update({ where: { id: t.id }, data: { timeSpent: round(parts.reduce((a, b) => a + b, 0), 1) } });
        const ev = EVIDENCE[(ti + pi) % EVIDENCE.length];
        await db.issueAttachment.create({ data: { issueId: t.id, name: ev.name, url: ev.url, mimeType: ev.mime, size: ev.size, note: ev.note, uploadedBy: assignee } });
        evidenceCount++;
        await db.issueComment.create({ data: { issueId: t.id, authorId: assignee, body: cat === "DONE" ? "Terminado. Dejo el informe y las fotos en evidencias." : "Vamos al 50 %. Esta semana cerramos la coordinación con el área." } });
        await db.issueComment.create({ data: { issueId: t.id, authorId: U.gg.id, body: cat === "DONE" ? "Excelente trabajo, lo revisamos en el comité." : "Ojo con la fecha: avisen si necesitan apoyo." } });
      }
      // Subtareas en las tareas en curso y en la siguiente
      if (is2026 && ti >= 1 && ti <= 2) {
        const subs = SUBTASKS[(ti + pi) % SUBTASKS.length];
        const s0 = t.startDate ?? TODAY;
        const due = t.dueDate ?? TODAY;
        const span = (due.getTime() - s0.getTime()) / subs.length;
        for (const [si, summary] of subs.entries()) {
          const subDone = cat === "DONE" || (cat === "IN_PROGRESS" && si === 0) || ti === 1;
          await db.issue.create({
            data: {
              projectId: p.id, number: ++number, type: "SUBTASK", summary, parentId: t.id, statusId: subDone ? DONE : si === 1 ? INPROG : TODO,
              assigneeId: U[team[(si + 1) % team.length]].id, priority: "MEDIUM", reporterId: U[ownerKey].id,
              startDate: new Date(s0.getTime() + span * si), dueDate: new Date(s0.getTime() + span * (si + 1)), estimateHours: 6 + si * 2, sortOrder: si,
              resolvedAt: subDone ? new Date(s0.getTime() + span * (si + 1)) : null,
            },
          });
        }
      }
    }
    // Tareas adicionales alrededor de hoy (solo proyectos 2026), para ver un Gantt con barras superpuestas y vencidas
    if (is2026) {
      const EXTRA = [
        { summary: "Informe de avance para el comité de estrategia", start: "2026-09-01", due: "2026-09-22", status: TODO, prio: "HIGH" },
        { summary: "Reunión mensual de seguimiento con el equipo", start: "2026-09-24", due: "2026-10-09", status: INPROG, prio: "MEDIUM" },
        { summary: "Preparar el presupuesto del próximo año", start: "2026-10-12", due: "2026-11-20", status: TODO, prio: "MEDIUM" },
      ];
      const extras = EXTRA.slice(0, 2 + (pi % 2));
      for (const [ei, e] of extras.entries()) {
        const statusId = ahead && ei === 0 ? DONE : olpIdx === 7 && ei === 1 ? DONE : e.status;
        const it = await db.issue.create({
          data: {
            projectId: p.id, number: ++number, type: "TASK", summary: e.summary, statusId, resolvedAt: statusId === DONE ? day("2026-09-20") : null, priority: e.prio, assigneeId: (ei === 0 ? U.gg : U[team[1] ?? ownerKey]).id,
            reporterId: U.gg.id, startDate: day(e.start), dueDate: day(e.due), estimateHours: 8 + ei * 4, sortOrder: 50 + ei,
          },
        });
        extraCount++;
        if (ei === 1) {
          await db.timeEntry.create({ data: { issueId: it.id, userId: U[ownerKey].id, hours: 2.5, date: day("2026-09-25"), notes: "Primera reunión" } });
          await db.issue.update({ where: { id: it.id }, data: { timeSpent: 2.5 } });
          timeCount++;
        }
      }
    }
    // Historial básico para que la actividad reciente muestre movimiento
    for (const t of tasks.slice(0, 2)) {
      await db.issueHistory.create({ data: { issueId: t.id, userId: U[ownerKey].id, field: "assigneeId", newValue: U[team[0]].id } });
    }
  }

  // OCP de 2028 a 2030 (definidos, aún sin proyecto): completan el horizonte del plan.
  // Al pulsar «Generar desde el plan» en Portafolio se ven como nuevos proyectos.
  for (const [i, plan] of OCP_PLAN.entries()) {
    const olpDef = OLPS[i];
    for (const year of [2028, 2029, 2030]) {
      const frac = (year - 2027) / 3;
      const meta = round(plan.meta[1] + (olpDef.target - plan.meta[1]) * frac, 1);
      await db.ocp.create({
        data: {
          ...O, olpId: olps[i].id, code: `OCP${i + 1}.${year - YEAR_START}`, description: `${olpDef.metric}: meta ${meta} ${olpDef.unit} al cierre de ${year}`, year,
          metaValue: meta, unit: olpDef.unit, responsibleAreaId: areas[olpDef.area].id, indicator: plan.ind, frequency: "trimestral", priority: "media", status: "borrador", sortOrder: i,
        },
      });
    }
  }

  const counts = {
    usuarios: PEOPLE.length, factoresPestec: PESTEC.length, mefe: mefe.length, mefi: mefi.length, olps: olps.length, estrategias: STRATS.length + derived.length,
    consolidadas: consolidated.length, ocps: ocps.length, politicas: policies.length, kpis: kpis.length, periodos: kpis.length * PERIODS.length,
    proyectos: projects.length, tareas: await db.issue.count({ where: { project: { orgId: org.id } } }), horas: timeCount, evidencias: evidenceCount, tareasExtra: extraCount,
  };
  console.log("Ejemplo Andina creado:", counts);
  console.log("Usuarios:", PEOPLE.map((p) => p.email).join(", "), "· clave:", isLocal ? PASSWORD : "(la de SEED_FULL_PASSWORD)");
  void cycle;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
