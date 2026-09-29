import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import { type Role } from "@/lib/constants";
import { hasPermission, PERMISSIONS, type Permission, type OrgRole } from "@/lib/permissions";
import { type TRPCContext } from "./context";

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const enforceAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user || !ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "No autenticado" });
  }

  // Siempre leer la org activa desde DB. El JWT puede tener una organizationId
  // stale después de un cambio de organización, y eso provocaba FORBIDDEN
  // falsos en cycle.getById → redirect a /dashboard desde el sidebar.
  const user = await ctx.db.user.findUnique({
    where: { id: ctx.userId },
    select: { activeOrganizationId: true, organizationId: true },
  });
  const organizationId =
    user?.activeOrganizationId ?? user?.organizationId ?? ctx.organizationId;

  if (!organizationId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "No tienes organización activa" });
  }

  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId as string,
      organizationId: organizationId as string,
      role: ctx.role as Role,
    } as typeof ctx & { userId: string; organizationId: string; role: Role },
  });
});

export const protectedProcedure = t.procedure.use(enforceAuth);

// Lighter auth — only requires userId, not organizationId (for onboarding)
const enforceAuthOnly = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user || !ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "No autenticado" });
  }
  return next({
    ctx: { ...ctx, userId: ctx.userId as string },
  });
});

export const authOnlyProcedure = t.procedure.use(enforceAuthOnly);

export function requireRole(...roles: Role[]) {
  return t.middleware(({ ctx, next }) => {
    if (!ctx.role || !roles.includes(ctx.role as Role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "No tienes permisos para esta accion",
      });
    }
    return next({ ctx });
  });
}

export const adminProcedure = protectedProcedure.use(
  requireRole("ADMIN")
);

export const directionProcedure = protectedProcedure.use(
  requireRole("ADMIN", "ALTA_DIRECCION")
);

export const managerProcedure = protectedProcedure.use(
  requireRole("ADMIN", "ALTA_DIRECCION", "GERENTE")
);

export const editorProcedure = protectedProcedure.use(
  requireRole("ADMIN", "ALTA_DIRECCION", "GERENTE", "JEFE_PROYECTO", "ANALISTA")
);

// ---------------------------------------------------------------------------
// Organization membership procedures
// ---------------------------------------------------------------------------

// Verifies that the authenticated user belongs to the given organization
export const orgProcedure = protectedProcedure
  .input(z.object({ organizationId: z.string() }).passthrough())
  .use(async ({ ctx, input, next }) => {
    const membership = await ctx.db.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: ctx.userId,
          organizationId: (input as { organizationId: string }).organizationId,
        },
      },
    });

    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "No perteneces a esta organización",
      });
    }

    return next({
      ctx: { ...ctx, membership, orgRole: membership.orgRole as OrgRole },
    });
  });

// Factory for procedures that require a specific permission
export function permissionProcedure(permission: Permission) {
  return orgProcedure.use(async ({ ctx, next }) => {
    if (!hasPermission(ctx.orgRole, permission)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Necesitas ser ${(PERMISSIONS[permission] as readonly string[]).join(" o ")} para realizar esta acción`,
      });
    }
    return next();
  });
}

// ---------------------------------------------------------------------------
// Data isolation procedures — automatic org verification
// ---------------------------------------------------------------------------

// Verifies that the cycleId belongs to the user's organization
export const cycleProcedure = protectedProcedure
  .input(z.object({ cycleId: z.string() }).passthrough())
  .use(async ({ ctx, input, next }) => {
    const cycle = await ctx.db.strategicCycle.findUnique({
      where: { id: (input as { cycleId: string }).cycleId },
      select: { id: true, organizationId: true },
    });

    if (!cycle || cycle.organizationId !== ctx.organizationId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "No tienes acceso a este ciclo estratégico",
      });
    }

    return next({ ctx: { ...ctx, cycleId: cycle.id } });
  });

// Verifies that the projectId belongs to the user's organization
export const projectProcedure = protectedProcedure
  .input(z.object({ projectId: z.string() }).passthrough())
  .use(async ({ ctx, input, next }) => {
    const project = await ctx.db.project.findUnique({
      where: { id: (input as { projectId: string }).projectId },
      select: { id: true, orgId: true },
    });

    if (!project || project.orgId !== ctx.organizationId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "No tienes acceso a este proyecto",
      });
    }

    return next({ ctx: { ...ctx, projectId: project.id } });
  });
