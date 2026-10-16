import type { PrismaClient as ClientDemo } from "@generated/demo/client";
import type { PrismaClient as ClientSite } from "@generated/site/client";
import { creerComptesDemo, supprimerComptesDeSeance, type IdentifiantsDemo } from "../../site/seed/comptes-demo";
import { remplirContenusInitiaux } from "../../site/seed/contenus-initiaux";
import { remplirParametresDemo } from "../../site/seed/parametres-demo";
import { remplirCatalogue } from "./catalogue";
import { remplirHistoriques, remplirRegles } from "./historiques";
import { remplirPartenaires } from "./partenaires";

// Remplissage complet (FR-019) : vide la base de démonstration (entièrement fictive) puis
// recrée le jeu de départ, et recrée les cinq comptes de démonstration dans la base du site.
// Utilisé par `npm run demo:seed`, `npm run demo:reset` et le back-office.

export async function viderBaseDemo(db: ClientDemo) {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    await db.$executeRawUnsafe(
      `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`,
    );
  }
}

export type BilanRemplissage = {
  modeles: number;
  variantes: number;
  partenaires: number;
  commandes: number;
  locations: number;
  acces: number;
  identifiants: IdentifiantsDemo;
  motDePasseSite: string | null;
  dureeMs: number;
};

export async function remplirJeuDeDepart(demo: ClientDemo, site: ClientSite): Promise<BilanRemplissage> {
  const debut = performance.now();
  await viderBaseDemo(demo);
  const { modeles, variantes } = await remplirCatalogue(demo);
  await remplirRegles(demo);
  const partenaires = await remplirPartenaires(demo);
  const { commandes, locations, acces } = await remplirHistoriques(demo, partenaires);

  await supprimerComptesDeSeance(site);
  const identifiants = await creerComptesDemo(site);
  const { motDePasseSite } = await remplirParametresDemo(site);
  await remplirContenusInitiaux(site);

  return {
    modeles,
    variantes,
    partenaires: partenaires.size,
    commandes,
    locations,
    acces,
    identifiants,
    motDePasseSite,
    dureeMs: Math.round(performance.now() - debut),
  };
}
