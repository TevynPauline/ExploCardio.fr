import { describe, expect, it } from "vitest";
import { fauxStripe } from "./faux-stripe";

// T026 (F24, US3, R7, R8, FR-016, FR-018) : retrait et rétablissement d'une location à une
// date, résiliation, par le calendrier de prélèvement de Stripe, sans prorata.

const JOUR = 24 * 3600;
const maintenant = Math.floor(Date.now() / 1000);
const fin1 = maintenant + 20 * JOUR;
const fin2 = maintenant + 50 * JOUR;

function abonnement(metadata: Record<string, string> = {}, schedule: string | null = null) {
  return {
    id: "sub_1",
    customer: "cus_1",
    schedule,
    metadata: { abonnementRef: "C202611-0043", ...metadata },
    default_payment_method: { id: "pm_1", type: "card" },
    items: { data: [
      { id: "si_1", price: { id: "price_1", product: "prod_1" } },
      { id: "si_2", price: { id: "price_2", product: "prod_2" } },
    ] },
  };
}

function preparer(sub = abonnement()) {
  return fauxStripe({
    "subscriptions.search": () => ({ data: [sub] }),
    "products.retrieve": (id) => ({ id, metadata: { element: id === "prod_1" ? "DMS300-ABP:1" : "DMS300-ABP:2" } }),
    "subscriptions.update": () => sub,
    "subscriptionSchedules.create": () => ({ id: "sub_sched_1", current_phase: { start_date: maintenant - 5 * JOUR }, phases: [] }),
    "subscriptionSchedules.retrieve": () => ({ id: "sub_sched_1", current_phase: { start_date: maintenant - 5 * JOUR }, phases: [] }),
    "subscriptionSchedules.update": () => ({ id: "sub_sched_1" }),
    "subscriptionSchedules.release": () => ({ id: "sub_sched_1" }),
  });
}
type PhaseTest = { items: { price: string; quantity: number }[]; start_date?: number; end_date?: number | "now"; duration?: unknown; proration_behavior: string };
type MajTest = { phases: PhaseTest[]; end_behavior: string; proration_behavior: string };
const majCalendrier = (f: ReturnType<typeof preparer>) => f.appels.filter((a) => a.ressource === "subscriptionSchedules" && a.methode === "update").map((a) => a.args[1] as MajTest);

describe("retrait d'une location à une date", () => {
  it("calendrier créé : les deux locations jusqu'à la date, puis la seule restante, sans prorata", async () => {
    const f = preparer();
    await f.connecteur().retirerElementAbonnement("C202611-0043", "DMS300-ABP:1", new Date(fin1 * 1000), "cle");
    expect(f.appels.find((a) => a.methode === "search")!.args[0]).toMatchObject({ query: "metadata['abonnementRef']:'C202611-0043'" });
    expect(f.appels.some((a) => a.ressource === "subscriptionSchedules" && a.methode === "create")).toBe(true);
    const [maj] = majCalendrier(f);
    expect(maj!.end_behavior).toBe("release");
    expect(maj!.proration_behavior).toBe("none");
    expect(maj!.phases).toEqual([
      { items: [{ price: "price_1", quantity: 1 }, { price: "price_2", quantity: 1 }], start_date: maintenant - 5 * JOUR, end_date: fin1, proration_behavior: "none" },
      { items: [{ price: "price_2", quantity: 1 }], duration: { interval: "month", interval_count: 1 }, proration_behavior: "none" },
    ]);
    const meta = f.appels.find((a) => a.ressource === "subscriptions" && a.methode === "update")!.args[1] as { metadata: { retraits: string } };
    expect(JSON.parse(meta.metadata.retraits)).toEqual({ "DMS300-ABP:1": fin1 });
  });

  it("même retrait rejoué : aucune écriture", async () => {
    const f = preparer(abonnement({ retraits: JSON.stringify({ "DMS300-ABP:1": fin1 }) }, "sub_sched_1"));
    await f.connecteur().retirerElementAbonnement("C202611-0043", "DMS300-ABP:1", new Date(fin1 * 1000), "cle");
    expect(f.appels.filter((a) => a.methode === "update" || a.methode === "create")).toHaveLength(0);
  });

  it("retrait immédiat : fin de phase « now »", async () => {
    const f = preparer();
    await f.connecteur().retirerElementAbonnement("C202611-0043", "DMS300-ABP:2", new Date(), "cle");
    expect(majCalendrier(f)[0]!.phases[0]!.end_date).toBe("now");
  });

  it("les deux locations retirées : le calendrier s'arrête et résilie à la dernière date", async () => {
    const f = preparer(abonnement({ retraits: JSON.stringify({ "DMS300-ABP:1": fin1 }) }, "sub_sched_1"));
    await f.connecteur().retirerElementAbonnement("C202611-0043", "DMS300-ABP:2", new Date(fin2 * 1000), "cle");
    const [maj] = majCalendrier(f);
    expect(maj!.end_behavior).toBe("cancel");
    expect(maj!.phases.map((p) => p.end_date)).toEqual([fin1, fin2]);
  });

  it("rétablir le seul retrait : calendrier libéré, résiliation effacée", async () => {
    const f = preparer(abonnement({ retraits: JSON.stringify({ "DMS300-ABP:1": fin1 }) }, "sub_sched_1"));
    await f.connecteur().retablirElementAbonnement("C202611-0043", "DMS300-ABP:1");
    expect(f.appels.some((a) => a.methode === "release")).toBe(true);
    expect(f.appels.find((a) => a.ressource === "subscriptions" && a.methode === "update")!.args[1]).toMatchObject({ cancel_at: "", proration_behavior: "none" });
  });

  it("élément ou abonnement inconnu : NotFound", async () => {
    await expect(preparer().connecteur().retirerElementAbonnement("C202611-0043", "AUTRE:1", new Date(fin1 * 1000), "cle")).rejects.toMatchObject({ code: "NOT_FOUND" });
    const vide = fauxStripe({ "subscriptions.search": () => ({ data: [] }) });
    await expect(vide.connecteur().resilierAbonnement("C-INCONNU", new Date())).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("résiliation", () => {
  it("sans retrait prévu : fin d'abonnement à la date, sans prorata", async () => {
    const f = preparer();
    await f.connecteur().resilierAbonnement("C202611-0043", new Date(fin2 * 1000));
    expect(f.appels.find((a) => a.ressource === "subscriptions" && a.methode === "update")!.args[1]).toEqual({ cancel_at: fin2, proration_behavior: "none", metadata: { fin: String(fin2) } });
    expect(f.appels.some((a) => a.ressource === "subscriptionSchedules")).toBe(false);
  });

  it("avec un retrait prévu : le calendrier se termine à la date de fin", async () => {
    const f = preparer(abonnement({ retraits: JSON.stringify({ "DMS300-ABP:1": fin1 }) }, "sub_sched_1"));
    await f.connecteur().resilierAbonnement("C202611-0043", new Date(fin2 * 1000));
    const [maj] = majCalendrier(f);
    expect(maj!.end_behavior).toBe("cancel");
    expect(maj!.phases.at(-1)!.end_date).toBe(fin2);
  });
});
