import { db } from "@/server/db";

/**
 * La org activa se lee de la BD (el JWT puede quedar desfasado tras cambiar de
 * organización), pero una sola vez por petición HTTP: un lote de tRPC con varios
 * procedimientos comparte el mismo resultado.
 */
export function memoActiveOrg(userId: string | undefined, fallback: string | undefined) {
  let cached: Promise<string | undefined> | null = null;
  return () => {
    cached ??= userId
      ? db.user
          .findUnique({ where: { id: userId }, select: { activeOrganizationId: true, organizationId: true } })
          .then((u) => u?.activeOrganizationId ?? u?.organizationId ?? fallback)
      : Promise.resolve(fallback);
    return cached;
  };
}
