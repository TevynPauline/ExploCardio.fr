import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Identifiants des comptes de démonstration (DEMO_ACCOUNTS_PASSWORD, DEMO_TOTP_SECRET) et bases
// locales : lus dans .env.local en local, fournis par le workflow en intégration continue.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const port = Number(process.env.PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/acces-global.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    storageState: "playwright/.auth/acces-demo.json",
    locale: "fr-FR",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run build && npm run start -- -p ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
      },
});
