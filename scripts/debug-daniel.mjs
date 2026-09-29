// Debug script — inspect Daniel state via raw SQL.
// Run: node scripts/debug-daniel.mjs

import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const sql = neon(process.env.DATABASE_URL);

const user = await sql`
  SELECT id, email, name, "organizationId", "activeOrganizationId",
         "onboardingCompleted", "onboardingStep", "createdAt"
  FROM "User"
  WHERE email = 'daniel@gmail.com'
`;
console.log("=== USER ===");
console.log(user[0] ?? "(no user)");

if (user[0]) {
  const memberships = await sql`
    SELECT m."organizationId", m."orgRole", o.name
    FROM "OrganizationMember" m
    JOIN "Organization" o ON o.id = m."organizationId"
    WHERE m."userId" = ${user[0].id}
  `;
  console.log("\n=== MEMBERSHIPS ===");
  console.log(memberships);

  if (user[0].activeOrganizationId) {
    const cycles = await sql`
      SELECT id, name, "yearStart", "yearEnd", status, "createdAt"
      FROM "StrategicCycle"
      WHERE "organizationId" = ${user[0].activeOrganizationId}
    `;
    console.log("\n=== CYCLES IN DANIEL ACTIVE ORG ===");
    console.log(cycles);
  }
}

const allCycles = await sql`
  SELECT c.id, c.name, c."organizationId", o.name AS org_name
  FROM "StrategicCycle" c
  JOIN "Organization" o ON o.id = c."organizationId"
  ORDER BY c."createdAt" DESC
  LIMIT 10
`;
console.log("\n=== LATEST 10 CYCLES (all orgs) ===");
console.log(allCycles);

const pestec = await sql`
  SELECT id, "cycleId", "organizationId", type, description
  FROM "PestecFactor"
  ORDER BY "createdAt" DESC
  LIMIT 8
`;
console.log("\n=== LATEST 8 PESTEC FACTORS ===");
console.log(pestec);
