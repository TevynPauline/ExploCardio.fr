import { Prisma } from "@generated/site/client";
import { dbSite } from "@/lib/db/site";
import type { EvenementPaiement, TypeEvenementPaiement } from "@/connecteurs/stripe/interfaces";

// Traitement des événements de paiement (T076, contracts/stripe.md) : chaque événement est
// traité UNE SEULE FOIS, même s'il arrive en retard ou plusieurs fois, et produit les mêmes
// effets quel que soit le mode du connecteur Stripe.
// Les effets métier sont ajoutés par les modules qui en ont besoin (F04 : commande et panier ;
// F05 : échéances et impayés ; F12 : accès Cloud). F11 fournit le cadre et la traçabilité.

export type EffetPaiement = (evt: EvenementPaiement) => Promise<void>;

const effets: Partial<Record<TypeEvenementPaiement, EffetPaiement[]>> = {};

export function ajouterEffet(type: TypeEvenementPaiement, effet: EffetPaiement) {
  (effets[type] ??= []).push(effet);
}

export type ResultatTraitement = { traite: boolean; deja: boolean };

export async function traiterEvenementPaiement(evt: EvenementPaiement): Promise<ResultatTraitement> {
  // 1. Réserver l'événement : la clé primaire empêche un second traitement.
  try {
    await dbSite().evenementPaiementTraite.create({ data: { id: evt.id, type: evt.type } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { traite: false, deja: true };
    }
    throw e;
  }
  // 2. Appliquer les effets ; en cas d'échec, libérer l'événement pour qu'il soit rejoué.
  try {
    for (const effet of effets[evt.type] ?? []) await effet(evt);
    await dbSite().journalAction.create({
      data: {
        auteur: "gestionnaire des paiements",
        action: `paiement.${evt.type}`,
        objet: evt.commandeRef ?? evt.abonnementRef ?? evt.paiementRef ?? evt.sessionId,
        detail: { evenement: evt.id, montantTtc: evt.montantTtc, moyen: evt.moyen, carte: evt.carte },
      },
    });
  } catch (e) {
    await dbSite().evenementPaiementTraite.delete({ where: { id: evt.id } });
    throw e;
  }
  return { traite: true, deja: false };
}
