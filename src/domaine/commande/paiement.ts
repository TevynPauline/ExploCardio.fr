import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { dbSite } from "@/lib/db/site";
import type { CommandeSite } from "@generated/site/client";
import { confirmerCadeauRemis } from "../comptes/bienvenue";
import { envoyerConfirmation, ribDuSite } from "./notifications";
import { retirerDuPanier } from "./panier-commande";
import { SaisieInvalide, adressesDe, lignesAchatPourOdoo, lignesDe, verifierAvantPaiement } from "./tunnel";

// Lancement du paiement (F04, R4 à R6) : stock réservé dans Odoo avant de payer (cas limite
// « dernier exemplaire ») ; une seule session par tentative (FR-023 : jamais deux débits) ;
// virement pour l'achat (commande en attente) ; panier mixte : achat, puis abonnement (D1).

export type Lancement =
  | { type: "paiement"; url: string }
  | { type: "redirection"; url: string; message?: string };

const PAS_DE_REPRISE = ["payee", "en_attente_virement", "a_enregistrer", "sans_objet"];

function urls(ref: string) {
  const retour = `/commande/retour?ref=${encodeURIComponent(ref)}`;
  return { urlRetour: retour, urlAnnulation: retour };
}

async function client(commande: CommandeSite) {
  const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { id: commande.compteId }, include: { utilisateur: true } });
  return { compte, partenaireRef: compte.odooPartnerRef, email: compte.utilisateur.email };
}

/** Libère la réservation d'une tentative non aboutie (refus, abandon, erreur). */
export async function libererReservation(commande: CommandeSite) {
  if (!commande.reservationRef) return;
  try {
    await registre.odoo().stock.liberer(commande.reservationRef);
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e;
  }
  await dbSite().commandeSite.update({ where: { id: commande.id }, data: { reservationRef: null } });
}

const INDISPONIBLE = "Le service de paiement est momentanément indisponible. Rien n'a été débité et votre panier est conservé : réessayez dans quelques instants.";

export type ReservationAppareilSite = { defaultCode: string; n: number; cle: string };

export function reservationsDe(c: CommandeSite): ReservationAppareilSite[] {
  return Array.isArray(c.reservationsAppareils) ? (c.reservationsAppareils as ReservationAppareilSite[]) : [];
}

/** Libère les appareils réservés pour une tentative non aboutie (F05, R4). */
export async function libererAppareils(commande: CommandeSite) {
  for (const r of reservationsDe(commande)) {
    try {
      await registre.odoo().stock.libererAppareil(r.cle);
    } catch (e) {
      if (!estErreurConnecteur(e)) throw e;
    }
  }
  await dbSite().commandeSite.update({ where: { id: commande.id }, data: { reservationsAppareils: [] } });
}

/**
 * F05 (R4) : un appareil du parc réservé par location AVANT d'ouvrir le paiement. Si le dernier
 * appareil vient d'être pris, rien n'est débité : retour au choix de la date.
 */
async function reserverAppareils(commande: CommandeSite, tentative: number): Promise<{ ok: true; reservations: ReservationAppareilSite[] } | { ok: false; message: string }> {
  const dates = (commande.datesLivraisonMad ?? {}) as Record<string, string>;
  const reservations: ReservationAppareilSite[] = [];
  for (const l of lignesDe(commande).filter((x) => x.formule === "mise_a_disposition")) {
    for (let n = 1; n <= l.quantite; n++) {
      const cle = `${commande.ref}:${tentative}:${l.defaultCode}:${n}`;
      try {
        await registre.odoo().stock.reserverAppareil(l.defaultCode, new Date(`${dates[l.defaultCode]}T12:00:00Z`), cle);
        reservations.push({ defaultCode: l.defaultCode, n, cle });
      } catch (e) {
        for (const r of reservations) await registre.odoo().stock.libererAppareil(r.cle).catch(() => undefined);
        if (estErreurConnecteur(e) && (e as { code?: string }).code === "OUT_OF_STOCK") {
          return { ok: false, message: "Le dernier appareil disponible à cette date vient d'être réservé. Rien n'a été débité : choisissez la date de livraison suivante." };
        }
        if (estErreurConnecteur(e)) return { ok: false, message: INDISPONIBLE };
        throw e;
      }
    }
  }
  return { ok: true, reservations };
}

