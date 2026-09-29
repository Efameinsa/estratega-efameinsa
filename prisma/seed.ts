import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

if (typeof globalThis.WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  // Las contraseñas iniciales vienen del entorno; si no, se generan y se muestran una sola vez.
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? randomBytes(9).toString("base64url");
  const santosPlain = process.env.SEED_OWNER_PASSWORD ?? randomBytes(9).toString("base64url");
  const hashedPassword = await bcrypt.hash(adminPass, 10);

  const org = await db.organization.upsert({
    where: { id: "org-default" },
    update: {},
    create: {
      id: "org-default",
      name: "Organizacion Demo",
      sector: "Tecnologia",
      country: "PE",
    },
  });

  await db.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@demo.com",
      hashedPassword,
      role: "ADMIN",
      organizationId: org.id,
    },
  });

  const santosPassword = await bcrypt.hash(santosPlain, 10);
  const santos = await db.user.upsert({
    where: { email: "santos@gmail.com" },
    update: {},
    create: {
      name: "Santos",
      email: "santos@gmail.com",
      hashedPassword: santosPassword,
      role: "ADMIN",
      organizationId: org.id,
    },
  });

  // Create OrganizationMember records
  await db.organizationMember.upsert({
    where: { userId_organizationId: { userId: santos.id, organizationId: org.id } },
    update: {},
    create: { userId: santos.id, organizationId: org.id, orgRole: "PROPIETARIO" },
  });

  const cycle = await db.strategicCycle.upsert({
    where: { id: "cycle-default" },
    update: {},
    create: {
      id: "cycle-default",
      organizationId: org.id,
      name: "Plan Estrategico 2025-2030",
      yearStart: 2025,
      yearEnd: 2030,
      status: "IN_PROGRESS",
    },
  });

  console.log("Seed completed:", { org: org.id, cycle: cycle.id });
  if (!process.env.SEED_ADMIN_PASSWORD) console.log("Clave inicial admin@demo.com:", adminPass);
  if (!process.env.SEED_OWNER_PASSWORD) console.log("Clave inicial santos@gmail.com:", santosPlain);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
