import nextEnv from "@next/env";

// `npm run demo:seed` — remplit la base de démonstration et recrée les comptes de démonstration.
// Refuse de s'exécuter hors du mode démonstration ou si le connecteur Odoo est réel (FR-023).

nextEnv.loadEnvConfig(process.cwd(), true);

async function principal() {
  const { verifierModeDemonstration } = await import("@/lib/demo/garde");
  verifierModeDemonstration("remplissage");
  const { dbDemo } = await import("@/lib/db/demo");
  const { dbSite } = await import("@/lib/db/site");
  const { remplirJeuDeDepart } = await import("./remplissage");
  const { afficherBilan } = await import("./affichage");

  const bilan = await remplirJeuDeDepart(dbDemo(), dbSite());
  await dbSite().journalAction.create({
    data: { auteur: "équipe technique (commande npm run demo:seed)", action: "demo.remplissage", detail: { dureeMs: bilan.dureeMs } },
  });
  afficherBilan("Remplissage terminé", bilan);
}

principal()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(`\n✖ ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
