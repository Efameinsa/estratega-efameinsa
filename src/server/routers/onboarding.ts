import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, authOnlyProcedure } from "@/server/trpc/init";

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

export const onboardingRouter = router({
  // Get current onboarding status
  getStatus: authOnlyProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.userId },
      select: {
        onboardingCompleted: true,
        onboardingStep: true,
        orgMemberships: {
          select: {
            organizationId: true,
            orgRole: true,
            organization: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });
    return user;
  }),

  // Step 1: Create organization
  createOrganization: authOnlyProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100),
        description: z.string().max(300).optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#185FA5"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create organization
      const org = await ctx.db.organization.create({
        data: {
          name: input.name,
          sector: input.description,
          color: input.color,
        },
      });

      // Remove old memberships (from default org)
      await ctx.db.organizationMember.deleteMany({
        where: { userId: ctx.userId },
      });

      // Create membership as PROPIETARIO
      await ctx.db.organizationMember.create({
        data: {
          userId: ctx.userId,
          organizationId: org.id,
          orgRole: "PROPIETARIO",
        },
      });

      // Update user's organizationId + activeOrganizationId
      await ctx.db.user.update({
        where: { id: ctx.userId },
        data: {
          organizationId: org.id,
          activeOrganizationId: org.id,
          onboardingStep: "INVITE",
        },
      });

      // Auto-generate invitation
      let code = generateCode();
      while (await ctx.db.organizationInvitation.findUnique({ where: { code } })) {
        code = generateCode();
      }

      const invitation = await ctx.db.organizationInvitation.create({
        data: {
          organizationId: org.id,
          createdById: ctx.userId,
          code,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
      });

      const baseUrl = process.env.NEXTAUTH_URL
        ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

      return {
        org: { id: org.id, name: org.name, color: org.color },
        inviteCode: invitation.code,
        inviteToken: invitation.token,
        inviteUrl: `${baseUrl}/invite/${invitation.token}`,
      };
    }),

  // Step 2: Accept invitation (Camino B)
  acceptInvitation: authOnlyProcedure
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
      const existing = await ctx.db.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.userId,
            organizationId: invitation.organizationId,
          },
        },
      });

      if (!existing) {
        // Remove old memberships
        await ctx.db.organizationMember.deleteMany({
          where: { userId: ctx.userId },
        });

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
      }

      // Complete onboarding — set active org
      await ctx.db.user.update({
        where: { id: ctx.userId },
        data: {
          organizationId: invitation.organizationId,
          activeOrganizationId: invitation.organizationId,
          onboardingCompleted: true,
          onboardingStep: "DONE",
        },
      });

      return { organizationId: invitation.organizationId };
    }),

  // Skip invite step
  skipInvite: authOnlyProcedure.mutation(async ({ ctx }) => {
    await ctx.db.user.update({
      where: { id: ctx.userId },
      data: { onboardingStep: "CYCLE" },
    });
    return { success: true };
  }),

  // Step 3: Create cycle
  createCycle: authOnlyProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(3).max(100),
        startYear: z.number().min(2020).max(2040),
        endYear: z.number().min(2020).max(2050),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.endYear <= input.startYear) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El año de fin debe ser posterior al de inicio",
        });
      }

      // Verify membership
      const membership = await ctx.db.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.userId,
            organizationId: input.organizationId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No perteneces a esta organización",
        });
      }

      const cycle = await ctx.db.strategicCycle.create({
        data: {
          organizationId: input.organizationId,
          name: input.name,
          yearStart: input.startYear,
          yearEnd: input.endYear,
          status: "IN_PROGRESS",
          // Initialize module statuses
          moduleStatuses: {
            create: [
              { moduleId: "M1", status: "PENDIENTE", progress: 0 },
              { moduleId: "M2", status: "BLOQUEADO", progress: 0 },
              { moduleId: "M3", status: "BLOQUEADO", progress: 0 },
              { moduleId: "M4", status: "BLOQUEADO", progress: 0 },
              { moduleId: "M5", status: "BLOQUEADO", progress: 0 },
            ],
          },
        },
      });

      // Complete onboarding
      await ctx.db.user.update({
        where: { id: ctx.userId },
        data: {
          onboardingCompleted: true,
          onboardingStep: "DONE",
        },
      });

      return { id: cycle.id, name: cycle.name };
    }),
});
