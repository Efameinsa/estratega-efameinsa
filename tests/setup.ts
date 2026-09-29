// Fuerza la base de pruebas antes de que se importe el cliente Prisma.
const url = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:54329/estratega_test?sslmode=disable";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  throw new Error("Las pruebas solo corren contra una base local (TEST_DATABASE_URL).");
}
process.env.DATABASE_URL = url;

// Cierra el pool al terminar cada archivo (la base local de pruebas admite pocas conexiones).
import { afterAll } from "vitest";
afterAll(async () => {
  const { db } = await import("@/server/db");
  await db.$disconnect();
});
