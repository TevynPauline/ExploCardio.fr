import { dbDemo } from "@/lib/db/demo";
import { premiereDatePour } from "@/domaine/location/offre";
import { choisirLivraison, choisirPaiement, enregistrerAdresses, ouvrirCommande } from "@/domaine/commande/tunnel";
import { compteValide, remplirPanier } from "../commande/outils";

export { compteValide, nettoyer, evenement, remplirPanier } from "../commande/outils";

export const MAD = "EC-SUN-OSCAR2";
export const adresses = { livraison: { ligne1: "2 rue Livraison", codePostal: "69003", ville: "Lyon" }, facturation: { ligne1: "2 rue Livraison", codePostal: "69003", ville: "Lyon" } };

/** Rend au parc les appareils pris par les comptes de test unitaires (le parc fictif est limité). */
export async function rendreParcDesTests() {
  const db = dbDemo();
  const locations = await db.abonnement.findMany({
    where: { partenaire: { OR: [{ email: { startsWith: "commande-" } }, { email: { startsWith: "compte-" } }, { ref: { startsWith: "FICT-P-E2E-" } }] }, etat: { notIn: ["terminee", "annulee"] }, numeroSerieId: { not: null } },
  });
  await db.abonnement.updateMany({ where: { id: { in: locations.map((l) => l.id) } }, data: { etat: "terminee" } });
  await db.numeroSerie.updateMany({ where: { id: { in: locations.map((l) => l.numeroSerieId!) }, statut: "loue" }, data: { statut: "disponible" } });
  // Appareils mis « en maintenance » par les tests de retour (sans date de retour prévue).
  await db.numeroSerie.updateMany({ where: { statut: "en_maintenance", retourPrevu: null }, data: { statut: "disponible" } });
  for (const r of await db.reservationAppareil.findMany({ where: { etat: "active" } })) {
    await db.reservationAppareil.update({ where: { id: r.id }, data: { etat: "liberee" } });
    await db.numeroSerie.updateMany({ where: { id: r.numeroSerieId, statut: "loue" }, data: { statut: r.statutAvant } });
  }
}

/** Commande d'une mise à disposition prête à payer (adresses, date au plus tôt, SEPA). */
export async function commandeMad(options: { statut?: "valide" | "en_attente"; code?: string; achats?: { defaultCode: string; quantite: number }[] } = {}) {
  const compte = await compteValide({ statut: options.statut });
  const code = options.code ?? MAD;
  await remplirPanier(compte.compteId, [
    ...(options.achats ?? []).map((a) => ({ ...a, formule: "achat" as const })),
    { defaultCode: code, formule: "mise_a_disposition", quantite: 1 },
  ]);
  let c = await enregistrerAdresses(await ouvrirCommande(compte.compteId), adresses);
  const date = await premiereDatePour(code, "69003");
  c = await choisirLivraison(c, options.achats?.length ? "standard" : null, { [code]: date });
  c = await choisirPaiement(c, options.achats?.length ? "carte" : null, "sepa");
  return { compte, commande: c, date };
}
