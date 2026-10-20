import { registre } from "@/connecteurs/registre";
import { dbSite } from "@/lib/db/site";

// Abonnement aux logiciels Cloud (F12, D3) : souscrit par le panier et le tunnel de F04, comme
// une mise à disposition sans appareil. Dans Odoo, l'offre mensuelle d'un logiciel est son
// abonnement (aucun appareil, ni date de livraison, ni kit). Pour poursuivre après une période
// incluse, l'abonnement prend effet à la fin de la période et rien n'est prélevé avant.

const cache = new Map<string, boolean>();

/** Vrai si la référence est un logiciel Cloud (type d'article dans Odoo). */
export async function estLogicielCloud(defaultCode: string): Promise<boolean> {
  const connu = cache.get(defaultCode);
  if (connu !== undefined) return connu;
  const article = await registre.odoo().catalogue.lireArticle(defaultCode).catch(() => null);
  const logiciel = article?.type === "logiciel";
  if (article) cache.set(defaultCode, logiciel);
  return logiciel;
}

/** Références des lignes « mensuelles » qui sont des logiciels Cloud. */
export async function logicielsDes(lignes: { defaultCode: string; formule: string }[]): Promise<Set<string>> {
  const resultat = new Set<string>();
  for (const l of lignes) if (l.formule === "mise_a_disposition" && (await estLogicielCloud(l.defaultCode))) resultat.add(l.defaultCode);
  return resultat;
}

/** Prise d'effet de l'abonnement : fin de la période incluse en cours pour ce logiciel, sinon null. */
export async function priseEffetPour(compteId: string | null | undefined, logiciel: string, maintenant = new Date()): Promise<Date | null> {
  if (!compteId) return null;
  const acces = await dbSite().accesLogiciel.findFirst({
    where: { compteId, logiciel, origine: "periode_incluse", etat: "actif", finPrevue: { gt: maintenant } },
    orderBy: { finPrevue: "desc" },
  });
  return acces?.finPrevue ?? null;
}

/** Lignes de devis complétées de la prise d'effet des abonnements logiciels différés. */
export async function avecPrisesEffet<T extends { defaultCode: string; formule: string }>(compteId: string | null | undefined, lignes: T[]): Promise<(T & { priseEffet?: Date })[]> {
  const logiciels = await logicielsDes(lignes);
  const resultat: (T & { priseEffet?: Date })[] = [];
  for (const l of lignes) {
    const priseEffet = logiciels.has(l.defaultCode) ? await priseEffetPour(compteId, l.defaultCode) : null;
    resultat.push(priseEffet ? { ...l, priseEffet } : l);
  }
  return resultat;
}

/** Abonnements logiciels du compte (Odoo), pour « Mes logiciels Cloud ». */
export async function abonnementsLogicielsDuCompte(compteId: string) {
  const compte = await dbSite().compteClient.findUnique({ where: { id: compteId } });
  if (!compte?.odooPartnerRef) return [];
  const locations = await registre.odoo().location.listerLocations(compte.odooPartnerRef);
  return locations.filter((l) => l.objet === "logiciel");
}

export class AbonnementRefuse extends Error {}

/**
 * Résiliation d'un abonnement logiciel par le client (FR-030) : fin au terme du mois payé,
 * prélèvements arrêtés à cette date, puis délai de grâce et fermeture de l'accès.
 */
export async function resilierAbonnementLogiciel(compteId: string, ref: string, maintenant = new Date()) {
  const abonnement = (await abonnementsLogicielsDuCompte(compteId)).find((a) => a.ref === ref);
  if (!abonnement || !["en_cours", "suspendue_impaye"].includes(abonnement.etat)) throw new AbonnementRefuse("Cet abonnement ne peut pas être résilié.");
  const { fin } = await registre.odoo().location.resilier(ref, maintenant);
  const { commandeDeLocation } = await import("../location/suivi");
  const lien = await commandeDeLocation(ref);
  if (lien?.element) await registre.stripe().retirerElementAbonnement(lien.commande.ref, lien.element, fin, `resiliation:${ref}:${fin.toISOString().slice(0, 10)}`);
  const { programmerFin } = await import("./acces");
  await programmerFin(ref, fin, { id: null, libelle: `client (${compteId})` });
  await dbSite().journalAction.create({ data: { auteur: `client (${compteId})`, action: "cloud.abonnement_resilie", objet: ref, detail: { fin } } });
  return { fin };
}
