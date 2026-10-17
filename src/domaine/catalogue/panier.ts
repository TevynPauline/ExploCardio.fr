import { createHash } from "node:crypto";
import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { dbSite } from "@/lib/db/site";
import type { FormulePanier, LignePanier, Panier } from "@generated/site/client";

// Panier minimal (F03, D1, R6) : F03 enregistre les lignes ; F04 livrera la modification, la
// fusion à la connexion et la commande. Le prix et la disponibilité sont relus dans Odoo au
// moment de l'ajout (prix en vigueur) ; le panier ne garde le prix constaté que pour signaler
// un changement, jamais comme prix de référence.

/** Visiteur (jeton du cookie du panier) ou client connecté. */
export type IdentitePanier = { jeton?: string | null; compteId?: string | null };

export type LigneAAjouter = {
  defaultCode: string;
  formule: FormulePanier;
  quantite: number;
  /** Prix HT affiché au visiteur, pour l'avertir s'il a changé. */
  prixAffiche?: number;
};

export type ResultatAjout =
  | { ok: true; prixHt: number; prixAChange: boolean; delaiJours: number | null }
  | { ok: false; motif: "quantite" | "introuvable" | "formule" | "indisponible" | "service" | "identite"; message: string };

export const QUANTITE_MAX = 999;
/** Cookie du panier d'un visiteur : nécessaire au service, déclaré dans la page Cookies. */
export const COOKIE_PANIER = "ec_panier";
export const PURGE_APRES_JOURS = 30;

export function empreinteJeton(jeton: string): string {
  return createHash("sha256").update(`panier:${jeton}`).digest("base64url");
}

/** Panier de l'identité ; créé si `creer` est vrai. */
export async function panierPour(identite: IdentitePanier, creer: boolean): Promise<Panier | null> {
  const db = dbSite();
  if (identite.compteId) {
    const existant = await db.panier.findUnique({ where: { compteId: identite.compteId } });
    if (existant || !creer) return existant;
    return db.panier.upsert({ where: { compteId: identite.compteId }, create: { compteId: identite.compteId }, update: {} });
  }
  if (!identite.jeton) return null;
  const jetonEmpreinte = empreinteJeton(identite.jeton);
  const existant = await db.panier.findUnique({ where: { jetonEmpreinte } });
  if (existant || !creer) return existant;
  return db.panier.upsert({ where: { jetonEmpreinte }, create: { jetonEmpreinte }, update: {} });
}

const MESSAGES = {
  quantite: `Indiquez une quantité entre 1 et ${QUANTITE_MAX}.`,
  introuvable: "Ce produit n'est plus proposé.",
  formule: "Cette formule n'est pas proposée pour ce produit.",
  indisponible: "Ce produit est indisponible pour le moment. Contactez-nous : nous vous proposerons une solution.",
  service: "Nous ne pouvons pas vérifier le prix et la disponibilité pour le moment. Réessayez dans quelques instants.",
  identite: "Votre panier n'a pas pu être retrouvé. Rechargez la page et réessayez.",
} as const;

function refus(motif: keyof typeof MESSAGES): ResultatAjout {
  return { ok: false, motif, message: MESSAGES[motif] };
}

/** Prix HT applicable : prix du client connecté (liste de prix d'Odoo) ou prix public. */
async function prixApplicable(compteId: string | null | undefined, defaultCode: string, prixPublic: number): Promise<number> {
  if (!compteId) return prixPublic;
  const compte = await dbSite().compteClient.findUnique({ where: { id: compteId }, select: { odooPartnerRef: true } });
  if (!compte?.odooPartnerRef) return prixPublic;
  const [prix] = await registre.odoo().catalogue.lirePrixClient(compte.odooPartnerRef, [defaultCode]);
  return prix?.prixHt ?? prixPublic;
}

export async function ajouterAuPanier(identite: IdentitePanier, ligne: LigneAAjouter): Promise<ResultatAjout> {
  if (!Number.isInteger(ligne.quantite) || ligne.quantite < 1 || ligne.quantite > QUANTITE_MAX) return refus("quantite");
  if (!identite.compteId && !identite.jeton) return refus("identite");
  let prixHt: number;
  let delaiJours: number | null = null;
  try {
    const odoo = registre.odoo();
    const article = await odoo.catalogue.lireArticle(ligne.defaultCode);
    const variante = article.variantes.find((v) => v.defaultCode === ligne.defaultCode);
    if (!variante) return refus("introuvable");
    if (ligne.formule === "achat" && !article.formules.includes("achat")) return refus("formule");
    if (ligne.formule === "mise_a_disposition" && (!article.formules.includes("mise_a_disposition") || !variante.offreMiseADisposition)) {
      return refus("formule");
    }
    const [dispo] = await odoo.stock.lireDisponibilite([ligne.defaultCode]);
    const etat = ligne.formule === "achat" ? dispo?.achat : dispo?.miseADisposition;
    if (!etat || etat.etat === "indisponible") return refus("indisponible");
    if (etat.etat === "delai") delaiJours = etat.delaiJours;
    prixHt =
      ligne.formule === "achat"
        ? await prixApplicable(identite.compteId, ligne.defaultCode, variante.prixHt)
        : variante.offreMiseADisposition!.premierMoisHt;
  } catch (e) {
    if (estErreurConnecteur(e)) return (e as { code?: string }).code === "NOT_FOUND" ? refus("introuvable") : refus("service");
    throw e;
  }
  const panier = await panierPour(identite, true);
  if (!panier) return refus("identite");
  await dbSite().lignePanier.upsert({
    where: { panierId_defaultCode_formule: { panierId: panier.id, defaultCode: ligne.defaultCode, formule: ligne.formule } },
    create: { panierId: panier.id, defaultCode: ligne.defaultCode, formule: ligne.formule, quantite: ligne.quantite, prixHtConstate: prixHt },
    update: { quantite: { increment: ligne.quantite }, prixHtConstate: prixHt },
  });
  await dbSite().panier.update({ where: { id: panier.id }, data: { modifieLe: new Date() } });
  return { ok: true, prixHt, prixAChange: ligne.prixAffiche !== undefined && ligne.prixAffiche !== prixHt, delaiJours };
}

export async function lignesPanier(panierId: string): Promise<LignePanier[]> {
  return dbSite().lignePanier.findMany({ where: { panierId }, orderBy: { ajouteLe: "asc" } });
}

/** Tâche quotidienne : paniers de visiteurs inactifs depuis 30 jours (les lignes suivent). */
export async function purgerPaniersAnonymes(maintenant = new Date()): Promise<number> {
  const limite = new Date(maintenant.getTime() - PURGE_APRES_JOURS * 24 * 3600_000);
  const { count } = await dbSite().panier.deleteMany({ where: { compteId: null, modifieLe: { lt: limite } } });
  return count;
}
