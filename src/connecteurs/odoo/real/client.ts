import { ServiceUnavailable } from "../../erreurs";

// Client de l'API externe d'Odoo (JSON-RPC, `/jsonrpc`) — F14, research R1 et R9.
// Seul fichier du site qui parle à Odoo. La clé API n'apparaît jamais dans un message,
// un détail d'erreur ni le journal.

export type Domaine = unknown[];
export type Enregistrement = Record<string, unknown> & { id: number };

export type OptionsClient = {
  url: string;
  base: string;
  utilisateur: string;
  cle: string;
  /** Contrôle exécuté avant toute écriture (garde de neutralisation). */
  avantEcriture?: (client: ClientOdoo) => Promise<void>;
  /** Injections pour les tests. */
  fetch?: typeof fetch;
  attendre?: (ms: number) => Promise<void>;
  delaiMs?: number;
};

type OptionsLecture = { contexte?: Record<string, unknown>; limite?: number; ordre?: string };

const DELAI_MS = 10_000;
const ATTENTES_REPRISE = [500, 2_000];
const STATUTS_TEMPORAIRES = new Set([429, 502, 503, 504]);

class ErreurTemporaire extends Error {}

export class ClientOdoo {
  private uid: Promise<number> | null = null;
  private readonly fetch: typeof fetch;
  private readonly attendre: (ms: number) => Promise<void>;

  constructor(private readonly options: OptionsClient) {
    this.fetch = options.fetch ?? fetch;
    this.attendre = options.attendre ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  /** Retire la clé de tout texte destiné à un message ou au journal. */
  masquer(texte: string): string {
    const { cle } = this.options;
    return cle ? texte.split(cle).join("***") : texte;
  }

  private indisponible(details: Record<string, unknown>): ServiceUnavailable {
    const propres = Object.fromEntries(
      Object.entries(details).map(([k, v]) => [k, typeof v === "string" ? this.masquer(v) : v]),
    );
    return new ServiceUnavailable("Odoo", propres);
  }

  private async appelBrut(service: string, methode: string, args: unknown[]): Promise<unknown> {
    const controleur = new AbortController();
    const minuterie = setTimeout(() => controleur.abort(), this.options.delaiMs ?? DELAI_MS);
    let reponse: Response;
    try {
      reponse = await this.fetch(`${this.options.url.replace(/\/+$/, "")}/jsonrpc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { service, method: methode, args }, id: 1 }),
        signal: controleur.signal,
      });
    } catch (e) {
      const delai = e instanceof Error && e.name === "AbortError";
      throw new ErreurTemporaire(delai ? "delai_depasse" : "reseau");
    } finally {
      clearTimeout(minuterie);
    }
    if (STATUTS_TEMPORAIRES.has(reponse.status)) throw new ErreurTemporaire(`http_${reponse.status}`);
    if (!reponse.ok) throw this.indisponible({ cause: "http", statut: reponse.status });
    const corps = (await reponse.json()) as { result?: unknown; error?: { data?: { name?: string; message?: string }; message?: string } };
    if (corps.error) {
      const nom = corps.error.data?.name ?? "";
      const message = (corps.error.data?.message ?? corps.error.message ?? "").split("\n")[0]!.slice(0, 300);
      if (nom.endsWith("AccessDenied")) throw this.indisponible({ cause: "acces_refuse" });
      if (nom.endsWith("AccessError")) throw this.indisponible({ cause: "droit_insuffisant", modele: args[3], message });
      throw this.indisponible({ cause: "erreur_odoo", type: nom.split(".").pop() ?? "", message });
    }
    return corps.result;
  }

  /** Appel avec reprises (lectures seulement) : 2 nouvelles tentatives, 0,5 s puis 2 s. */
  private async appel(service: string, methode: string, args: unknown[], reprendre: boolean): Promise<unknown> {
    const attentes = reprendre ? ATTENTES_REPRISE : [];
    for (let essai = 0; ; essai++) {
      try {
        return await this.appelBrut(service, methode, args);
      } catch (e) {
        if (!(e instanceof ErreurTemporaire)) throw e;
        const attente = attentes[essai];
        if (attente === undefined) throw this.indisponible({ cause: e.message });
        await this.attendre(attente);
      }
    }
  }

  private authentifier(): Promise<number> {
    this.uid ??= (async () => {
      const { base, utilisateur, cle } = this.options;
      const uid = await this.appel("common", "authenticate", [base, utilisateur, cle, {}], true);
      if (typeof uid !== "number" || uid <= 0) throw this.indisponible({ cause: "acces_refuse" });
      return uid;
    })().catch((e: unknown) => {
      this.uid = null;
      throw e;
    });
    return this.uid;
  }

  private async executer(modele: string, methode: string, args: unknown[], kw: Record<string, unknown>, reprendre: boolean) {
    const uid = await this.authentifier();
    const { base, cle } = this.options;
    return this.appel("object", "execute_kw", [base, uid, cle, modele, methode, args, kw], reprendre);
  }

  async searchRead<T extends Enregistrement = Enregistrement>(
    modele: string,
    domaine: Domaine,
    champs: string[],
    o: OptionsLecture = {},
  ): Promise<T[]> {
    const kw: Record<string, unknown> = { fields: champs, context: { lang: "fr_FR", ...o.contexte } };
    if (o.limite) kw.limit = o.limite;
    if (o.ordre) kw.order = o.ordre;
    return (await this.executer(modele, "search_read", [domaine], kw, true)) as T[];
  }

  async read<T extends Enregistrement = Enregistrement>(modele: string, ids: number[], champs: string[], o: OptionsLecture = {}): Promise<T[]> {
    if (!ids.length) return [];
    return (await this.executer(modele, "read", [ids], { fields: champs, context: { lang: "fr_FR", ...o.contexte } }, true)) as T[];
  }

  async searchCount(modele: string, domaine: Domaine): Promise<number> {
    return (await this.executer(modele, "search_count", [domaine], {}, true)) as number;
  }

  /** Écriture (lots suivants) : garde de neutralisation, jamais de reprise automatique. */
  async appeler(modele: string, methode: string, args: unknown[], kw: Record<string, unknown> = {}): Promise<unknown> {
    await this.options.avantEcriture?.(this);
    return this.executer(modele, methode, args, kw, false);
  }
}

/** Une relation many2one d'Odoo : `[id, libellé]` ou `false`. */
export function idDe(valeur: unknown): number | null {
  return Array.isArray(valeur) && typeof valeur[0] === "number" ? valeur[0] : null;
}

/** Un texte d'Odoo : `false` pour vide. */
export function texteDe(valeur: unknown): string | null {
  return typeof valeur === "string" && valeur.trim() ? valeur.trim() : null;
}
