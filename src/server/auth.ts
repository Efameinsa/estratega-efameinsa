import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET;
  try {
    const ctx = (globalThis as any)[Symbol.for("__cloudflare-context__")];
    if (ctx?.env?.AUTH_SECRET) return ctx.env.AUTH_SECRET;
    if (ctx?.env?.NEXTAUTH_SECRET) return ctx.env.NEXTAUTH_SECRET;
  } catch {}
  return "build-time-placeholder";
}

/** Find user by email via Prisma (Neon PostgreSQL) */
async function findUserByEmail(email: string) {
  const user = await db.user.findUnique({
    where: { email },
    include: { organization: true },
  });
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    hashedPassword: user.hashedPassword,
    role: user.role,
    active: user.active,
    onboardingCompleted: user.onboardingCompleted,
    onboardingStep: user.onboardingStep,
    activeOrganizationId: user.activeOrganizationId,
    organizationId: user.organizationId,
    organizationName: user.organization.name,
  };
}

/** Find user by id for token refresh */
async function findUserById(id: string) {
  const user = await db.user.findUnique({
    where: { id },
    select: {
      onboardingCompleted: true,
      onboardingStep: true,
      activeOrganizationId: true,
      organizationId: true,
      role: true,
      activeOrganization: { select: { name: true } },
      organization: { select: { name: true } },
    },
  });
  return user;
}

// ---------------------------------------------------------------------------
// NextAuth config
// ---------------------------------------------------------------------------

const authConfig = {
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contrasena", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null;

          const user = await findUserByEmail(credentials.email as string);
          if (!user || !user.active) return null;

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.hashedPassword
          );
          if (!isValid) return null;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            onboardingCompleted: user.onboardingCompleted,
            onboardingStep: user.onboardingStep,
            activeOrganizationId: user.activeOrganizationId ?? user.organizationId,
            organizationId: user.activeOrganizationId ?? user.organizationId,
            organizationName: user.organizationName,
          } as Record<string, unknown>;
        } catch (error) {
          console.error("[AUTH] authorize error:", error);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" as const },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user, trigger, session: updateData }: { token: any; user: any; trigger?: string; session?: any }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.onboardingCompleted = user.onboardingCompleted;
        token.onboardingStep = user.onboardingStep;
        token.activeOrganizationId = user.activeOrganizationId;
        token.organizationId = user.activeOrganizationId ?? user.organizationId;
        token.organizationName = user.organizationName;
      }
      // Refresh from DB on session update trigger (e.g. after onboarding, org switch)
      if (trigger === "update") {
        if (token.id) {
          const fresh = await findUserById(token.id as string);
          if (fresh) {
            const activeOrgId = fresh.activeOrganizationId ?? fresh.organizationId;
            token.onboardingCompleted = fresh.onboardingCompleted;
            token.onboardingStep = fresh.onboardingStep;
            token.activeOrganizationId = activeOrgId;
            token.organizationId = activeOrgId;
            token.organizationName = fresh.activeOrganization?.name ?? fresh.organization.name;
            token.role = fresh.role;
          }
        }
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.onboardingCompleted = token.onboardingCompleted;
        session.user.onboardingStep = token.onboardingStep;
        session.user.activeOrganizationId = token.activeOrganizationId;
        session.user.organizationId = token.organizationId;
        session.user.organizationName = token.organizationName;
      }
      return session;
    },
  },
};

// Lazy-init to resolve secret at request time
let _auth: ReturnType<typeof NextAuth> | null = null;
let _lastSecret: string | null = null;

function getAuth() {
  const secret = getSecret();
  if (!_auth || secret !== _lastSecret) {
    _lastSecret = secret;
    _auth = NextAuth({ ...authConfig, secret });
  }
  return _auth;
}

export const handlers = {
  GET: (...args: any[]) => (getAuth().handlers as any).GET(...args),
  POST: (...args: any[]) => (getAuth().handlers as any).POST(...args),
};

export const auth = (...args: any[]) => (getAuth() as any).auth(...args);
export const signIn = (...args: any[]) => (getAuth() as any).signIn(...args);
export const signOut = (...args: any[]) => (getAuth() as any).signOut(...args);
