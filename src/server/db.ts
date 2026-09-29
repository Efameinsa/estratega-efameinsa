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

const isLocal = (url: string) => /@(localhost|127\.0\.0\.1)[:/]/.test(url);

function createPrismaClient(): PrismaClient {
  const url = getDatabaseUrl();
  // El adapter de Neon habla por WebSocket y solo sirve contra Neon. Cualquier
  // otro Postgres (local, Supabase, RDS…) usa el driver TCP normal.
  const isNeon = /\.neon\.tech[:/]/.test(url);
  const adapter = isNeon
    ? new PrismaNeon({ connectionString: url })
    : new PrismaPg({
        connectionString: url,
        // Serverless + pooler de Supabase: pocas conexiones por instancia y
        // que se liberen rápido; sin esperas infinitas si el pool se llena.
        max: isLocal(url) ? 10 : 4,
        idleTimeoutMillis: 5_000,
        connectionTimeoutMillis: 10_000,
      });
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
