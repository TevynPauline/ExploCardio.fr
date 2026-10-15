import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

loadEnvConfig(process.cwd(), false);

// Base du site : données propres au site, réelles dès la phase 1 (data-model.md §1).
export default defineConfig({
  schema: "schema.prisma",
  migrations: { path: "migrations" },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
