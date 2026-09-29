import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, authOnlyProcedure, orgProcedure, permissionProcedure } from "@/server/trpc/init";
import { hasPermission, type OrgRole } from "@/lib/permissions";

export const membersRouter = router({
  // Get all members of an organization
  getAll: orgProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.organizationMember.findMany({
        where: { organizationId: input.organizationId },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: [
          { orgRole: "asc" }, // PROPIETARIO first
          { joinedAt: "asc" },
        ],
      });
    }),

  // Get current user's membership for the active org
  me: authOnlyProcedure.query(async ({ ctx }) => {
    // Get active org from user record (not from session, which might be stale)
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.userId },
      select: { activeOrganizationId: true, organizationId: true },
    });
    const orgId = user?.activeOrganizationId ?? user?.organizationId;
    if (!orgId) return null;

    return ctx.db.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: ctx.userId,
          organizationId: orgId,
        },
      },
      include: {
        organization: { select: { id: true, name: true, color: true } },
      },
    });
  }),

  // Update a member's role (only PROPIETARIO can do this)
  updateRole: permissionProcedure("ORG_MANAGE_ROLES")
    .input(
      z.object({
        organizationId: z.string(),
        userId: z.string(),
        newRole: z.enum(["ADMINISTRADOR", "MIEMBRO"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.db.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: input.userId,
            organizationId: input.organizationId,
          },
        },
      });

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Miembro no encontrado" });
      }

      if (target.orgRole === "PROPIETARIO") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No se puede cambiar el rol del propietario",
        });
      }

      return ctx.db.organizationMember.update({
        where: {
          userId_organizationId: {
            userId: input.userId,
            organizationId: input.organizationId,
          },
        },
        data: { orgRole: input.newRole },
      });
    }),

  // Remove a member from the organization
  remove: orgProcedure
    .input(
      z.object({
        organizationId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.db.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: input.userId,
            organizationId: input.organizationId,
          },
        },
      });

      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Miembro no encontrado" });
      }

      if (target.orgRole === "PROPIETARIO") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No se puede eliminar al propietario",
        });
      }

      // A member can leave by themselves, others need MEMBERS_REMOVE permission
      const isSelf = input.userId === ctx.userId;
      if (!isSelf && !hasPermission(ctx.orgRole, "MEMBERS_REMOVE")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No tienes permiso para eliminar miembros",
        });
      }

      return ctx.db.organizationMember.delete({
        where: {
          userId_organizationId: {
            userId: input.userId,
            organizationId: input.organizationId,
          },
        },
      });
    }),
});
