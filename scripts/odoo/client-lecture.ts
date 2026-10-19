// Client JSON-RPC d'Odoo réservé au test de connexion (`npm run odoo:sonder`) : LECTURE SEULE.
// Seules les méthodes de lecture sont autorisées ; toute autre est refusée avant l'envoi. Le
// site, lui, passe toujours par le connecteur (src/connecteurs/odoo), livré en mode réel par F14.

export const METHODES_LECTURE = new Set(["search_read", "search_count", "fields_get", "read"]);

export type AccesOdoo = { url: string; base: string; utilisateur: string; cleApi: string };

export class ErreurOdoo extends Error {}

export function accesDepuisEnvironnement(env: Record<string, string | undefined>): AccesOdoo {
  const manquantes = ["ODOO_URL", "ODOO_DATABASE", "ODOO_USER", "ODOO_API_KEY"].filter((v) => !env[v]?.trim());
  if (manquantes.length) {
    throw new ErreurOdoo(`Variables manquantes dans .env.local : ${manquantes.join(", ")}.`);
  }
  const url = env.ODOO_URL!.trim().replace(/\/+$/, "");
  const { protocol, hostname } = new URL(url);
  if (protocol !== "https:" && !["localhost", "127.0.0.1"].includes(hostname)) {
    throw new ErreurOdoo("ODOO_URL doit commencer par https:// (la clé d'API ne circule jamais en clair).");
  }
  return { url, base: env.ODOO_DATABASE!.trim(), utilisateur: env.ODOO_USER!.trim(), cleApi: env.ODOO_API_KEY!.trim() };
}

export function creerClientLecture(acces: AccesOdoo, delaiMs = 20_000) {
  let uid: number | null = null;

  async function appel(service: string, methode: string, args: unknown[]): Promise<unknown> {
    let reponse: Response;
    try {
      reponse = await fetch(`${acces.url}/jsonrpc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { service, method: methode, args }, id: Date.now() }),
        signal: AbortSignal.timeout(delaiMs),
      });
    } catch (e) {
      throw new ErreurOdoo(`Odoo injoignable à ${acces.url} (${e instanceof Error ? e.message : String(e)}).`);
    }
    if (!reponse.ok) throw new ErreurOdoo(`Odoo a répondu HTTP ${reponse.status} sur /jsonrpc.`);
    const corps = (await reponse.json()) as { result?: unknown; error?: { message?: string; data?: { message?: string; name?: string } } };
    if (corps.error) {
      const detail = corps.error.data?.message ?? corps.error.message ?? "erreur inconnue";
      // Ne jamais recopier la clé d'API, même si Odoo la renvoyait dans un message.
      throw new ErreurOdoo(detail.split(acces.cleApi).join("•••"));
    }
    return corps.result;
  }

  return {
    async version(): Promise<{ server_version?: string; server_serie?: string }> {
      return (await appel("common", "version", [])) as { server_version?: string; server_serie?: string };
    },

    async connecter(): Promise<number> {
      const resultat = await appel("common", "authenticate", [acces.base, acces.utilisateur, acces.cleApi, {}]);
      if (typeof resultat !== "number" || resultat <= 0) {
        throw new ErreurOdoo("Connexion refusée : vérifiez la base, l'utilisateur et la clé d'API.");
      }
      uid = resultat;
      return uid;
    },

    async lire<T = Record<string, unknown>>(modele: string, methode: string, args: unknown[], options: Record<string, unknown> = {}): Promise<T> {
      if (!METHODES_LECTURE.has(methode)) throw new ErreurOdoo(`Méthode « ${methode} » refusée : ce script ne fait que lire.`);
      if (uid === null) throw new ErreurOdoo("Appeler connecter() d'abord.");
      return (await appel("object", "execute_kw", [acces.base, uid, acces.cleApi, modele, methode, args, options])) as T;
    },
  };
}

export type ClientLecture = ReturnType<typeof creerClientLecture>;
