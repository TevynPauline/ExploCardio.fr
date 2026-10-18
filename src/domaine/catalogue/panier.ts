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

// --- Édition du panier et fusion à la connexion (F04, US1) ---------------------------------

/** Ligne appartenant au panier de l'identité, sinon null (on ne touche jamais au panier d'un autre). */
async function ligneDe(identite: IdentitePanier, ligneId: string) {
  const panier = await panierPour(identite, false);
  if (!panier) return null;
  return dbSite().lignePanier.findFirst({ where: { id: ligneId, panierId: panier.id } });
}

export async function modifierLigne(identite: IdentitePanier, ligneId: string, quantite: number): Promise<boolean> {
  if (!Number.isInteger(quantite) || quantite < 1 || quantite > QUANTITE_MAX) return false;
  const ligne = await ligneDe(identite, ligneId);
  if (!ligne) return false;
  await dbSite().lignePanier.update({ where: { id: ligne.id }, data: { quantite } });
  await dbSite().panier.update({ where: { id: ligne.panierId }, data: { modifieLe: new Date() } });
  return true;
}

export async function supprimerLigne(identite: IdentitePanier, ligneId: string): Promise<boolean> {
  const ligne = await ligneDe(identite, ligneId);
  if (!ligne) return false;
  await dbSite().lignePanier.delete({ where: { id: ligne.id } });
  await dbSite().panier.update({ where: { id: ligne.panierId }, data: { modifieLe: new Date() } });
  return true;
}

/** Enregistre le code promo (sa validité est donnée par le devis d'Odoo) ; vide = retiré. */
export async function appliquerCodePromo(identite: IdentitePanier, code: string): Promise<void> {
  const panier = await panierPour(identite, false);
  if (!panier) return;
  const propre = code.trim().toUpperCase().slice(0, 40);
  await dbSite().panier.update({ where: { id: panier.id }, data: { codePromo: propre || null } });
}

export async function utiliserBons(identite: IdentitePanier, utiliser: boolean): Promise<void> {
  const panier = await panierPour(identite, false);
  if (panier) await dbSite().panier.update({ where: { id: panier.id }, data: { utiliserBons: utiliser } });
}

/**
 * À la connexion (FR-005) : le panier du visiteur est versé dans celui du compte (quantités
 * additionnées par référence et formule, plafonnées), puis supprimé. Sans effet s'il est vide.
 */
export async function fusionnerPaniers(jeton: string | null | undefined, compteId: string): Promise<void> {
  if (!jeton) return;
  const visiteur = await panierPour({ jeton }, false);
  if (!visiteur) return;
  const lignes = await lignesPanier(visiteur.id);
  if (lignes.length) {
    const compte = await panierPour({ compteId }, true);
    await dbSite().$transaction(async (tx) => {
      for (const l of lignes) {
        const existante = await tx.lignePanier.findUnique({
          where: { panierId_defaultCode_formule: { panierId: compte!.id, defaultCode: l.defaultCode, formule: l.formule } },
        });
        if (existante) {
          await tx.lignePanier.update({ where: { id: existante.id }, data: { quantite: Math.min(QUANTITE_MAX, existante.quantite + l.quantite) } });
        } else {
          await tx.lignePanier.create({
            data: { panierId: compte!.id, defaultCode: l.defaultCode, formule: l.formule, quantite: l.quantite, prixHtConstate: l.prixHtConstate },
          });
        }
      }
      if (!compte!.codePromo && visiteur.codePromo) await tx.panier.update({ where: { id: compte!.id }, data: { codePromo: visiteur.codePromo } });
    });
  }
  await dbSite().panier.delete({ where: { id: visiteur.id } });
}
