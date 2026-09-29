"use client";

import { useOrganization } from "./use-organization";
import { hasPermission, type Permission, type OrgRole } from "@/lib/permissions";

export function useMembership() {
  const { membership, organizationId } = useOrganization();
  return { membership, isLoading: !membership && !!organizationId };
}

export function usePermission(permission: Permission): boolean {
  const { orgRole } = useOrganization();
  if (!orgRole) return false;
  return hasPermission(orgRole as OrgRole, permission);
}

export function useOrgRole(): OrgRole | null {
  const { orgRole } = useOrganization();
  if (!orgRole) return null;
  return orgRole as OrgRole;
}
