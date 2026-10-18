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

/** Session d'abonnement (premier mois + prélèvement mensuel), après l'achat d'un panier mixte. */
async function lancerAbonnement(commande: CommandeSite): Promise<Lancement> {
  const verification = await verifierAvantPaiement(commande);
  if (!verification.ok) return { type: "redirection", url: verification.redirection, message: verification.message };
  const { partenaireRef, email } = await client(commande);
  const devis = await registre.odoo().commandes.calculerDevis({
    partenaireRef,
    lignes: lignesDe(commande).filter((l) => l.formule === "mise_a_disposition"),
  });
  const reprise = commande.etatAbonnement === "paiement_en_cours";
  const tentative = reprise ? commande.tentative : commande.tentative + 1;
  try {
    const session = await registre.stripe().ouvrirSessionAbonnement(
      {
        client: { partenaireRef: partenaireRef!, email },
        objet: "mise_a_disposition",
        abonnementRef: commande.ref,
        premierMontantTtc: devis.abonnement!.premierMoisTtc,
        montantMensuelTtc: devis.abonnement!.moisSuivantsTtc,
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
    return { type: "redirection", url: "/commande/recapitulatif", message: INDISPONIBLE };
  }
}

export async function lancerPaiement(commande: CommandeSite, cgvAcceptees: boolean): Promise<Lancement> {
  if (!cgvAcceptees && !commande.cgvAccepteesLe) throw new SaisieInvalide({ cgv: "Acceptez les conditions générales de vente pour commander." });
  if (!commande.cgvAccepteesLe) commande = await dbSite().commandeSite.update({ where: { id: commande.id }, data: { cgvAccepteesLe: new Date() } });

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
