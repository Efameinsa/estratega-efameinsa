import bcrypt from "bcryptjs";
import { db } from "@/server/db";

/**
 * Verify a Bearer workspace token from request headers.
 *
 * Returns { organizationId, tokenId, permissions } on success, or null if
 * the token is missing, malformed, revoked, or doesn't match any active
 * token in DB. Also touches `lastUsedAt` on the matched token.
 */
export async function verifyWorkspaceToken(
  authHeader: string | null | undefined,
): Promise<{ organizationId: string; tokenId: string; permissions: string } | null> {
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) return null;
  const raw = authHeader.slice(7).trim();
  if (!raw.startsWith("est_") || raw.length < 12) return null;
  const prefix = raw.slice(0, 12);
  // Cargar candidatos por prefix (cheap), luego comparar hash
  const candidates = await db.workspaceToken.findMany({
    where: { tokenPrefix: prefix, active: true },
    select: { id: true, organizationId: true, tokenHash: true, permissions: true },
  });
  for (const c of candidates) {
    const ok = await bcrypt.compare(raw, c.tokenHash);
    if (ok) {
      // Best-effort lastUsedAt; ignore failures
      db.workspaceToken
        .update({ where: { id: c.id }, data: { lastUsedAt: new Date() } })
        .catch(() => {});
      return {
        organizationId: c.organizationId,
        tokenId: c.id,
        permissions: c.permissions,
      };
    }
  }
  return null;
}
