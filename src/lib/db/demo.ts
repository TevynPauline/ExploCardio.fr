import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@generated/demo/client";

// Base de démonstration : équivalent fictif d'Odoo (data-model.md §2).
// Elle n'existe que sur le site de démonstration : le client refuse de s'initialiser sinon.

const globale = globalThis as unknown as { __dbDemo?: PrismaClient };

function creerClient(): PrismaClient {
  if (process.env.SITE_MODE !== "demo") {
    throw new Error(
      "La base de démonstration n'est utilisable que si SITE_MODE=demo (site de démonstration).",
    );
  }
  const url = process.env.DEMO_DATABASE_URL;
  if (!url) {
    throw new Error("DEMO_DATABASE_URL est absente : la base de démonstration n'est pas configurée.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

export function dbDemo(): PrismaClient {
  globale.__dbDemo ??= creerClient();
  return globale.__dbDemo;
}
