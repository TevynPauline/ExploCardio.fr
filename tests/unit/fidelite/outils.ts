import { randomUUID } from "node:crypto";
import { creerRegistre } from "@/connecteurs/registre";
import { dbDemo } from "@/lib/db/demo";
import { dbSite } from "@/lib/db/site";

export { compteValide, nettoyer, remplirPanier } from "../commande/outils";

// Outils des tests de F06 : commandes fictives passées directement dans le connecteur Odoo de
// démonstration, puis règles de fidélité appliquées (comme Odoo le fait à chaque changement d'état).

export const ELECTRODES = "EC-ELEC-HOLTER-500"; // carton d'électrodes, 160 € HT
export const CARTE_SD = "EC-DMS-SD-8GO"; // carte SD, 25 € HT
/** 1 200 € HT éligibles : 120 € de bons (10 %) et ouverture des droits. */
export const COMMANDE_1200 = [
  { defaultCode: ELECTRODES, quantite: 5 },
  { defaultCode: CARTE_SD, quantite: 16 },
];

const odoo = () => creerRegistre(process.env).odoo();
const livraison = { adresse: "1 rue du Test", codePostal: "69003", ville: "Lyon", fraisPortHt: 0 };

/** Remet du stock fictif : les tests passent de vraies commandes, répétées d'un lancement à l'autre. */
export async function reapprovisionner(codes: string[], quantite = 500) {
  await dbDemo().stock.updateMany({ where: { variante: { defaultCode: { in: codes } }, quantite: { lt: quantite } }, data: { quantite } });
}

/** Commande payée par carte, avec un paiement Stripe fictif remboursable. */
export async function commandePayee(partenaireRef: string, lignes: { defaultCode: string; quantite: number }[], bonsUtilisesHt?: number) {
  await reapprovisionner(lignes.map((l) => l.defaultCode));
  const paiementRef = `FICT-pi-${randomUUID()}`;
  const { ref } = await odoo().commandes.creerCommandePayee({ partenaireRef, lignes, livraison, paiement: { mode: "carte", reference: paiementRef }, bonsUtilisesHt }, `test-f06:${randomUUID()}`);
  const commande = await odoo().commandes.lireCommande(ref);
  await dbDemo().sessionPaiementDemo.create({
    data: { id: `cs_${randomUUID()}`, cle: `test-f06:${ref}`, nature: "paiement", commandeRef: ref, partenaireRef, montantTtcCentimes: commande.montantTtc, moyens: ["carte"], urlRetour: "/", urlAnnulation: "/", etat: "payee", paiementRef },
  });
  await odoo().fidelite.appliquerRegles(ref);
  return { ref, montantTtc: commande.montantTtc };
}

/** Commande par virement, en attente de paiement. */
export async function commandeVirement(partenaireRef: string, lignes: { defaultCode: string; quantite: number }[], bonsUtilisesHt?: number) {
  await reapprovisionner(lignes.map((l) => l.defaultCode));
  const { ref } = await odoo().commandes.creerCommandeVirement({ partenaireRef, lignes, livraison, paiement: { mode: "virement", reference: "FICT-VIR-f06" }, bonsUtilisesHt }, `test-f06:${randomUUID()}`);
  return { ref, montantTtc: (await odoo().commandes.lireCommande(ref)).montantTtc };
}

export const emails = (destinataire: string, objet: string) => dbSite().messageDemonstration.count({ where: { destinataire, objet: { contains: objet } } });
export const dernierEmail = (destinataire: string, objet: string) =>
  dbSite().messageDemonstration.findFirstOrThrow({ where: { destinataire, objet: { contains: objet } }, orderBy: { date: "desc" } });
