import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

if (typeof globalThis.WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;
}

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const ctx = (globalThis as any)[Symbol.for("__cloudflare-context__")];
    if (ctx?.env?.DATABASE_URL) return ctx.env.DATABASE_URL as string;
  } catch {}
  throw new Error("DATABASE_URL is not set");
}

function createPrismaClient(): PrismaClient {
  const url = getDatabaseUrl();
  // El adapter de Neon habla por WebSocket y solo sirve contra Neon. Cualquier
  // otro Postgres (local, Supabase, RDS…) usa el driver TCP normal.
  const isNeon = /\.neon\.tech[:/]/.test(url);
  const adapter = isNeon
    ? new PrismaNeon({ connectionString: url })
    : new PrismaPg({ connectionString: url });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