/** Session d'abonnement (premier mois + prélèvement mensuel), après l'achat d'un panier mixte. */
async function lancerAbonnement(commande: CommandeSite): Promise<Lancement> {
  const verification = await verifierAvantPaiement(commande);
  if (!verification.ok) return { type: "redirection", url: verification.redirection, message: verification.message };
  const { compte, email, partenaireRef: partenaireConnu } = await client(commande);
  let partenaireRef = partenaireConnu;
  // F05 (FR-009) : un compte pas encore validé peut louer en dépannage ; sa fiche client est
  // créée dans Odoo dès la commande pour enregistrer la location (expédition bloquée).
  if (!partenaireRef) {
    const { creerFicheClient } = await import("../comptes/validation");
    try {
      partenaireRef = await creerFicheClient(compte.id);
    } catch (e) {
      if (!estErreurConnecteur(e)) throw e;
      return { type: "redirection", url: "/commande/recapitulatif", message: INDISPONIBLE };
    }
  }
  const lignesMad = lignesDe(commande).filter((l) => l.formule === "mise_a_disposition");
  const devis = await registre.odoo().commandes.calculerDevis({ partenaireRef, lignes: lignesMad });
  const reprise = commande.etatAbonnement === "paiement_en_cours";
  const tentative = reprise ? commande.tentative : commande.tentative + 1;
  if (!reprise) {
    const r = await reserverAppareils(commande, tentative);
    if (!r.ok) return { type: "redirection", url: `/commande/livraison?ref=${commande.ref}`, message: r.message };
    commande = await dbSite().commandeSite.update({ where: { id: commande.id }, data: { reservationsAppareils: r.reservations } });
  }
  // Un élément de prélèvement par location, pour pouvoir arrêter l'une sans les autres (F05, R6).
  const elements = [];
  for (const l of lignesMad) {
    const unitaire = (await registre.odoo().commandes.calculerDevis({ partenaireRef, lignes: [{ ...l, quantite: 1 }] })).abonnement!;
    for (let n = 1; n <= l.quantite; n++) {
      elements.push({ element: `${l.defaultCode}:${n}`, premierMontantTtc: unitaire.premierMoisTtc, montantMensuelTtc: unitaire.moisSuivantsTtc });
    }
  }
  try {
    const session = await registre.stripe().ouvrirSessionAbonnement(
      {
        client: { partenaireRef: partenaireRef!, email },
        objet: "mise_a_disposition",
        abonnementRef: commande.ref,
        premierMontantTtc: devis.abonnement!.premierMoisTtc,
        montantMensuelTtc: devis.abonnement!.moisSuivantsTtc,
        elements,
        moyens: [commande.moyenAbonnement === "sepa" ? "sepa" : "carte"],
        ...urls(commande.ref),
      },
      `${commande.ref}:abonnement:${tentative}`,
    );
    await dbSite().commandeSite.update({
      where: { id: commande.id },
      data: { etatAbonnement: "paiement_en_cours", sessionAbonnement: session.sessionId, tentative },
    });
    return { type: "paiement", url: session.url };
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e;
    await libererAppareils(commande);
    return { type: "redirection", url: "/commande/recapitulatif", message: INDISPONIBLE };
  }
}

