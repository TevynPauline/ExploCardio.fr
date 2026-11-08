import { describe, expect, it } from "vitest";
import { CLE_TEST, clientDeTest, fauxOdoo, reponseJson } from "./faux-odoo";

// T004 (F14, R9) : authentification, délais, reprises, correspondance des erreurs, clé masquée.

const ok = (result: unknown) => reponseJson({ jsonrpc: "2.0", id: 1, result });
const erreur = (name: string, message: string) => reponseJson({ jsonrpc: "2.0", id: 1, error: { message: "Odoo Server Error", data: { name, message } } });

function sansCle(e: unknown) {
  expect(JSON.stringify({ m: (e as Error).message, d: (e as { details?: unknown }).details })).not.toContain(CLE_TEST);
}

describe("client JSON-RPC d'Odoo", () => {
  it("s'authentifie une seule fois puis réutilise l'identifiant", async () => {
    const odoo = fauxOdoo({ "product.category": [{ id: 1, name: "Holter ECG" }] });
    const client = clientDeTest(odoo.fetch);
    await client.searchRead("product.category", [], ["name"]);
    await client.searchRead("product.category", [], ["name"]);
    expect(odoo.appels.filter((a) => a.methode === "authenticate")).toHaveLength(1);
    expect(odoo.appels.filter((a) => a.methode === "execute_kw")).toHaveLength(2);
  });

  it("une authentification refusée (false) donne ServiceUnavailable, cause « acces_refuse », sans la clé", async () => {
    const odoo = fauxOdoo({}, (a) => (a.methode === "authenticate" ? false : undefined));
    const e = await clientDeTest(odoo.fetch).searchRead("product.category", [], ["name"]).catch((x: unknown) => x);
    expect(e).toMatchObject({ code: "SERVICE_UNAVAILABLE", details: { cause: "acces_refuse" } });
    sansCle(e);
  });

  it("AccessDenied donne aussi « acces_refuse » ; AccessError donne « droit_insuffisant » et le modèle", async () => {
    const refus = fauxOdoo({}, (a) => (a.methode === "authenticate" ? erreur("odoo.exceptions.AccessDenied", "Access Denied") : undefined));
    await expect(clientDeTest(refus.fetch).searchCount("res.partner", [])).rejects.toMatchObject({ details: { cause: "acces_refuse" } });
    const droit = fauxOdoo({}, (a) => (a.methode === "execute_kw" ? erreur("odoo.exceptions.AccessError", `Vous n'avez pas accès ${CLE_TEST}`) : undefined));
    const e = await clientDeTest(droit.fetch).searchCount("res.partner", []).catch((x: unknown) => x);
    expect(e).toMatchObject({ code: "SERVICE_UNAVAILABLE", details: { cause: "droit_insuffisant", modele: "res.partner" } });
    sansCle(e);
  });

  it("reprend deux fois une lecture sur 429/502/503 puis renonce", async () => {
    let n = 0;
    const odoo = fauxOdoo({}, (a) => (a.methode === "execute_kw" ? (n++, reponseJson({}, 503)) : undefined));
    const attentes: number[] = [];
    const client = clientDeTest(odoo.fetch, { attendre: async (ms) => void attentes.push(ms) });
    await expect(client.searchCount("product.product", [])).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE", details: { cause: "http_503" } });
    expect(n).toBe(3);
    expect(attentes).toEqual([500, 2000]);
  });

  it("une lecture qui réussit après une erreur temporaire renvoie le résultat", async () => {
    let n = 0;
    const odoo = fauxOdoo({}, (a) => (a.methode === "execute_kw" ? (n++ === 0 ? reponseJson({}, 429) : ok(7)) : undefined));
    await expect(clientDeTest(odoo.fetch).searchCount("product.product", [])).resolves.toBe(7);
  });

  it("ne reprend jamais une écriture", async () => {
    let n = 0;
    const odoo = fauxOdoo({}, (a) => (a.methode === "execute_kw" ? (n++, reponseJson({}, 502)) : undefined));
    await expect(clientDeTest(odoo.fetch).appeler("sale.order", "create", [{}])).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    expect(n).toBe(1);
  });

  it("un délai dépassé donne ServiceUnavailable « delai_depasse »", async () => {
    const lent = (async (_u: string, init?: RequestInit) =>
      new Promise((_r, rejet) => init?.signal?.addEventListener("abort", () => rejet(Object.assign(new Error("abort"), { name: "AbortError" }))))) as unknown as typeof fetch;
    const client = clientDeTest(lent, { delaiMs: 5 });
    await expect(client.searchCount("product.product", [])).rejects.toMatchObject({ details: { cause: "delai_depasse" } });
  });

  it("appelle la garde avant toute écriture, jamais avant une lecture", async () => {
    const odoo = fauxOdoo({ "product.product": [] });
    const gardes: string[] = [];
    const client = clientDeTest(odoo.fetch, { avantEcriture: async () => void gardes.push("garde") });
    await client.searchRead("product.product", [], ["id"]);
    expect(gardes).toEqual([]);
    await client.appeler("product.product", "search_count", [[]]).catch(() => {});
    expect(gardes).toEqual(["garde"]);
  });

  it("une erreur d'Odoo inattendue ne contient jamais la clé", async () => {
    const odoo = fauxOdoo({}, (a) => (a.methode === "execute_kw" ? erreur("odoo.exceptions.UserError", `Boum ${CLE_TEST}`) : undefined));
    const e = await clientDeTest(odoo.fetch).searchCount("x", []).catch((x: unknown) => x);
    expect(e).toMatchObject({ details: { cause: "erreur_odoo", type: "UserError" } });
    sansCle(e);
  });
});
