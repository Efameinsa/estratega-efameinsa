import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, permissionProcedure } from "@/server/trpc/init";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const invitationsRouter = router({
  // Generate invitation link + code
  generate: permissionProcedure("ORG_INVITE_MEMBERS")
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Deactivate previous active invitations
      await ctx.db.organizationInvitation.updateMany({
        where: { organizationId: input.organizationId, isActive: true },
        data: { isActive: false },
      });

      let code = generateCode();
      while (await ctx.db.organizationInvitation.findUnique({ where: { code } })) {
        code = generateCode();
      }

      const invitation = await ctx.db.organizationInvitation.create({
        data: {
          organizationId: input.organizationId,
          createdById: ctx.userId,
          code,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          isActive: true,
        },
      });

      const baseUrl = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

      return {
        token: invitation.token,
        code: invitation.code,
        inviteUrl: `${baseUrl}/invite/${invitation.token}`,
        expiresAt: invitation.expiresAt,
      };
    }),

  // Get active invitation for an organization
  getActive: permissionProcedure("ORG_INVITE_MEMBERS")
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const invitation = await ctx.db.organizationInvitation.findFirst({
        where: {
          organizationId: input.organizationId,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      });

      if (!invitation) return null;

      const baseUrl = process.env.NEXTAUTH_URL ?? (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

      return {
        token: invitation.token,
        code: invitation.code,
        inviteUrl: `${baseUrl}/invite/${invitation.token}`,
        expiresAt: invitation.expiresAt,
        useCount: invitation.useCount,
      };
    }),

  // Revoke active invitation
  revoke: permissionProcedure("ORG_INVITE_MEMBERS")
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.organizationInvitation.updateMany({
        where: { organizationId: input.organizationId, isActive: true },
        data: { isActive: false },
      });
      return { success: true };
    }),

  // Verify token (public — for invite page)
  verify: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const invitation = await ctx.db.organizationInvitation.findUnique({
        where: { token: input.token },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              color: true,
              _count: { select: { members: true } },
            },
          },
          createdBy: { select: { name: true } },
        },
      });

      if (!invitation || !invitation.isActive) {
        return { valid: false as const, reason: "Invitación inválida o revocada" };
      }
      if (invitation.expiresAt < new Date()) {
        return { valid: false as const, reason: "Esta invitación ha expirado" };
      }

      return {
        valid: true as const,
        organization: invitation.organization,
        invitedBy: invitation.createdBy.name,
        expiresAt: invitation.expiresAt,
      };
    }),

  // Verify short code (for /join page)
  verifyCode: publicProcedure
    .input(z.object({ code: z.string().length(6) }))
    .query(async ({ ctx, input }) => {
      const invitation = await ctx.db.organizationInvitation.findUnique({
        where: { code: input.code.toUpperCase() },
        include: {
          organization: {
            select: { id: true, name: true, color: true },
          },
          createdBy: { select: { name: true } },
        },
      });

      if (!invitation || !invitation.isActive || invitation.expiresAt < new Date()) {
        return { valid: false as const };
      }

      return {
        valid: true as const,
        token: invitation.token,
        organization: invitation.organization,
        invitedBy: invitation.createdBy.name,
      };
    }),

  // Accept invitation (authenticated user)
  accept: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await ctx.db.organizationInvitation.findUnique({
        where: { token: input.token },
      });

      if (!invitation || !invitation.isActive || invitation.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitación inválida o expirada",
        });
      }

      // Check if already a member
      const existingMember = await ctx.db.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.userId,
            organizationId: invitation.organizationId,
          },
        },
      });

      if (existingMember) {
        return { organizationId: invitation.organizationId, alreadyMember: true };
      }

      // Create membership
      await ctx.db.organizationMember.create({
        data: {
          userId: ctx.userId,
          organizationId: invitation.organizationId,
          orgRole: "MIEMBRO",
        },
      });

      // Increment use count
      await ctx.db.organizationInvitation.update({
        where: { id: invitation.id },
        data: { useCount: { increment: 1 } },
      });

      return { organizationId: invitation.organizationId, alreadyMember: false };
    }),
});
