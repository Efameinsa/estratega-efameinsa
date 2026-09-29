/**
 * Migration script: Creates OrganizationMember records for all existing users.
 * The first user in each organization gets PROPIETARIO, the rest get MIEMBRO.
 *
 * Run with: npx tsx prisma/migrate-members.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Migrating existing users to OrganizationMember...");

  // Get all organizations
  const orgs = await db.organization.findMany({
    include: {
      users: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, email: true },
      },
    },
  });

  let created = 0;
  let skipped = 0;

  for (const org of orgs) {
    let isFirst = true;

    for (const user of org.users) {
      // Check if membership already exists
      const existing = await db.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: org.id,
          },
        },
      });

      if (existing) {
        skipped++;
        isFirst = false;
        continue;
      }

      const role = isFirst ? "PROPIETARIO" : "MIEMBRO";

      await db.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          orgRole: role,
        },
      });

      console.log(
        `  ${role}: ${user.name} (${user.email}) → ${org.name}`
      );
      created++;
      isFirst = false;
    }
  }

  console.log(
    `\nDone: ${created} memberships created, ${skipped} already existed.`
  );
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
