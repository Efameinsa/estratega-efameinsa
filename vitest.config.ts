import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Pruebas: unitarias (lógica pura) + integración de routers tRPC contra una
// base PostgreSQL local de pruebas (TEST_DATABASE_URL), nunca la de producción.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
