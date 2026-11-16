import type Stripe from "stripe";
import { InvalidSignature } from "../../erreurs";
import type { EvenementPaiement, MoyenPaiement, TypeCarte } from "../interfaces";

// Événements Stripe → événements du site (F24, research R6, R9, R12). Signature vérifiée avec
// le secret du webhook ; un événement sans usage donne `null` (accepté et ignoré).

/** Lectures complémentaires nécessaires à certains événements (injectables en test). */
export type LecteurStripe = {
  /** Métadonnées et moyen de paiement d'un PaymentIntent. */
  paiement(id: string): Promise<{ metadata: Record<string, string>; moyen: MoyenPaiement | null; carte: TypeCarte | null }>;
  /** PaymentIntent qui a réglé une facture, s'il y en a un. */
  paiementDeFacture(factureId: string): Promise<string | null>;
};

const CARTES: Record<string, TypeCarte> = { visa: "visa", mastercard: "mastercard", amex: "amex" };

export function typeCarte(marque: string | null | undefined): TypeCarte | null {
  return marque ? (CARTES[marque] ?? null) : null;
}

const id = (x: string | { id: string } | null | undefined): string | null => (typeof x === "string" ? x : (x?.id ?? null));

function base(evt: Stripe.Event): Pick<EvenementPaiement, "id" | "date" | "sessionId" | "commandeRef" | "abonnementRef" | "paiementRef" | "moyen" | "carte"> {
  return { id: evt.id, date: new Date(evt.created * 1000), sessionId: null, commandeRef: null, abonnementRef: null, paiementRef: null, moyen: null, carte: null };
}

/** Vérifie la signature et rend l'événement Stripe brut ; InvalidSignature sinon. */
export function construireEvenementStripe(sdk: Stripe, contenu: string, signature: string, secret: string): Stripe.Event {
  if (!signature) throw new InvalidSignature();
  try {
    return sdk.webhooks.constructEvent(contenu, signature, secret);
  } catch {
    throw new InvalidSignature();
  }
}

async function depuisFacture(evt: Stripe.Event, facture: Stripe.Invoice, type: "echeance_payee" | "echeance_refusee", lire: LecteurStripe): Promise<EvenementPaiement | null> {
  const abonnementRef = facture.parent?.subscription_details?.metadata?.abonnementRef ?? null;
  if (!abonnementRef) return null; // facture d'un autre usage
  const paiementRef = await lire.paiementDeFacture(facture.id!);
  const montantTtc = type === "echeance_payee" ? facture.amount_paid : facture.amount_due;
  return { ...base(evt), type, abonnementRef, paiementRef, montantTtc };
}

export async function traduireEvenement(evt: Stripe.Event, lire: LecteurStripe): Promise<EvenementPaiement | null> {
  switch (evt.type) {
    case "checkout.session.completed": {
      const s = evt.data.object;
      const commun = { ...base(evt), sessionId: s.id, montantTtc: s.amount_total ?? 0 };
      if (s.mode === "payment") {
        if (s.payment_status !== "paid") return null;
        const paiementRef = id(s.payment_intent);
        const p = paiementRef ? await lire.paiement(paiementRef) : null;
        return { ...commun, type: "paiement_reussi", commandeRef: s.metadata?.commandeRef ?? s.client_reference_id ?? null, paiementRef, moyen: p?.moyen ?? "carte", carte: p?.carte ?? null };
      }
      if (s.mode === "subscription") {
        // F24 (FR-012, option A) : un mandat SEPA signé confirme la souscription, sans attendre
        // la confirmation du premier prélèvement.
        const paiementRef = s.invoice ? await lire.paiementDeFacture(id(s.invoice)!) : null;
        const sepa = s.payment_method_types?.includes("sepa_debit") ?? false;
        return { ...commun, type: "paiement_reussi", abonnementRef: s.metadata?.abonnementRef ?? null, paiementRef, moyen: sepa ? "sepa" : "carte" };
      }
      return null;
    }
    case "checkout.session.async_payment_failed": {
      const s = evt.data.object;
      if (s.mode === "subscription") {
        return { ...base(evt), type: "echeance_refusee", sessionId: s.id, abonnementRef: s.metadata?.abonnementRef ?? null, montantTtc: s.amount_total ?? 0, moyen: "sepa" };
      }
      return { ...base(evt), type: "paiement_refuse", sessionId: s.id, commandeRef: s.metadata?.commandeRef ?? null, montantTtc: s.amount_total ?? 0 };
    }
    case "invoice.paid": {
      const f = evt.data.object;
      return f.billing_reason === "subscription_cycle" ? depuisFacture(evt, f, "echeance_payee", lire) : null;
    }
    case "invoice.payment_failed":
    case "invoice.payment_action_required": {
      const f = evt.data.object;
      return f.billing_reason === "subscription_cycle" || f.billing_reason === "subscription_create" ? depuisFacture(evt, f, "echeance_refusee", lire) : null;
    }
    case "refund.created": {
      const r = evt.data.object;
      const paiementRef = id(r.payment_intent);
      const m = paiementRef ? (await lire.paiement(paiementRef)).metadata : {};
      return { ...base(evt), type: "remboursement", paiementRef, commandeRef: m.commandeRef ?? null, abonnementRef: m.abonnementRef ?? null, montantTtc: r.amount };
    }
    case "charge.dispute.created": {
      const d = evt.data.object;
      const paiementRef = id(d.payment_intent);
      const m = paiementRef ? (await lire.paiement(paiementRef)).metadata : {};
      return { ...base(evt), type: "contestation", paiementRef, commandeRef: m.commandeRef ?? null, abonnementRef: m.abonnementRef ?? null, montantTtc: d.amount };
    }
    default:
      return null;
  }
}
