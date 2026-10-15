import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const racine = (chemin: string) => fileURLToPath(new URL(chemin, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@/": racine("./src/"),
      "@app/": racine("./app/"),
      "@brand/": racine("./docs/brand/"),
      "@generated/": racine("./generated/"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/contract/**/*.test.ts"],
    setupFiles: ["tests/setup-env.ts"],
    // Les tests partagent les bases locales : exécution en série.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
