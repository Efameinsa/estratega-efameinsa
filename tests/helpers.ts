import { db } from "@/server/db";
import { appRouter } from "@/server/trpc/router";
import { memoActiveOrg } from "@/server/trpc/active-org";

let seq = 0;
const uid = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Crea una organización aislada con un usuario propietario y un ciclo. */
export async function makeOrg(opts: { members?: number } = {}) {
  const id = uid();
  const org = await db.organization.create({ data: { name: `Org test ${id}` } });
  const mk = async (name: string, role: "PROPIETARIO" | "MIEMBRO") => {
    const u = await db.user.create({
      data: {
        name,
        email: `${name.toLowerCase().replace(/\s+/g, ".")}.${id}@test.pe`,
        hashedPassword: "x",
        organizationId: org.id,
        activeOrganizationId: org.id,
        onboardingCompleted: true,
      },
    });
    await db.organizationMember.create({ data: { userId: u.id, organizationId: org.id, orgRole: role } });
    return u;
  };
  const owner = await mk("Dueño", "PROPIETARIO");
  const others = [];
  for (let i = 0; i < (opts.members ?? 0); i++) others.push(await mk(`Miembro ${i + 1}`, "MIEMBRO"));
  const cycle = await db.strategicCycle.create({
    data: { organizationId: org.id, name: "Plan test", yearStart: 2026, yearEnd: 2030, status: "IN_PROGRESS" },
  });
  return { org, owner, others, cycle };
}

export function callerFor(user: { id: string; organizationId: string }) {
  return appRouter.createCaller({
    db,
    session: { user: { id: user.id }, expires: "2099-01-01" } as never,
    userId: user.id,
    organizationId: user.organizationId,
    role: "ADMIN",
    getActiveOrgId: memoActiveOrg(user.id, user.organizationId),
  });
}

export { db };
