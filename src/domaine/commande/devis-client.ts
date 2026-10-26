import { randomUUID } from "node:crypto";
import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur, NotFound } from "@/connecteurs/erreurs";
import type { DevisEnregistre, ResumeDevisEnregistre } from "@/connecteurs/odoo/interfaces";
import { dbSite } from "@/lib/db/site";
import { emailsCommandes } from "@/emails/modeles-commandes";
import { codePostalMetropole } from "../comptes/adresses";
import { panierPour } from "../catalogue/panier";
import { alerterEquipe, envoyer } from "./notifications";
import { panierDetaille } from "./devis";
import { adresseDuCompte } from "./tunnel";

// Devis depuis le panier (F16, US6, FR-018 à FR-022). Le devis est un document d'Odoo (base
// fictive en phase 1) : le site le demande, le liste et le fait commander, sans le dupliquer.
// Frais de livraison calculés pour l'adresse de livraison par défaut et le mode standard.

export type ResultatDevis =
  | { ok: true; ref: string }
  | { ok: false; motif: "compte" | "panier_vide" | "indisponible" | "adresse" | "hors_metropole" | "odoo"; message: string };

export const MESSAGES_DEVIS = {
  compte: "Votre compte ne permet pas encore de demander un devis. Contactez-nous si besoin.",
  panier_vide: "Votre panier est vide.",
  indisponible: "Un article de votre panier n'est pas disponible : retirez-le avant de demander un devis.",
  adresse: "Indiquez d'abord l'adresse de votre cabinet dans votre compte, pour calculer les frais de livraison.",
  hors_metropole:
    "ExploCardio.fr livre uniquement en France métropolitaine (Corse comprise). Pour une livraison ailleurs, contactez-nous : nous étudierons votre demande.",
  odoo: "Le devis n'a pas pu être créé pour le moment. Votre panier est conservé : réessayez dans quelques minutes ou contactez-nous.",
} as const;

const refus = (motif: Exclude<ResultatDevis, { ok: true }>["motif"]): ResultatDevis => ({ ok: false, motif, message: MESSAGES_DEVIS[motif] });

export async function demanderDevis(compteId: string): Promise<ResultatDevis> {
  const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId }, include: { adresses: true, utilisateur: true } });
  if (compte.statut !== "valide" || !compte.odooPartnerRef) return refus("compte");
  const panier = await panierPour({ compteId }, false);
  if (!panier) return refus("panier_vide");
  const detail = await panierDetaille(panier.id, compteId);
  if (!detail.lignes.length) return refus("panier_vide");
  if (detail.indisponible) return refus("odoo");
  if (detail.lignes.some((l) => l.indisponible)) return refus("indisponible");
  const adresse = adresseDuCompte(compte, "livraison") ?? adresseDuCompte(compte, "cabinet");
  if (!adresse) return refus("adresse");
  if (!codePostalMetropole(adresse.codePostal)) return refus("hors_metropole");

  let devis: DevisEnregistre;
  try {
    devis = await registre.odoo().commandes.creerDevis(
      {
        partenaireRef: compte.odooPartnerRef,
        lignes: detail.lignes.map((l) => ({ defaultCode: l.defaultCode, formule: l.formule, quantite: l.quantite })),
        codePromo: panier.codePromo,
        modeLivraison: null,
        livraison: { adresse: [adresse.ligne1, adresse.ligne2].filter(Boolean).join(", "), codePostal: adresse.codePostal, ville: adresse.ville },
      },
      `devis:${panier.id}:${randomUUID()}`,
    );
  } catch (e) {
    if (estErreurConnecteur(e)) return refus("odoo");
    throw e;
  }

  // Le devis existe dans Odoo : un échec d'envoi ne le remet pas en cause (F10 réessaie).
  try {
    await envoyer(
      compte.utilisateur.email,
      await emailsCommandes.devisEnvoye({
        ref: devis.ref,
        lignes: devis.calcul.lignes.map((l) => ({ libelle: l.libelle, quantite: l.quantite, totalHt: l.totalHt })),
        totalHt: devis.totalHt,
        totalTtc: devis.totalTtc,
        validiteLe: devis.validiteLe,
      }),
      "devis demandé",
      `devis-envoye:${devis.ref}`,
    );
    await alerterEquipe(
      `Nouveau devis ${devis.ref}`,
      `${compte.utilisateur.email} a demandé le devis ${devis.ref} depuis son panier : ${(devis.totalHt / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} HT, valable jusqu'au ${devis.validiteLe.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}. Le devis est dans Odoo.`,
      `devis-equipe:${devis.ref}`,
    );
  } catch (e) {
    console.error("[devis] email ou notification non transmis", (e as Error).message);
  }
  return { ok: true, ref: devis.ref };
}

