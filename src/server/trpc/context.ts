import { auth } from "@/server/auth";
import { db } from "@/server/db";

export async function createTRPCContext() {
  const session = await auth();
  const user = session?.user as Record<string, unknown> | undefined;

  // Use activeOrganizationId as the primary org context
  const organizationId = (user?.activeOrganizationId ?? user?.organizationId) as string | undefined;

  return {
    db,
    session,
    userId: user?.id as string | undefined,
    organizationId,
    role: user?.role as string | undefined,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
