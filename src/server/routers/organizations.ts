import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, authOnlyProcedure } from "@/server/trpc/init";

export const organizationsRouter = router({
  // Get current user's membership for a specific org
  getMyMembership: authOnlyProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const membership = await ctx.db.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.userId,
            organizationId: input.organizationId,
          },
        },
        include: {
          organization: { select: { id: true, name: true, color: true } },
        },
      });
      return membership;
    }),

  // List all orgs the user belongs to
  listMyOrgs: authOnlyProcedure.query(async ({ ctx }) => {
    return ctx.db.organizationMember.findMany({
      where: { userId: ctx.userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            color: true,
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
  }),

  // Switch active organization
  switchActive: authOnlyProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user belongs to that org
      const membership = await ctx.db.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: ctx.userId,
            organizationId: input.organizationId,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No perteneces a esta organización" });
      }

      // Update active org in DB
      await ctx.db.user.update({
        where: { id: ctx.userId },
        data: { activeOrganizationId: input.organizationId },
      });

      return { success: true };
    }),
});
