import { describe, expect, it } from "vitest";
import type { SessionAbonnement } from "@/connecteurs/stripe/interfaces";
import { fauxStripe } from "./faux-stripe";

// T021 (F24, US2, R5, FR-010 à FR-013) : page de souscription d'un abonnement.

const base: SessionAbonnement = {
  client: { partenaireRef: "P-42", email: "docteur@cabinet.fr" },
  objet: "mise_a_disposition",
  abonnementRef: "C202611-0043",
  premierMontantTtc: 9_360,
  montantMensuelTtc: 16_560,
  elements: [
    { element: "DMS300-ABP:1", premierMontantTtc: 4_680, montantMensuelTtc: 8_280 },
    { element: "DMS300-ABP:2", premierMontantTtc: 4_680, montantMensuelTtc: 8_280 },
  ],
  moyens: ["sepa"],
  urlRetour: "/commande/retour?ref=C202611-0043",
  urlAnnulation: "/commande/retour?ref=C202611-0043",
};

function preparer() {
  return fauxStripe({
    "customers.search": () => ({ data: [{ id: "cus_1" }] }),
    "coupons.create": () => ({ id: "coupon_1" }),
    "checkout.sessions.create": () => ({ id: "cs_2", url: "https://checkout.stripe.com/c/pay/cs_2" }),
  });
}
type LigneTest = { quantity: number; price_data: { unit_amount: number; product_data: { name: string } } };
type ParametresTest = {
  mode: string;
  allowed_payment_method_types: string[];
  line_items: LigneTest[];
  subscription_data: { metadata: Record<string, string>; trial_end?: number };
  metadata: Record<string, string>;
  discounts?: { coupon: string }[];
};
const parametres = (f: ReturnType<typeof preparer>) => f.appels.find((a) => a.ressource === "checkout.sessions")!.args[0] as ParametresTest;

describe("page de souscription", () => {
  it("un article mensuel par location, SEPA, références ; premier mois moins cher → coupon unique", async () => {
    const f = preparer();
    await f.connecteur().ouvrirSessionAbonnement(base, "C202611-0043:abonnement:1");
    const p = parametres(f);
    expect(p.mode).toBe("subscription");
    expect(p.allowed_payment_method_types).toEqual(["sepa_debit"]);
    expect(p.line_items).toEqual([
      { quantity: 1, price_data: { currency: "eur", unit_amount: 8_280, recurring: { interval: "month" }, product_data: { name: "Mise à disposition — DMS300-ABP:1", metadata: { element: "DMS300-ABP:1", abonnementRef: "C202611-0043" } } } },
      { quantity: 1, price_data: { currency: "eur", unit_amount: 8_280, recurring: { interval: "month" }, product_data: { name: "Mise à disposition — DMS300-ABP:2", metadata: { element: "DMS300-ABP:2", abonnementRef: "C202611-0043" } } } },
    ]);
    expect(p.subscription_data).toEqual({ metadata: { abonnementRef: "C202611-0043", objet: "mise_a_disposition" } });
    expect(p.metadata).toEqual({ abonnementRef: "C202611-0043" });
    const coupon = f.appels.find((a) => a.ressource === "coupons")!.args;
    expect(coupon).toEqual([{ amount_off: 7_200, currency: "eur", duration: "once", name: "Tarif du premier mois" }, { idempotencyKey: "coupon:C202611-0043:abonnement:1" }]);
    expect(p.discounts).toEqual([{ coupon: "coupon_1" }]);
  });

  it("premier mois plus cher : ligne ponctuelle de l'écart, sans coupon ; carte", async () => {
    const f = preparer();
    await f.connecteur().ouvrirSessionAbonnement({ ...base, moyens: ["carte"], premierMontantTtc: 20_000 }, "cle-b");
    const p = parametres(f);
    expect(p.allowed_payment_method_types).toEqual(["card"]);
    expect(p.line_items.at(-1)).toEqual({ quantity: 1, price_data: { currency: "eur", unit_amount: 3_440, product_data: { name: "Premier mois : frais d'envoi et de retour" } } });
    expect(p.discounts).toBeUndefined();
    expect(f.appels.some((a) => a.ressource === "coupons")).toBe(false);
  });

  it("prise d'effet différée (F12) : période d'essai jusqu'à la date, ni écart ni coupon", async () => {
    const f = preparer();
    const debut = new Date(Date.now() + 20 * 24 * 3600_000);
    await f.connecteur().ouvrirSessionAbonnement({ ...base, objet: "logiciel", elements: undefined, premierMontantTtc: 0, montantMensuelTtc: 4_800, debutPrelevements: debut }, "cle-c");
    const p = parametres(f);
    expect(p.subscription_data.trial_end).toBe(Math.floor(debut.getTime() / 1000));
    expect(p.line_items).toHaveLength(1);
    expect(p.line_items[0]!.price_data.product_data.name).toBe("Abonnement logiciel — C202611-0043");
    expect(f.appels.some((a) => a.ressource === "coupons")).toBe(false);
  });

  it("prise d'effet dans moins de 48 h : reportée au minimum exigé par Stripe", async () => {
    const f = preparer();
    await f.connecteur().ouvrirSessionAbonnement({ ...base, elements: undefined, premierMontantTtc: 0, montantMensuelTtc: 4_800, debutPrelevements: new Date(Date.now() + 3600_000) }, "cle-d");
    expect(parametres(f).subscription_data.trial_end).toBeGreaterThanOrEqual(Math.floor(Date.now() / 1000) + 2 * 24 * 3600);
  });
});
