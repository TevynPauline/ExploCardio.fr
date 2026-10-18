import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import type { EvenementPaiement } from "@/connecteurs/stripe/interfaces";
import { dbSite } from "@/lib/db/site";
import { emailsCommandes } from "@/emails/modeles-commandes";
import type { CommandeSite } from "@generated/site/client";
import { ajouterEffet } from "../paiements";
import { confirmerCadeauRemis } from "../comptes/bienvenue";
import { alerterEquipe, emailDuCompte, envoyer, envoyerConfirmation } from "./notifications";
import { retirerDuPanier } from "./panier-commande";
import { libererReservation } from "./paiement";
import { adressesDe, lignesAchatPourOdoo, lignesDe } from "./tunnel";

// Effets des événements de paiement (F04, R4, R5) : chaque événement est traité une seule fois
// (F11) et chaque création dans Odoo est idempotente (clé = commande du site) : un paiement
// donne exactement une commande, même confirmé en retard, en double ou après fermeture de la
// page (FR-022). Si Odoo ne peut pas enregistrer, la commande du site passe « à enregistrer »
// et la file d'attente la rattrape, avec une alerte à l'équipe (FR-025).

export const SEUIL_ALERTE_ECHECS = 3;
export const ABANDON_APRES_MINUTES = 30;

const TERMINAUX = ["payee", "sans_objet", "en_attente_virement"];

async function terminerSiComplete(id: string) {
  const c = await dbSite().commandeSite.findUniqueOrThrow({ where: { id } });
  if (TERMINAUX.includes(c.etatAchat) && TERMINAUX.includes(c.etatAbonnement)) {
    await dbSite().commandeSite.update({ where: { id }, data: { etape: "terminee" } });
  }
}

async function journal(action: string, objet: string | null, detail: object) {
  await dbSite().journalAction.create({ data: { auteur: "gestionnaire des paiements", action, objet, detail: JSON.parse(JSON.stringify(detail)) } });
}

async function echec(c: CommandeSite, partie: "achat" | "abonnement", e: unknown) {
  const echecs = c.echecsEnregistrement + 1;
  await dbSite().commandeSite.update({
    where: { id: c.id },
    data: { [partie === "achat" ? "etatAchat" : "etatAbonnement"]: "a_enregistrer", echecsEnregistrement: echecs },
  });
  if (echecs === SEUIL_ALERTE_ECHECS) {
    await alerterEquipe(
      "Paiement reçu sans commande enregistrée",
      `La commande ${c.ref} a été payée (${partie}) mais n'a pas pu être enregistrée dans Odoo après ${echecs} essais : ${(e as Error).message}. Le site continue de réessayer.`,
      `paiement-sans-commande:${c.ref}:${partie}`,
    );
  }
}

/** Enregistre dans Odoo l'achat payé d'une commande du site (idempotent). */
export async function enregistrerAchat(commande: CommandeSite): Promise<boolean> {
  if (commande.odooCommandeRef && commande.etatAchat === "payee") return true;
  const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { id: commande.compteId }, include: { utilisateur: true } });
  const adresse = adressesDe(commande).livraison!;
  try {
    const lignes = await lignesAchatPourOdoo(commande);
    const { ref } = await registre.odoo().commandes.creerCommandePayee(
      {
        partenaireRef: compte.odooPartnerRef!,
        lignes,
        livraison: { adresse: [adresse.ligne1, adresse.ligne2].filter(Boolean).join(", "), codePostal: adresse.codePostal, ville: adresse.ville, mode: commande.modeLivraison ?? undefined },
        paiement: { mode: commande.moyenEffectif === "sepa" ? "sepa" : "carte", reference: commande.paiementRef ?? commande.ref },
        codePromo: commande.codePromo ?? undefined,
        bonsUtilisesHt: commande.bonsHt,
        reservationCle: commande.reservationRef ?? undefined,
      },
      `commande:${commande.ref}`,
    );
    const c = await dbSite().commandeSite.update({
      where: { id: commande.id },
      data: { etatAchat: "payee", odooCommandeRef: ref, reservationRef: null, echecsEnregistrement: 0 },
    });
    if (lignes.some((l) => l.offerte)) await confirmerCadeauRemis({ ...compte, email: compte.utilisateur.email }, ref);
    try {
      await registre.odoo().fidelite.appliquerRegles(ref);
    } catch (e) {
      if (!estErreurConnecteur(e)) throw e;
    }
    await envoyerConfirmation(c);
    await retirerDuPanier(c, "achat");
    await journal("commande.enregistree", ref, { commande: c.ref, paiement: c.paiementRef });
    await terminerSiComplete(c.id);
    return true;
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e;
    await echec(commande, "achat", e);
    return false;
  }
}

