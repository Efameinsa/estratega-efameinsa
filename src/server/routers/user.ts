import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { router, protectedProcedure, authOnlyProcedure, publicProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";

export const userRouter = router({
  list: authOnlyProcedure.query(async ({ ctx }) => {
    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { activeOrganizationId: true, organizationId: true },
    });
    const orgId = user?.activeOrganizationId ?? user?.organizationId;
    if (!orgId) return [];

    return db.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        area: true,
        phone: true,
        profile: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        organizationId: true,
      },
      orderBy: { name: "asc" },
    });
  }),

  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.string().optional(),
        organizationId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Find default org or use provided orgId
      let orgId = input.organizationId;
      if (!orgId) {
        const defaultOrg = await db.organization.findFirst({ select: { id: true } });
        orgId = defaultOrg?.id ?? "org-default";
      }

      const user = await db.user.create({
        data: {
          name: input.name,
          email: input.email,
          hashedPassword,
          role: input.role ?? "ADMIN",
          organizationId: orgId,
          onboardingCompleted: false,
        },
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.string().optional(),
        phone: z.string().optional(),
        profile: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const hashedPassword = await bcrypt.hash(input.password, 10);
      return db.user.create({
        data: {
          name: input.name,
          email: input.email,
          hashedPassword,
          role: input.role ?? "ADMIN",
          phone: input.phone,
          profile: input.profile,
          organizationId: ctx.organizationId ?? "",
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          profile: true,
          active: true,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        role: z.string().optional(),
        phone: z.string().nullable().optional(),
        profile: z.string().nullable().optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the target user belongs to the same organization
      const target = await db.user.findUniqueOrThrow({ where: { id: input.id } });
      if (target.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sin acceso" });
      }
      const { id, ...data } = input;
      return db.user.update({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          profile: true,
          active: true,
        },
        data,
      });
    }),
});
