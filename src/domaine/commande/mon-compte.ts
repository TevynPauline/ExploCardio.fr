import { registre } from "@/connecteurs/registre";
import type { Commande, Location, ResumeCommande, ResumeFacture, StatutCommande } from "@/connecteurs/odoo/interfaces";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { dbSite } from "@/lib/db/site";

// « Mon compte » : commandes, factures et avoirs lus dans Odoo (F04, US7), réservés au titulaire.

export const LIBELLES_STATUT: Record<StatutCommande, string> = {
  en_attente_paiement: "En attente de paiement",
  payee: "Payée",
  en_preparation: "En préparation",
  expediee: "Expédiée",
  livree: "Livrée",
  annulee: "Annulée",
  remboursee_partiellement: "Remboursée en partie",
  remboursee: "Remboursée",
};

async function partenaire(compteId: string) {
  return (await dbSite().compteClient.findUnique({ where: { id: compteId }, select: { odooPartnerRef: true } }))?.odooPartnerRef ?? null;
}

export async function commandesDuCompte(compteId: string): Promise<{ commandes: ResumeCommande[]; indisponible: boolean }> {
  const ref = await partenaire(compteId);
  if (!ref) return { commandes: [], indisponible: false };
  try {
    return { commandes: await registre.odoo().commandes.listerCommandes(ref), indisponible: false };
  } catch (e) {
    if (estErreurConnecteur(e)) return { commandes: [], indisponible: true };
    throw e;
  }
}

/** Commande d'Odoo, seulement si elle appartient au compte. */
export async function commandeDetaillee(compteId: string, ref: string): Promise<Commande | null> {
  const p = await partenaire(compteId);
  if (!p) return null;
  try {
    const c = await registre.odoo().commandes.lireCommande(ref);
    return c.partenaireRef === p ? c : null;
  } catch (e) {
    if (estErreurConnecteur(e)) return null;
    throw e;
  }
}

export async function facturesDuCompte(compteId: string): Promise<{ factures: ResumeFacture[]; indisponible: boolean }> {
  const ref = await partenaire(compteId);
  if (!ref) return { factures: [], indisponible: false };
  try {
    return { factures: await registre.odoo().factures.listerFactures(ref), indisponible: false };
  } catch (e) {
    if (estErreurConnecteur(e)) return { factures: [], indisponible: true };
    throw e;
  }
}

/** PDF d'une facture ou d'un avoir, seulement pour son titulaire. */
export async function pdfDuCompte(compteId: string, numero: string): Promise<Uint8Array | null> {
  const { factures } = await facturesDuCompte(compteId);
  if (!factures.some((f) => f.numero === numero)) return null;
  return registre.odoo().factures.obtenirPdf(numero);
}

/** Abonnements d'une commande du site restés à régler (panier mixte, US5-4). */
export async function abonnementsARegler(compteId: string) {
  return dbSite().commandeSite.findMany({
    where: { compteId, etatAchat: { in: ["payee", "en_attente_virement", "a_enregistrer"] }, etatAbonnement: { in: ["a_payer", "refusee"] } },
    orderBy: { creeLe: "desc" },
  });
}

export const LIBELLES_LOCATION: Record<Location["etat"], string> = {
  en_cours: "En cours",
  resiliation_prevue: "Résiliation prévue",
  termine: "Terminée",
  en_retard_retour: "Retour du matériel attendu",
};

/** Mises à disposition souscrites (F04, US5), lues dans Odoo ; complétées par F05. */
export async function locationsDuCompte(compteId: string): Promise<{ locations: Location[]; indisponible: boolean }> {
  const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId } });
  if (!compte.odooPartnerRef) return { locations: [], indisponible: false };
  try {
    const toutes = await registre.odoo().location.listerLocations(compte.odooPartnerRef);
    return { locations: toutes.filter((l) => l.objet === "mise_a_disposition"), indisponible: false };
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e;
    return { locations: [], indisponible: true };
  }
}
