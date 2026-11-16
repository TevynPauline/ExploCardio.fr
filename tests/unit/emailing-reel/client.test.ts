import { describe, expect, it } from "vitest";
import { ClientBrevo, type CorpsEnvoi } from "@/connecteurs/emailing/real/client";

// T005 (F25, research R1 et R7) : appels à Brevo, erreurs du contrat, clé masquée.

const CLE = "cle-brevo-factice-de-test-0123456789";

type Appel = { url: string; init: RequestInit };

function fauxBrevo(reponse: (a: Appel) => Response | Promise<Response>) {
  const appels: Appel[] = [];
  const f = (async (url: string | URL | Request, init?: RequestInit) => {
    const a = { url: String(url), init: init ?? {} };
    appels.push(a);
    return reponse(a);
  }) as typeof fetch;
  return { appels, client: new ClientBrevo({ cle: CLE, fetch: f, delaiMs: 50 }) };
}

const json = (status: number, corps: unknown) => new Response(JSON.stringify(corps), { status, headers: { "content-type": "application/json" } });

const corps: CorpsEnvoi = {
  sender: { name: "ExploCardio.fr", email: "contact@explocardio.fr" },
  replyTo: { name: "ExploCardio.fr", email: "contact@explocardio.fr" },
  to: [{ email: "equipe@explocardio.fr" }],
  subject: "Essai",
  htmlContent: "<p>Essai</p>",
  textContent: "Essai",
  tags: ["cle:abc"],
};

function sansCle(e: unknown) {
  expect(JSON.stringify({ m: (e as Error).message, d: (e as { details?: unknown }).details })).not.toContain(CLE);
}

describe("client Brevo", () => {
  it("envoie avec l'en-tête api-key et renvoie le messageId", async () => {
    const { appels, client } = fauxBrevo(() => json(201, { messageId: "<id-1@smtp-relay>" }));
    await expect(client.envoyer(corps)).resolves.toBe("<id-1@smtp-relay>");
    expect(appels[0]!.url).toBe("https://api.brevo.com/v3/smtp/email");
    expect((appels[0]!.init.headers as Record<string, string>)["api-key"]).toBe(CLE);
    expect(JSON.parse(String(appels[0]!.init.body))).toEqual(corps);
  });

  it("clé refusée (401, 403) : configuration incomplète, sans la clé", async () => {
    for (const statut of [401, 403]) {
      const e = await fauxBrevo(() => json(statut, { code: "unauthorized", message: `Key not found ${CLE}` })).client.envoyer(corps).catch((x: unknown) => x);
      expect(e).toMatchObject({ code: "CONFIGURATION_INCOMPLETE", details: { variablesManquantes: ["EMAILING_API_KEY"] } });
      sansCle(e);
    }
  });

  it("quota atteint (402 ou not_enough_credits) : indisponible, cause quota", async () => {
    await expect(fauxBrevo(() => json(402, { code: "payment_required" })).client.envoyer(corps)).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE", details: { cause: "quota" } });
    await expect(fauxBrevo(() => json(400, { code: "not_enough_credits" })).client.envoyer(corps)).rejects.toMatchObject({ details: { cause: "quota" } });
  });

  it("429, 5xx et délai dépassé : indisponible", async () => {
    for (const statut of [429, 500, 503]) {
      await expect(fauxBrevo(() => json(statut, {})).client.envoyer(corps)).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    }
    const lent = fauxBrevo((a) => new Promise<Response>((_, rejeter) => a.init.signal!.addEventListener("abort", () => rejeter(a.init.signal!.reason))));
    await expect(lent.client.envoyer(corps)).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE", details: { cause: "delai" } });
  });

  it("adresse invalide : opération refusée, sans la clé", async () => {
    const e = await fauxBrevo(() => json(400, { code: "invalid_parameter", message: `email is not valid in to ${CLE}` })).client.envoyer(corps).catch((x: unknown) => x);
    expect(e).toMatchObject({ code: "OPERATION_REFUSED", details: { cause: "adresse_invalide" } });
    sansCle(e);
  });

  it("lit les événements par message ou par étiquette, page par page", async () => {
    const page = (n: number, depart: number) => ({ events: Array.from({ length: n }, (_, i) => ({ event: "delivered", date: "2026-11-16T10:00:00Z", messageId: `m${depart + i}` })) });
    const { appels, client } = fauxBrevo((a) => json(200, new URL(a.url).searchParams.get("offset") === "0" ? page(100, 0) : page(3, 100)));
    const evts = await client.evenements({ tags: "cle:abc", jours: 7 });
    expect(evts).toHaveLength(103);
    const p = new URL(appels[0]!.url).searchParams;
    expect(p.get("tags")).toBe("cle:abc");
    expect(p.get("days")).toBe("7");
    expect(appels).toHaveLength(2);
  });

  it("aucun événement (réponse vide) : liste vide", async () => {
    await expect(fauxBrevo(() => json(200, {})).client.evenements({ messageId: "<x>", jours: 7 })).resolves.toEqual([]);
  });

  it("met à jour un contact avec updateEnabled", async () => {
    const { appels, client } = fauxBrevo(() => new Response(null, { status: 204 }));
    await client.contact({ email: "a@b.fr", attributes: { NEWSLETTER: false } });
    expect(appels[0]!.url).toBe("https://api.brevo.com/v3/contacts");
    expect(JSON.parse(String(appels[0]!.init.body))).toEqual({ email: "a@b.fr", attributes: { NEWSLETTER: false }, updateEnabled: true });
  });
});
