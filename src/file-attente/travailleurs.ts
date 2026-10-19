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
  // F02 : purge quotidienne des comptes non confirmés (30 jours) et rejeu des fiches clients.
  const { purgerNonConfirmes } = await import("@/domaine/comptes/inscription");
  const { creerFicheClient, FILE_FICHE_CLIENT } = await import("@/domaine/comptes/validation");
  await boss.createQueue("purge-comptes").catch(() => undefined);
  await boss.schedule("purge-comptes", "30 3 * * *");
  await boss.work("purge-comptes", async () => {
    await purgerNonConfirmes();
    // F03 : paniers de visiteurs inactifs depuis 30 jours.
    const { purgerPaniersAnonymes } = await import("@/domaine/catalogue/panier");
    await purgerPaniersAnonymes();
  });
  // F04 : rattrapage des commandes payées non enregistrées et des paiements abandonnés.
  await boss.createQueue("rattrapage-commandes").catch(() => undefined);
  await boss.schedule("rattrapage-commandes", "*/5 * * * *");
  await boss.work("rattrapage-commandes", async () => {
    const { rattraperCommandes } = await import("@/domaine/commande/effets");
    await rattraperCommandes();
  });
  // F04 : suivi des commandes (expédition, annulation, remboursements), toutes les 5 minutes (D6).
  await boss.createQueue("suivi-commandes").catch(() => undefined);
  await boss.schedule("suivi-commandes", "*/5 * * * *");
  await boss.work("suivi-commandes", async () => {
    const { suivreCommandes } = await import("@/domaine/commande/suivi");
    await suivreCommandes();
  });
  // F05 : suivi des locations (expédition, accès Cloud, impayés, retours), toutes les 5 minutes.
  await boss.createQueue("suivi-locations").catch(() => undefined);
  await boss.schedule("suivi-locations", "*/5 * * * *");
  await boss.work("suivi-locations", async () => {
    const { suivreLocations } = await import("@/domaine/location/suivi");
    await suivreLocations();
  });
  // F05 : rappels des locations (échéances, retours en retard), fermetures d'accès, chaque matin.
  await boss.createQueue("rappels-locations").catch(() => undefined);
  await boss.schedule("rappels-locations", "30 7 * * *");
  await boss.work("rappels-locations", async () => {
    const { envoyerRappelsLocations } = await import("@/domaine/location/rappels");
    await envoyerRappelsLocations();
  });
  // F06 : suivi de la fidélité toutes les 5 minutes ; rappels (fin des droits, expiration) chaque matin.
  await boss.createQueue("suivi-fidelite").catch(() => undefined);
  await boss.schedule("suivi-fidelite", "*/5 * * * *");
  await boss.work("suivi-fidelite", async () => {
    const { suivreFidelite } = await import("@/domaine/fidelite/suivi");
    await suivreFidelite();
  });
  await boss.createQueue("rappels-fidelite").catch(() => undefined);
  await boss.schedule("rappels-fidelite", "0 8 * * *");
  await boss.work("rappels-fidelite", async () => {
    const { envoyerRappelsFidelite } = await import("@/domaine/fidelite/rappels");
    await envoyerRappelsFidelite();
  });
  // F04 : virements (rappel, réception, annulation à l'échéance), chaque matin.
  await boss.createQueue("virements").catch(() => undefined);
  await boss.schedule("virements", "0 7 * * *");
  await boss.work("virements", async () => {
    const { traiterVirements } = await import("@/domaine/commande/virement");
    await traiterVirements();
  });
  // F04 : copie des demandes de financement en opportunités, quand Odoo était injoignable.
  const { FILE_OPPORTUNITES, copierEnOpportunite } = await import("@/domaine/financement/demande");
  await traiterFile<{ demandeId: string }>(FILE_OPPORTUNITES, async ({ demandeId }) => {
    if (!(await copierEnOpportunite(demandeId, { depuisFile: true }))) throw new Error("Odoo injoignable : copie de la demande reportée.");
  });
  await traiterFile<{ compteId: string }>(FILE_FICHE_CLIENT, async ({ compteId }) => {
    await creerFicheClient(compteId);
  });
  const { FILE_COORDONNEES } = await import("@/domaine/comptes/profil");
  const { registre } = await import("@/connecteurs/registre");
  await traiterFile<{ ref: string; coordonnees: Record<string, unknown> }>(FILE_COORDONNEES, async ({ ref, coordonnees }) => {
    await registre.odoo().clients.mettreAJourCoordonnees(ref, coordonnees);
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
