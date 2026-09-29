import EmbeddedPostgres from "embedded-postgres";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Levanta un PostgreSQL real y efímero para las pruebas y le aplica el esquema.
const PORT = 54329;
export const TEST_URL = `postgres://postgres:postgres@localhost:${PORT}/estratega_test?sslmode=disable`;

export default async function setup() {
  if (process.env.TEST_DATABASE_URL) return; // base provista externamente
  const dir = mkdtempSync(path.join(tmpdir(), "estratega-pg-"));
  const pg = new EmbeddedPostgres({ databaseDir: dir, user: "postgres", password: "postgres", port: PORT, persistent: false });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("estratega_test");
  execSync("npx prisma db push", { stdio: "ignore", env: { ...process.env, DATABASE_URL: TEST_URL } });
  process.env.TEST_DATABASE_URL = TEST_URL;
  return async () => {
    await pg.stop();
    rmSync(dir, { recursive: true, force: true });
  };
}
