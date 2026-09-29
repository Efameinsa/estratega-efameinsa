// Datos de demostración para probar la gestión de proyectos en local.
// Uso: npx tsx scripts/seed-demo-local.ts   (solo contra una base localhost;
// para otra base: ALLOW_REMOTE_SEED=1 y SEED_DEMO_PASSWORD=<clave>)
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.DATABASE_URL ?? "";
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
if (!isLocal && process.env.ALLOW_REMOTE_SEED !== "1") {
  console.error("Este script solo corre contra una base de datos local.");
  process.exit(1);
}
if (!isLocal && !process.env.SEED_DEMO_PASSWORD) {
  console.error("Define SEED_DEMO_PASSWORD para sembrar una base remota.");
  process.exit(1);
}
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function main() {
  const org = await db.organization.upsert({
    where: { id: "org-demo" },
    update: {},
    create: { id: "org-demo", name: "Corporación Demo SAC", sector: "Servicios", country: "PE" },
  });
  const plain = process.env.SEED_DEMO_PASSWORD ?? "demo1234";
  const pass = await bcrypt.hash(plain, 10);
  const people = [
    { email: "gerente@demo.pe", name: "Santos Vilca", area: "Gerencia General", role: "PROPIETARIO" as const },
    { email: "marketing@demo.pe", name: "Lucía Paredes", area: "Marketing", role: "ADMINISTRADOR" as const },
    { email: "operaciones@demo.pe", name: "Jorge Ramírez", area: "Operaciones", role: "MIEMBRO" as const },
    { email: "rrhh@demo.pe", name: "Carla Mendoza", area: "Gestión Humana", role: "MIEMBRO" as const },
    { email: "finanzas@demo.pe", name: "Diego Salas", area: "Finanzas", role: "MIEMBRO" as const },
  ];
  const users = [];
  for (const p of people) {
    const u = await db.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email, name: p.name, area: p.area, hashedPassword: pass, organizationId: org.id, activeOrganizationId: org.id,
        role: "ADMIN", onboardingCompleted: true, onboardingStep: "DONE",
      },
    });
    await db.organizationMember.upsert({
      where: { userId_organizationId: { userId: u.id, organizationId: org.id } },
      update: {},
      create: { userId: u.id, organizationId: org.id, orgRole: p.role },
    });
    users.push(u);
  }

  const cycle = await db.strategicCycle.upsert({
    where: { id: "cycle-demo" },
    update: {},
    create: { id: "cycle-demo", organizationId: org.id, name: "Plan Estratégico 2026-2030", yearStart: 2026, yearEnd: 2030, status: "IN_PROGRESS" },
  });

  if ((await db.olp.count({ where: { cycleId: cycle.id } })) > 0) {
    console.log("El plan demo ya existe.");
    return;
  }

  const area = async (key: string, name: string) =>
    db.ocpArea.create({ data: { organizationId: org.id, cycleId: cycle.id, key, name } });
  const aCom = await area("comercial", "Comercial");
  const aMkt = await area("marketing", "Marketing");
  const aOps = await area("operaciones", "Operaciones");
  const aRh = await area("rrhh", "Gestión Humana");

  const plan = [
    {
      dim: "FIN", desc: "Al 2030, alcanzar ingresos anuales de S/ 25 millones con un margen EBITDA del 18 %.", area: aCom,
      ocps: [
        { year: 2026, desc: "Incrementar las ventas anuales a S/ 12 millones", meta: 12, unit: "millones S/", kpi: ["KPI-RE-01", "Ingresos anuales"],
          actions: [["Q1", "Diseñar el plan comercial por segmentos", "completada"], ["Q2", "Lanzar programa de referidos con clientes actuales", "en_curso"], ["Q3", "Abrir la cartera de clientes corporativos en Arequipa", "pendiente"], ["Q4", "Cerrar 10 contratos anuales de mantenimiento", "pendiente"]] },
      ],
    },
    {
      dim: "CLI", desc: "Al 2029, ser la marca de servicios más recomendada de Lima con un NPS de 70.", area: aMkt,
      ocps: [
        { year: 2026, desc: "Elevar el NPS de clientes a 55 puntos", meta: 55, unit: "puntos", kpi: ["KPI-PM-01", "Net Promoter Score"],
          actions: [["Q1", "Implementar la encuesta NPS posterior a cada servicio", "completada"], ["Q2", "Rediseñar el protocolo de atención al cliente", "en_curso"], ["Q3", "Campaña de reputación en Google y redes", "pendiente"], ["Q4", "Programa de fidelización para clientes recurrentes", "pendiente"]] },
      ],
    },
    {
      dim: "INT", desc: "Al 2028, operar con procesos certificados ISO 9001 en todas las sedes.", area: aOps,
      ocps: [
        { year: 2026, desc: "Documentar y estandarizar el 100 % de los procesos operativos", meta: 100, unit: "%", kpi: ["KPI-OP-01", "Procesos documentados"],
          actions: [["Q1", "Levantar el mapa de procesos", "completada"], ["Q2", "Redactar procedimientos y formatos", "en_curso"], ["Q3", "Capacitar a los supervisores en los nuevos procedimientos", "pendiente"], ["Q4", "Auditoría interna de cumplimiento", "pendiente"]] },
      ],
    },
    {
      dim: "APR", desc: "Al 2030, figurar entre las 20 mejores empresas para trabajar del sector.", area: aRh,
      ocps: [
        { year: 2026, desc: "Reducir la rotación del personal operativo al 15 %", meta: 15, unit: "%", kpi: ["KPI-PC-01", "Rotación de personal"],
          actions: [["Q1", "Diagnóstico de clima laboral", "completada"], ["Q2", "Plan de línea de carrera para operarios", "pendiente"], ["Q3", "Programa de reconocimiento mensual", "pendiente"], ["Q4", "Medición de clima y ajuste del plan", "pendiente"]] },
      ],
    },
  ];

  const dimToBsc: Record<string, string> = { FIN: "resultados_economicos", CLI: "posicion_mercado", INT: "como_opera_empresa", APR: "personas_cultura" };
  let i = 0;
  for (const o of plan) {
    const olp = await db.olp.create({
      data: { organizationId: org.id, cycleId: cycle.id, description: o.desc, bscPerspective: o.dim, targetYear: 2030, sortOrder: i, priority: "alta" },
    });
    for (const c of o.ocps) {
      const ocp = await db.ocp.create({
        data: {
          organizationId: org.id, cycleId: cycle.id, olpId: olp.id, code: `OCP${i + 1}.1`, description: c.desc, year: c.year,
          metaValue: c.meta, unit: c.unit, responsibleAreaId: o.area.id, indicator: c.kpi[1], frequency: "trimestral", priority: "alta", status: "definido",
          actions: { create: c.actions.map(([q, d, s], k) => ({ quarter: q, description: d, status: s, sortOrder: k })) },
        },
      });
      const kpi = await db.kpi.create({
        data: { organizationId: org.id, cycleId: cycle.id, code: c.kpi[0], name: c.kpi[1], dimensionBsc: dimToBsc[o.dim], unit: c.unit, status: "confirmado", frequency: "trimestral" },
      });
      await db.kpiOcp.create({ data: { kpiId: kpi.id, ocpId: ocp.id } });
      await db.kpiOlp.create({ data: { kpiId: kpi.id, olpId: olp.id } });
    }
    i++;
  }
  console.log("Plan demo creado. Usuarios:", people.map((p) => p.email).join(", "), "· clave:", isLocal ? plain : "(la de SEED_DEMO_PASSWORD)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
