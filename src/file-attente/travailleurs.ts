import { traiterFile } from "./index";

// Travailleurs de la file d'attente, démarrés avec le serveur (instrumentation.ts).

let demarres = false;

export async function demarrerTravailleurs() {
  if (demarres) return;
  demarres = true;
  // Nettoyage quotidien des limites d'envoi (F01, T054).
  const { fileAttente } = await import("./index");
  const { nettoyerLimites } = await import("@/domaine/limites");
  const boss = await fileAttente();
  await boss.createQueue("nettoyage-limites").catch(() => undefined);
  await boss.schedule("nettoyage-limites", "15 3 * * *");
  await boss.work("nettoyage-limites", async () => {
    await nettoyerLimites();
  });
  if (process.env.SITE_MODE !== "prod" && process.env.CONNECTOR_STRIPE !== "real") {
    const { FILE_CONFIRMATIONS_TARDIVES, envoyerAuGestionnaire } = await import(
      "@/connecteurs/stripe/demo/emission"
    );
    // Confirmations de paiement tardives de la page de démonstration (FR-028).
    await traiterFile<{ contenu: string; signature: string }>(FILE_CONFIRMATIONS_TARDIVES, async ({ contenu, signature }) => {
      const statut = await envoyerAuGestionnaire(contenu, signature);
      if (statut >= 500) throw new Error(`Gestionnaire des paiements : réponse ${statut}.`);
    });
  }
}
