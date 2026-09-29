import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { router, protectedProcedure } from "@/server/trpc/init";
import { db } from "@/server/db";

function generateRawToken(): string {
  // 32 bytes hex = 64 chars. Prefijo identificador estratega.
  return `est_${randomBytes(32).toString("hex")}`;
}

export const workspaceTokensRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const tokens = await db.workspaceToken.findMany({
      where: { organizationId: ctx.organizationId! },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        permissions: true,
        active: true,
        lastUsedAt: true,
        createdAt: true,
        revokedAt: true,
      },
    });
    return tokens;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(80),
        permissions: z.enum(["read", "read_write"]).default("read_write"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const raw = generateRawToken();
      const hash = await bcrypt.hash(raw, 10);
      const prefix = raw.slice(0, 12); // est_xxxxxxxx para mostrar identificación
      const token = await db.workspaceToken.create({
        data: {
          organizationId: ctx.organizationId!,
          name: input.name,
          tokenHash: hash,
          tokenPrefix: prefix,
          permissions: input.permissions,
          createdById: ctx.userId,
        },
      });
      return {
        id: token.id,
        name: token.name,
        tokenPrefix: token.tokenPrefix,
        plaintext: raw, // SOLO se devuelve UNA VEZ al crear
      };
    }),

  revoke: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const token = await db.workspaceToken.findUniqueOrThrow({
        where: { id: input.id },
        select: { organizationId: true },
      });
      if (token.organizationId !== ctx.organizationId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.workspaceToken.update({
        where: { id: input.id },
        data: { active: false, revokedAt: new Date() },
      });
    }),
});
