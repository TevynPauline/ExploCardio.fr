import { creerEmailingReel } from "@/connecteurs/emailing/real";

// Faux Brevo pour les tests du mode réel (F25) : enregistre les appels, simule envois et événements.

export type Appel = { methode: string; chemin: string; params: URLSearchParams; corps: Record<string, unknown> | null };
export type EvenementSimule = { event: string; date: string; messageId: string; tag?: string; reason?: string };

export function fauxBrevo(options: { evenements?: EvenementSimule[]; envoi?: (n: number) => Response } = {}) {
  const appels: Appel[] = [];
  const evenements = options.evenements ?? [];
  let n = 0;
  const f = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = new URL(String(url));
    const a: Appel = { methode: init?.method ?? "GET", chemin: u.pathname.replace(/^\/v3/, ""), params: u.searchParams, corps: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null };
    appels.push(a);
    if (a.chemin === "/smtp/email") {
      n++;
      return options.envoi?.(n) ?? new Response(JSON.stringify({ messageId: `<m${n}@brevo>` }), { status: 201 });
    }
    if (a.chemin === "/smtp/statistics/events") {
      const tag = a.params.get("tags");
      const id = a.params.get("messageId");
      const lot = evenements.filter((e) => (tag ? e.tag === tag : true) && (id ? e.messageId === id : true));
      return new Response(JSON.stringify(lot.length ? { events: lot } : {}), { status: 200 });
    }
    if (a.chemin === "/contacts") return new Response(null, { status: 204 });
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
  return { appels, envois: () => appels.filter((a) => a.chemin === "/smtp/email"), fetch: f };
}

export const ENV_PRODUCTION = { CONNECTOR_EMAILING: "real", EMAILING_API_KEY: "cle-brevo-factice", EMAILING_ENVIRONNEMENT: "production" };
export const ENV_RECETTE = { ...ENV_PRODUCTION, EMAILING_ENVIRONNEMENT: "recette", EMAILING_ADRESSES_AUTORISEES: "@explocardio.fr" };

export function connecteur(env: Record<string, string>, f: typeof fetch) {
  return creerEmailingReel([], env, { fetch: f });
}