export async function lancerPaiement(commande: CommandeSite, cgvAcceptees: boolean, conditionsLocation = cgvAcceptees): Promise<Lancement> {
  if (!cgvAcceptees && !commande.cgvAccepteesLe) throw new SaisieInvalide({ cgv: "Acceptez les conditions générales de vente pour commander." });
  // F05 (FR-011) : conditions de location acceptées avec les CGV, pour toute mise à disposition.
  const avecLocation = lignesDe(commande).some((l) => l.formule === "mise_a_disposition");
  if (avecLocation && !conditionsLocation && !commande.conditionsLocationAccepteesLe) {
    throw new SaisieInvalide({ conditions: "Acceptez les conditions de location pour commander une mise à disposition." });
  }
  if (!commande.cgvAccepteesLe || (avecLocation && !commande.conditionsLocationAccepteesLe)) {
    commande = await dbSite().commandeSite.update({
      where: { id: commande.id },
      data: { cgvAccepteesLe: commande.cgvAccepteesLe ?? new Date(), ...(avecLocation ? { conditionsLocationAccepteesLe: commande.conditionsLocationAccepteesLe ?? new Date() } : {}) },
    });
  }

  // Achat déjà réglé (ou en attente de virement) : il reste l'abonnement d'un panier mixte.
  if (PAS_DE_REPRISE.includes(commande.etatAchat)) {
    if (["a_payer", "refusee", "paiement_en_cours"].includes(commande.etatAbonnement)) return lancerAbonnement(commande);
    return { type: "redirection", url: `/commande/confirmation/${commande.ref}` };
  }

  const verification = await verifierAvantPaiement(commande);
  if (!verification.ok) return { type: "redirection", url: verification.redirection, message: verification.message };
  const devis = verification.devis;
  const { partenaireRef, compte, email } = await client(commande);
  if (!partenaireRef) {
    return { type: "redirection", url: "/panier", message: "Votre fiche client est en cours de création : réessayez dans quelques minutes ou contactez-nous." };
  }

  // Même tentative tant que la session est ouverte : double clic ou rechargement → même session.
  const reprise = commande.etatAchat === "paiement_en_cours";
  const tentative = reprise ? commande.tentative : commande.tentative + 1;
  const cle = `${commande.ref}:${tentative}`;
  const lignes = await lignesAchatPourOdoo(commande);

  if (!reprise) {
    try {
      await registre.odoo().stock.reserver(lignes.map((l) => ({ defaultCode: l.defaultCode, quantite: l.quantite })), cle);
    } catch (e) {
      if (estErreurConnecteur(e) && (e as { code?: string }).code === "OUT_OF_STOCK") {
        return { type: "redirection", url: "/panier", message: "Un article de votre panier vient d'être épuisé : ajustez votre panier avant de payer." };
      }
      if (estErreurConnecteur(e)) return { type: "redirection", url: "/commande/recapitulatif", message: INDISPONIBLE };
      throw e;
    }
    commande = await dbSite().commandeSite.update({
      where: { id: commande.id },
      data: { reservationRef: cle, tentative, devis: JSON.parse(JSON.stringify(devis)), motifRefus: null },
    });
  }

  if (commande.moyenPaiement === "virement") {
    const adresse = adressesDe(commande).livraison!;
    try {
      const r = await registre.odoo().commandes.creerCommandeVirement(
        {
          partenaireRef,
          lignes,
          livraison: { adresse: [adresse.ligne1, adresse.ligne2].filter(Boolean).join(", "), codePostal: adresse.codePostal, ville: adresse.ville, mode: commande.modeLivraison ?? undefined },
          paiement: { mode: "virement", reference: commande.ref },
          codePromo: commande.codePromo ?? undefined,
          bonsUtilisesHt: devis.achat?.bonsHt ?? 0,
          reservationCle: cle,
        },
        `commande:${commande.ref}`,
      );
      commande = await dbSite().commandeSite.update({
        where: { id: commande.id },
        data: { etatAchat: "en_attente_virement", odooCommandeRef: r.ref, echeanceVirement: r.echeance, reservationRef: null, moyenEffectif: "virement" },
      });
    } catch (e) {
      if (!estErreurConnecteur(e)) throw e;
      await libererReservation(commande);
      return { type: "redirection", url: "/commande/recapitulatif", message: INDISPONIBLE };
    }
    if (lignes.some((l) => l.offerte)) await confirmerCadeauRemis({ ...compte, email }, commande.odooCommandeRef!);
    await envoyerConfirmation(commande, { virement: { rib: await ribDuSite(), echeance: commande.echeanceVirement! } });
    await retirerDuPanier(commande, "achat");
    await dbSite().journalAction.create({
      data: { auteur: "client", action: "commande.virement", objet: commande.odooCommandeRef, detail: { commande: commande.ref } },
    });
    if (commande.etatAbonnement !== "sans_objet") return lancerAbonnement(commande);
    await dbSite().commandeSite.update({ where: { id: commande.id }, data: { etape: "terminee" } });
    return { type: "redirection", url: `/commande/confirmation/${commande.ref}` };
  }

  try {
    const session = await registre.stripe().ouvrirSessionPaiement(
      {
        commandeRef: commande.ref,
        montantTtc: devis.achat!.totalTtc,
        moyens: ["carte"],
        client: { partenaireRef, email },
        ...urls(commande.ref),
      },
      `${commande.ref}:achat:${tentative}`,
    );
    await dbSite().commandeSite.update({ where: { id: commande.id }, data: { etatAchat: "paiement_en_cours", sessionAchat: session.sessionId } });
    return { type: "paiement", url: session.url };
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e;
    await libererReservation(commande);
    await dbSite().commandeSite.update({ where: { id: commande.id }, data: { etatAchat: "a_payer" } });
    return { type: "redirection", url: "/commande/recapitulatif", message: INDISPONIBLE };
  }
}
