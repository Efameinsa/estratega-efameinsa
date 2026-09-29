"use client";

import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";

export function useOrganization() {
  const { data: session } = useSession();
  const user = session?.user as Record<string, unknown> | undefined;
  const sessionOrgId = (user?.activeOrganizationId ?? user?.organizationId) as string | undefined;

  // Fetch org from DB as fallback when JWT is stale
  const { data: dbStatus } = trpc.onboarding.getStatus.useQuery(undefined, {
    enabled: !!user && !sessionOrgId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const organizationId = sessionOrgId
    ?? dbStatus?.orgMemberships?.[0]?.organizationId
    ?? "";

  const { data: membership } = trpc.organizations.getMyMembership.useQuery(
    { organizationId },
    {
      enabled: !!organizationId,
      staleTime: 5 * 60 * 1000,
      retry: false,
    }
  );

  return {
    organizationId,
    organization: membership?.organization ?? null,
    orgRole: membership?.orgRole ?? null,
    membership: membership ?? null,
    isOwner: membership?.orgRole === "PROPIETARIO",
    isAdmin: membership?.orgRole === "ADMINISTRADOR" || membership?.orgRole === "PROPIETARIO",
  };
}