/** Crée les abonnements payés (un par équipement) et la facture du premier mois (idempotent). */
export async function enregistrerAbonnement(commande: CommandeSite, montantTtc: number, paiementRef: string | null): Promise<boolean> {
  if (commande.etatAbonnement === "payee") return true;
  const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { id: commande.compteId } });
  try {
    const refs: string[] = [];
    for (const l of lignesDe(commande).filter((x) => x.formule === "mise_a_disposition")) {
      for (let n = 1; n <= l.quantite; n++) {
        const { ref } = await registre.odoo().location.creerAbonnement(
          { partenaireRef: compte.odooPartnerRef!, objet: "mise_a_disposition", defaultCode: l.defaultCode, debut: new Date() },
          `${commande.ref}:abonnement:${l.defaultCode}:${n}`,
        );
        refs.push(ref);
      }
    }
    await registre.odoo().location.facturerEcheance(
      { abonnementRefs: refs, montantTtc, paiementRef, libelle: "Mise à disposition — premier mois" },
      `${commande.ref}:echeance:1`,
    );
    const c = await dbSite().commandeSite.update({ where: { id: commande.id }, data: { etatAbonnement: "payee", odooAbonnementRefs: refs, echecsEnregistrement: 0 } });
    const devis = await registre.odoo().commandes.calculerDevis({ partenaireRef: compte.odooPartnerRef, lignes: lignesDe(c).filter((x) => x.formule === "mise_a_disposition") });
    await envoyer(
      await emailDuCompte(c.compteId),
      await emailsCommandes.abonnement({ ref: c.ref, premierMoisTtc: devis.abonnement!.premierMoisTtc, moisSuivantsTtc: devis.abonnement!.moisSuivantsTtc }),
      "mise à disposition souscrite",
      `abonnement:${c.ref}`,
    );
    await retirerDuPanier(c, "mise_a_disposition");
    await journal("abonnement.enregistre", c.ref, { abonnements: refs });
    await terminerSiComplete(c.id);
    return true;
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e;
    await echec(commande, "abonnement", e);
    return false;
  }
}

async function commandeDe(evt: EvenementPaiement): Promise<{ commande: CommandeSite; partie: "achat" | "abonnement" } | null> {
  if (evt.abonnementRef) {
    const c = await dbSite().commandeSite.findUnique({ where: { ref: evt.abonnementRef } });
    return c ? { commande: c, partie: "abonnement" } : null;
  }
  if (evt.commandeRef) {
    const c = await dbSite().commandeSite.findUnique({ where: { ref: evt.commandeRef } });
    return c ? { commande: c, partie: "achat" } : null;
  }
  return null;
}

export async function surPaiementReussi(evt: EvenementPaiement) {
  const trouve = await commandeDe(evt);
  if (!trouve) return; // paiement d'un autre module
  if (trouve.partie === "abonnement") {
    await enregistrerAbonnement(trouve.commande, evt.montantTtc, evt.paiementRef);
    return;
  }
  const c = await dbSite().commandeSite.update({
    where: { id: trouve.commande.id },
    data: { paiementRef: evt.paiementRef, moyenEffectif: evt.moyen ?? "carte" },
  });
  await enregistrerAchat(c);
}

export async function surPaiementRefuse(evt: EvenementPaiement) {
  const trouve = await commandeDe(evt);
  if (!trouve) return;
  const { commande, partie } = trouve;
  const champ = partie === "achat" ? "etatAchat" : "etatAbonnement";
  if (commande[champ] !== "paiement_en_cours") return;
  await dbSite().commandeSite.update({
    where: { id: commande.id },
    data: { [champ]: "refusee", motifRefus: "Le paiement a été refusé par votre banque ou n'a pas été authentifié." },
  });
  if (partie === "achat") await libererReservation(commande);
}

export async function surEcheancePayee(evt: EvenementPaiement) {
  if (!evt.abonnementRef) return;
  const c =
    (await dbSite().commandeSite.findUnique({ where: { ref: evt.abonnementRef } })) ??
    (await dbSite().commandeSite.findFirst({ where: { odooAbonnementRefs: { has: evt.abonnementRef } } }));
  const refs = c?.odooAbonnementRefs.length ? c.odooAbonnementRefs : [evt.abonnementRef];
  await registre.odoo().location.facturerEcheance({ abonnementRefs: refs, montantTtc: evt.montantTtc, paiementRef: evt.paiementRef, libelle: "Mise à disposition — échéance mensuelle" }, `echeance:${evt.id}`);
  if (c) await envoyer(await emailDuCompte(c.compteId), await emailsCommandes.echeance({ montantTtc: evt.montantTtc }), "échéance payée", `echeance:${evt.id}`);
}

/** Remboursement fait directement dans Stripe : reporté dans Odoo (FR-031), une seule fois. */
export async function surRemboursement(evt: EvenementPaiement) {
  const c = evt.commandeRef ? await dbSite().commandeSite.findUnique({ where: { ref: evt.commandeRef } }) : null;
  const odooRef = c?.odooCommandeRef ?? evt.commandeRef;
  if (!odooRef) return;
  await registre.odoo().commandes.enregistrerRemboursement(
    { commandeRef: odooRef, montantTtc: evt.montantTtc, motif: "Remboursement par carte", source: "stripe", referenceStripe: evt.paiementRef },
    `stripe:${evt.id}`,
  );
  await journal("commande.remboursement", odooRef, { source: "stripe", montantTtc: evt.montantTtc });
}

let enregistres = false;

/** Enregistre les effets de F04 auprès du gestionnaire de paiements de F11 (une seule fois). */
export function enregistrerEffetsCommande() {
  if (enregistres) return;
  enregistres = true;
  ajouterEffet("paiement_reussi", surPaiementReussi);
  ajouterEffet("paiement_refuse", surPaiementRefuse);
  ajouterEffet("echeance_payee", surEcheancePayee);
  ajouterEffet("remboursement", surRemboursement);
}

/**
 * Rattrapage (file d'attente) : commandes payées non enregistrées rejouées ; tentatives de
 * paiement abandonnées depuis 30 minutes rendues (réservation libérée, commande à payer).
 */
export async function rattraperCommandes(maintenant = new Date()) {
  for (const c of await dbSite().commandeSite.findMany({ where: { etatAchat: "a_enregistrer" } })) await enregistrerAchat(c);
  const limite = new Date(maintenant.getTime() - ABANDON_APRES_MINUTES * 60_000);
  for (const c of await dbSite().commandeSite.findMany({ where: { etatAchat: "paiement_en_cours", modifieLe: { lt: limite } } })) {
    await libererReservation(c);
    await dbSite().commandeSite.update({ where: { id: c.id }, data: { etatAchat: "a_payer" } });
  }
}
