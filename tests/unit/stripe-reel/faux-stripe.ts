import Stripe from "stripe";
import { creerStripeReel } from "@/connecteurs/stripe/real";

// Faux Stripe des tests du mode réel (F24, T012) : une vraie instance du SDK (pour signer et
// vérifier les webhooks, sans réseau) dont les ressources appelées sont remplacées par des
// doublures qui enregistrent chaque appel. Aucune requête ne part.

export const SECRET_WEBHOOK = "whsec_secret_factice_de_test";
export const ENV_RECETTE = { CONNECTOR_STRIPE: "real", STRIPE_ENVIRONNEMENT: "recette", STRIPE_SECRET_KEY: "rk_test_cle_factice", STRIPE_WEBHOOK_SECRET: SECRET_WEBHOOK, SITE_URL: "https://recette.explocardio.test" };

export type Appel = { ressource: string; methode: string; args: unknown[] };
type Reponse = (...args: unknown[]) => unknown;

export function fauxStripe(reponses: Record<string, Reponse> = {}) {
  const sdk = new Stripe("sk_test_factice_pour_les_tests");
  const appels: Appel[] = [];
  const doublure = (chemin: string) => {
    const [ressource, methode] = [chemin.slice(0, chemin.lastIndexOf(".")), chemin.slice(chemin.lastIndexOf(".") + 1)];
    return async (...args: unknown[]) => {
      appels.push({ ressource, methode, args });
      const r = reponses[chemin];
      if (!r) throw new Error(`Appel Stripe non prévu par le test : ${chemin}`);
      return r(...args);
    };
  };
  const chemins = [
    "customers.search", "customers.create", "checkout.sessions.create", "coupons.create", "billingPortal.sessions.create",
    "paymentIntents.retrieve", "paymentIntents.create", "invoicePayments.list", "refunds.create", "paymentMethods.detach",
    "subscriptions.search", "subscriptions.retrieve", "subscriptions.update", "subscriptionSchedules.create",
    "subscriptionSchedules.retrieve", "subscriptionSchedules.update", "subscriptionSchedules.release",
  ];
  for (const chemin of chemins) {
    const parties = chemin.split(".");
    let cible = sdk as unknown as Record<string, unknown>;
    for (const p of parties.slice(0, -1)) cible = cible[p] as Record<string, unknown>;
    Object.defineProperty(cible, parties.at(-1)!, { value: doublure(chemin), configurable: true, writable: true });
  }
  return { sdk, appels, connecteur: (env: Record<string, string> = ENV_RECETTE) => creerStripeReel([], env, { sdk }) };
}

/** Corps et signature d'un événement Stripe de test. */
export function evenementSigne(sdk: Stripe, type: string, objet: Record<string, unknown>, id = `evt_${Math.random().toString(36).slice(2)}`) {
  const contenu = JSON.stringify({ id, object: "event", type, created: 1_794_830_400, api_version: "2026-10-28.endive", data: { object: objet } });
  const signature = sdk.webhooks.generateTestHeaderString({ payload: contenu, secret: SECRET_WEBHOOK });
  return { id, contenu, signature };
}
