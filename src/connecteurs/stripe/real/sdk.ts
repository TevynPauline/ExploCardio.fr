import Stripe from "stripe";

// Instance du SDK Stripe (F24, research R1). Seul module du site qui construit le client
// Stripe ; la version d'API est figée pour que les formats ne changent pas sans nous.

export const VERSION_API_STRIPE = "2026-10-28.endive";

export type SdkStripe = Stripe;

export function creerSdk(cle: string): SdkStripe {
  return new Stripe(cle, {
    apiVersion: VERSION_API_STRIPE,
    timeout: 15_000,
    maxNetworkRetries: 1,
    appInfo: { name: "ExploCardio.fr" },
  });
}
