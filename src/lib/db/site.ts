import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@generated/site/client";

// Base du site : données propres au site, réelles dès la phase 1 (data-model.md §1).

const globale = globalThis as unknown as { __dbSite?: PrismaClient };

function creerClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL est absente : la base du site n'est pas configurée.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

export function dbSite(): PrismaClient {
  globale.__dbSite ??= creerClient();
  return globale.__dbSite;
}
