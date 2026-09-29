import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { cache } from "react";
import { hasPermission, type Permission, type OrgRole } from "./permissions";

export const getCurrentMembership = cache(async (organizationId: string) => {
  const session = await auth();
  const user = session?.user as Record<string, unknown> | undefined;
  if (!user?.id) return null;

  return db.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id as string,
        organizationId,
      },
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      organization: { select: { id: true, name: true, color: true } },
    },
  });
});

export async function requirePermission(
  organizationId: string,
  permission: Permission
) {
  const membership = await getCurrentMembership(organizationId);
  if (!membership) throw new Error("No perteneces a esta organización");
  if (!hasPermission(membership.orgRole as OrgRole, permission)) {
    throw new Error("No tienes permiso para realizar esta acción");
  }
  return membership;
}
