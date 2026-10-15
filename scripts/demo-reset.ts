import nextEnv from "@next/env";

// `npm run demo:reset` — réinitialise le site de démonstration en moins d'une minute (FR-022).
// Refuse de s'exécuter si un connecteur concerné est en mode réel (FR-023).

nextEnv.loadEnvConfig(process.cwd(), true);

async function principal() {
  const { reinitialiserDemonstration } = await import("@/connecteurs/demonstration");
  const { afficherBilan } = await import("../prisma/demo/seed/affichage");
  const bilan = await reinitialiserDemonstration({ id: null, libelle: "équipe technique (commande npm run demo:reset)" });
  afficherBilan("Réinitialisation terminée", bilan);
}

principal()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(`\n✖ ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
