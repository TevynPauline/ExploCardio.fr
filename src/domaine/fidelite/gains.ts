import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import type { Cagnotte, EstimationGains } from "@/connecteurs/odoo/interfaces";
import { dbSite } from "@/lib/db/site";
import { partenaireDuCompte } from "../commande/devis";

// Gains annoncés (F06, FR-024) : ce qu'un panier ou un achat rapporte en bons d'achat et en
// droits d'assistance, et ce qui manque pour le palier suivant. Calculés par Odoo (FR-020),
// aussi pour un visiteur (A3).

export type Gains = EstimationGains & { droitsActifsJusquAu: Date | null };

export async function gainsDe(compteId: string | null | undefined, lignes: { defaultCode: string; quantite: number; offerte?: boolean }[]): Promise<Gains | null> {
  const achats = lignes.filter((l) => l.quantite > 0);
  if (!achats.length) return null;
  const partenaireRef = await partenaireDuCompte(compteId);
  try {
    const e = await registre.odoo().fidelite.estimerGains(partenaireRef, achats);
    const droits = partenaireRef ? await registre.odoo().fidelite.lireDroitsAssistance(partenaireRef) : null;
    return { ...e, droitsActifsJusquAu: droits?.statut === "actif" ? droits.fin : null };
  } catch (e) {
    if (estErreurConnecteur(e)) return null;
    throw e;
  }
}

/** Gains des achats du panier. */
export async function gainsDuPanier(panierId: string, compteId: string | null | undefined) {
  const lignes = await dbSite().lignePanier.findMany({ where: { panierId, formule: "achat" } });
  return gainsDe(compteId, lignes.map((l) => ({ defaultCode: l.defaultCode, quantite: l.quantite })));
}

/** Solde et prochaine expiration, pour le choix des bons au panier. */
export async function cagnotteDuCompte(compteId: string | null | undefined): Promise<Cagnotte | null> {
  const partenaireRef = await partenaireDuCompte(compteId);
  if (!partenaireRef) return null;
  try {
    return await registre.odoo().fidelite.lireCagnotte(partenaireRef);
  } catch (e) {
    if (estErreurConnecteur(e)) return null;
    throw e;
  }
}

/**
 * Après une commande (US2 scénario 2, A2) : bons crédités et droits ouverts par cette commande,
 * ou ce qui manquait pour ouvrir les droits.
 */
export async function resultatDeCommande(compteId: string, odooRef: string) {
  const partenaireRef = await partenaireDuCompte(compteId);
  if (!partenaireRef) return null;
  try {
    const [cagnotte, droits, commande] = await Promise.all([
      registre.odoo().fidelite.lireCagnotte(partenaireRef),
      registre.odoo().fidelite.lireDroitsAssistance(partenaireRef),
      registre.odoo().commandes.lireCommande(odooRef),
    ]);
    const bonsHt = cagnotte.mouvements.filter((m) => m.type === "credit" && m.commandeRef === odooRef).reduce((s, m) => s + m.montantHt, 0);
    const ouverture = droits.historique.find((e) => e.commandeRef === odooRef && (e.type === "ouverture" || e.type === "prolongation")) ?? null;
    const estimation = await registre.odoo().fidelite.estimerGains(null, commande.lignes.filter((l) => l.prixUnitaireHt > 0).map((l) => ({ defaultCode: l.defaultCode, quantite: l.quantite })));
    return {
      bonsHt,
      droitsJusquAu: ouverture?.fin ?? null,
      manqueDroitsHt: !ouverture && droits.statut !== "actif" ? Math.max(0, estimation.seuilDroitsHt - estimation.montantEligibleHt) : 0,
    };
  } catch (e) {
    if (estErreurConnecteur(e)) return null;
    throw e;
  }
}
