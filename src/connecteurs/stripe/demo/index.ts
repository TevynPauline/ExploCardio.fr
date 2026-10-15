import { randomUUID } from "node:crypto";
import { dbDemo } from "@/lib/db/demo";
import { InvalidSignature, NotFound } from "../../erreurs";
import { PREFIXE_REFERENCE_FICTIVE } from "../../garde-donnees-fictives";
import type { ConnecteurStripe, EvenementPaiement, SessionAbonnement, SessionPaiement } from "../interfaces";
import { signatureValide } from "./signature";

// Connecteur Stripe de démonstration (FR-028, contracts/stripe.md) : la « page de paiement »
// est la page de démonstration du site (/demo/paiement). Elle émet les mêmes événements que
// Stripe vers le même gestionnaire. Aucune donnée de carte n'est jamais saisie ni stockée.

export const CHEMIN_PAGE_PAIEMENT_DEMO = "/demo/paiement";

const db = () => dbDemo();

function nouvelId(prefixe: string): string {
  return `${PREFIXE_REFERENCE_FICTIVE}${prefixe}-${randomUUID()}`;
}

export function creerStripeDemo(): ConnecteurStripe {
  return {
    async ouvrirSessionPaiement(s: SessionPaiement, cle: string) {
      const deja = await db().sessionPaiementDemo.findUnique({ where: { cle } });
      const session =
        deja ??
        (await db().sessionPaiementDemo.create({
          data: {
            id: nouvelId("cs"),
            cle,
            nature: "paiement",
            commandeRef: s.commandeRef,
            partenaireRef: s.client.partenaireRef,
            montantTtcCentimes: s.montantTtc,
            moyens: s.moyens,
            urlRetour: s.urlRetour,
            urlAnnulation: s.urlAnnulation,
          },
        }));
      return { sessionId: session.id, url: `${CHEMIN_PAGE_PAIEMENT_DEMO}?session=${encodeURIComponent(session.id)}` };
    },

    async ouvrirSessionAbonnement(s: SessionAbonnement, cle: string) {
      const deja = await db().sessionPaiementDemo.findUnique({ where: { cle } });
      const session =
        deja ??
        (await db().sessionPaiementDemo.create({
          data: {
            id: nouvelId("cs"),
            cle,
            nature: "abonnement",
            abonnementRef: s.abonnementRef,
            partenaireRef: s.client.partenaireRef,
            montantTtcCentimes: s.premierMontantTtc,
            montantMensuelTtcCentimes: s.montantMensuelTtc,
            moyens: s.moyens,
            urlRetour: s.urlRetour,
            urlAnnulation: s.urlAnnulation,
          },
        }));
      return { sessionId: session.id, url: `${CHEMIN_PAGE_PAIEMENT_DEMO}?session=${encodeURIComponent(session.id)}` };
    },

    async rembourser(d: { paiementRef: string; montantTtc: number; motif: string }, cle: string) {
      const deja = await db().remboursementDemo.findUnique({ where: { cle } });
      if (deja) return { remboursementRef: deja.id };
      const paiement = await db().sessionPaiementDemo.findFirst({ where: { paiementRef: d.paiementRef } });
      if (!paiement) throw new NotFound("Paiement", d.paiementRef);
      const r = await db().remboursementDemo.create({
        data: { id: nouvelId("re"), cle, paiementRef: d.paiementRef, montantTtcCentimes: d.montantTtc, motif: d.motif },
      });
      return { remboursementRef: r.id };
    },

    async resilierAbonnement(abonnementRef: string) {
      const session = await db().sessionPaiementDemo.findFirst({ where: { abonnementRef } });
      if (!session) throw new NotFound("Abonnement de paiement", abonnementRef);
    },

    async verifierEvenement(contenu: string, signature: string): Promise<EvenementPaiement> {
      if (!signatureValide(contenu, signature)) throw new InvalidSignature();
      const brut = JSON.parse(contenu) as Omit<EvenementPaiement, "date"> & { date: string };
      return { ...brut, date: new Date(brut.date) };
    },
  };
}
