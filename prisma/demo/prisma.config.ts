import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

loadEnvConfig(process.cwd(), false);

// Base de démonstration : équivalent fictif d'Odoo (data-model.md §2). Absente en production.
export default defineConfig({
  schema: "schema.prisma",
  migrations: { path: "migrations" },
  datasource: { url: process.env.DEMO_DATABASE_URL ?? "" },
});
