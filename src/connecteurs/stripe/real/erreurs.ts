import { ConfigurationIncomplete, NotFound, OperationRefusee, ServiceUnavailable, estErreurConnecteur } from "../../erreurs";

// Erreurs Stripe → erreurs du contrat (F24, contracts/stripe-reel.md). Même code d'erreur que
// la démonstration ; la clé n'apparaît jamais dans un message ni un détail.

type ErreurStripe = { type?: string; code?: string; param?: string; message?: string; statusCode?: number };

const INDISPONIBLE = new Set(["StripeConnectionError", "StripeAPIError", "StripeRateLimitError", "StripeIdempotencyError"]);
const CLE_REFUSEE = new Set(["StripeAuthenticationError", "StripePermissionError"]);
const MONTANT_REFUSE = new Set(["amount_too_large", "charge_already_refunded", "refund_exceeds_amount"]);

export function estErreurStripe(e: unknown): e is ErreurStripe {
  return typeof e === "object" && e !== null && typeof (e as ErreurStripe).type === "string" && (e as ErreurStripe).type!.startsWith("Stripe");
}

/** Traduit une erreur levée par le SDK ; une erreur déjà traduite ou inconnue est rendue telle quelle. */
export function traduireErreurStripe(e: unknown, masquer: (texte: string) => string, objet = "Objet Stripe"): unknown {
  if (estErreurConnecteur(e) || !estErreurStripe(e)) return e;
  const detail = masquer(e.message ?? "").slice(0, 300);
  if (CLE_REFUSEE.has(e.type!)) return new ConfigurationIncomplete("stripe", ["STRIPE_SECRET_KEY"]);
  if (INDISPONIBLE.has(e.type!)) return new ServiceUnavailable("stripe", { type: e.type, statut: e.statusCode ?? null });
  if (e.code === "resource_missing") return new NotFound(objet, e.param ?? "inconnu");
  if (e.code && MONTANT_REFUSE.has(e.code)) return new OperationRefusee("Montant refusé par Stripe.", { cause: e.code, detail });
  if (e.type === "StripeCardError") return new OperationRefusee("Paiement refusé.", { cause: e.code ?? "carte_refusee" });
  return new ServiceUnavailable("stripe", { type: e.type, code: e.code ?? null, detail });
}
