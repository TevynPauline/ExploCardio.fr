import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { dbSite } from "@/lib/db/site";
import { AUTOMATIQUE, fermerAcces, ouvrirAcces, programmerFin } from "./acces";

// Déclencheurs des achats (F12, R3, D2) : une configuration « appareil + logiciel Cloud » payée
// ouvre l'accès pour la période incluse fixée dans Odoo (FR-006) ; un remboursement intégral
// avant la livraison le ferme sans délai de grâce, après la livraison avec.

/** Ouvre les périodes incluses d'une commande payée (idempotent). */
export async function ouvrirPeriodesIncluses(odooCommandeRef: string, maintenant = new Date()): Promise<number> {
  let ouverts = 0;
  try {
    const commande = await registre.odoo().commandes.lireCommande(odooCommandeRef);
    const compte = await dbSite().compteClient.findFirst({ where: { odooPartnerRef: commande.partenaireRef } });
    if (!compte) return 0;
    const deja = new Set((await dbSite().accesLogiciel.findMany({ where: { sourceRef: odooCommandeRef, origine: "periode_incluse" } })).map((a) => a.logiciel));
    for (const l of commande.lignes) {
      const article = await registre.odoo().catalogue.lireArticle(l.defaultCode).catch(() => null);
      const inclus = article?.variantes.find((v) => v.defaultCode === l.defaultCode)?.logicielInclus;
      if (!inclus || deja.has(inclus.logiciel)) continue;
      const fin = new Date(maintenant);
      fin.setMonth(fin.getMonth() + inclus.moisInclus);
      await ouvrirAcces({ compteId: compte.id, logiciel: inclus.logiciel, origine: "periode_incluse", sourceRef: odooCommandeRef, debut: maintenant, finPrevue: fin }, AUTOMATIQUE, maintenant);
      deja.add(inclus.logiciel);
      ouverts++;
    }
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e; // repris au relevé suivant des commandes
  }
  return ouverts;
}

/** Remboursement intégral d'un achat (D2) : avant la livraison, fermeture sans délai de grâce. */
export async function apresRemboursementTotal(odooCommandeRef: string, livree: boolean, maintenant = new Date()) {
  const acces = await dbSite().accesLogiciel.findMany({ where: { sourceRef: odooCommandeRef, origine: "periode_incluse", etat: { not: "ferme" } } });
  for (const a of acces) {
    if (livree) {
      await programmerFin(odooCommandeRef, maintenant, { id: null, libelle: "remboursement de la commande" });
    } else {
      const maj = await dbSite().accesLogiciel.update({ where: { id: a.id }, data: { sansGrace: true, finPrevue: maintenant } });
      await fermerAcces(maj, "achat remboursé avant la livraison", { id: null, libelle: "remboursement de la commande" }, maintenant);
    }
  }
}