export async function devisDuCompte(compteId: string): Promise<ResumeDevisEnregistre[] | null> {
  const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId } });
  if (!compte.odooPartnerRef) return [];
  try {
    return await registre.odoo().commandes.listerDevis(compte.odooPartnerRef);
  } catch (e) {
    if (estErreurConnecteur(e)) return null;
    throw e;
  }
}

/** PDF d'un devis du compte ; null si le devis n'est pas le sien (ou n'existe pas). */
export async function pdfDevis(compteId: string, ref: string): Promise<Uint8Array | null> {
  const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId } });
  if (!compte.odooPartnerRef) return null;
  try {
    return await registre.odoo().commandes.lireDevisPdf(compte.odooPartnerRef, ref);
  } catch (e) {
    if (e instanceof NotFound) return null;
    throw e;
  }
}

export const REFUS_COMMANDE_DEVIS = {
  compte: MESSAGES_DEVIS.compte,
  introuvable: "Ce devis est introuvable.",
  deja_commande: "Ce devis a déjà été commandé.",
  odoo: "Vos devis sont momentanément indisponibles. Réessayez dans quelques minutes.",
} as const;

export type ResultatCommanderDevis = { ok: true; expire: boolean } | { ok: false; code: keyof typeof REFUS_COMMANDE_DEVIS };

/**
 * « Commander » un devis (FR-020, FR-021) : le panier est recomposé avec les lignes du devis.
 * Devis valable : ses prix s'appliquent jusqu'au paiement, qui le confirme dans Odoo.
 * Devis expiré : panier aux prix du jour, avec un message.
 */
export async function commanderDevis(compteId: string, ref: string): Promise<ResultatCommanderDevis> {
  const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId } });
  if (compte.statut !== "valide" || !compte.odooPartnerRef) return { ok: false, code: "compte" };
  let devis: DevisEnregistre;
  try {
    devis = await registre.odoo().commandes.lireDevis(compte.odooPartnerRef, ref);
  } catch (e) {
    if (e instanceof NotFound) return { ok: false, code: "introuvable" };
    if (estErreurConnecteur(e)) return { ok: false, code: "odoo" };
    throw e;
  }
  if (devis.etat === "commande") return { ok: false, code: "deja_commande" };
  const expire = devis.etat === "expire";
  const panier = (await panierPour({ compteId }, true))!;
  await dbSite().$transaction([
    dbSite().lignePanier.deleteMany({ where: { panierId: panier.id } }),
    dbSite().lignePanier.createMany({
      data: devis.demande.map((l) => ({
        panierId: panier.id,
        defaultCode: l.defaultCode,
        formule: l.formule,
        quantite: l.quantite,
        prixHtConstate: devis.calcul.lignes.find((c) => c.defaultCode === l.defaultCode && c.formule === l.formule)?.prixUnitaireHt ?? 0,
      })),
    }),
    // Les remises du devis sont dans ses prix : pas de code promo en plus.
    dbSite().panier.update({ where: { id: panier.id }, data: { devisRef: expire ? null : devis.ref, codePromo: null, modifieLe: new Date() } }),
  ]);
  return { ok: true, expire };
}
