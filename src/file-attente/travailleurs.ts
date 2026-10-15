import { traiterFile } from "./index";

// Travailleurs de la file d'attente, démarrés avec le serveur (instrumentation.ts).

let demarres = false;

export async function demarrerTravailleurs() {
  if (demarres) return;
  demarres = true;
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
