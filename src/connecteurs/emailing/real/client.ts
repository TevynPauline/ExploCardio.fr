import { ConfigurationIncomplete, OperationRefusee, ServiceUnavailable } from "../../erreurs";
import type { EvenementBrevo } from "./correspondance";

// Client de l'API v3 de Brevo (F25, research R1 et R7). Seul fichier du site qui parle à
// Brevo. Aucune reprise ici : le domaine reprend les envois (F10, FR-034). La clé n'apparaît
// jamais dans un message, un détail d'erreur ni le journal.

export type OptionsClientBrevo = {
  cle: string;
  url?: string;
  fetch?: typeof fetch;
  delaiMs?: number;
};

export type CorpsEnvoi = {
  sender: { name: string; email: string };
  replyTo: { name: string; email: string };
  to: { email: string }[];
  subject: string;
  htmlContent: string;
  textContent: string;
  tags: string[];
  headers?: Record<string, string>;
};

const URL_BREVO = "https://api.brevo.com/v3";
const DELAI_MS = 10_000;
const PAGE = 100;
const PAGES_MAX = 10;

export class ClientBrevo {
  private readonly fetch: typeof fetch;
  private readonly url: string;
  private readonly delaiMs: number;

  constructor(private readonly options: OptionsClientBrevo) {
    this.fetch = options.fetch ?? fetch;
    this.url = options.url ?? URL_BREVO;
    this.delaiMs = options.delaiMs ?? DELAI_MS;
  }

  /** Retire la clé de tout texte destiné à un message ou au journal. */
  masquer(texte: string): string {
    const { cle } = this.options;
    return cle ? texte.split(cle).join("***") : texte;
  }

  private async appeler(methode: "GET" | "POST", chemin: string, corps?: unknown): Promise<unknown> {
    let reponse: Response;
    try {
      reponse = await this.fetch(`${this.url}${chemin}`, {
        method: methode,
        headers: { "api-key": this.options.cle, accept: "application/json", ...(corps ? { "content-type": "application/json" } : {}) },
        body: corps ? JSON.stringify(corps) : undefined,
        signal: AbortSignal.timeout(this.delaiMs),
      });
    } catch (e) {
      const nom = e instanceof Error ? e.name : "";
      throw new ServiceUnavailable("emailing", { cause: nom === "TimeoutError" || nom === "AbortError" ? "delai" : "reseau" });
    }
    const texte = await reponse.text().catch(() => "");
    let donnees: Record<string, unknown> = {};
    try {
      donnees = texte ? (JSON.parse(texte) as Record<string, unknown>) : {};
    } catch {
      donnees = {};
    }
    if (reponse.ok) return donnees;

    const code = typeof donnees.code === "string" ? donnees.code : "";
    const message = this.masquer(typeof donnees.message === "string" ? donnees.message : "").slice(0, 300);
    if (reponse.status === 401 || reponse.status === 403) throw new ConfigurationIncomplete("emailing", ["EMAILING_API_KEY"]);
    if (reponse.status === 402 || code === "not_enough_credits") throw new ServiceUnavailable("emailing", { cause: "quota", statut: reponse.status });
    if (reponse.status === 400 && code === "invalid_parameter" && /email/i.test(message)) {
      throw new OperationRefusee("Adresse email invalide.", { cause: "adresse_invalide", detail: message });
    }
    if (reponse.status === 404) throw new ServiceUnavailable("emailing", { cause: "introuvable", statut: 404, detail: message });
    throw new ServiceUnavailable("emailing", { statut: reponse.status, code, detail: message });
  }

  /** Envoie un email transactionnel ; renvoie l'identifiant du message chez Brevo. */
  async envoyer(corps: CorpsEnvoi): Promise<string> {
    const r = (await this.appeler("POST", "/smtp/email", corps)) as { messageId?: unknown };
    if (typeof r.messageId !== "string" || !r.messageId) throw new ServiceUnavailable("emailing", { cause: "reponse_inattendue" });
    return r.messageId;
  }

  /** Événements des emails transactionnels, filtrés par message ou par étiquette. */
  async evenements(filtre: { messageId?: string; tags?: string; jours: number }): Promise<EvenementBrevo[]> {
    const tous: EvenementBrevo[] = [];
    for (let page = 0; page < PAGES_MAX; page++) {
      const p = new URLSearchParams({ limit: String(PAGE), offset: String(page * PAGE), days: String(filtre.jours), sort: "asc" });
      if (filtre.messageId) p.set("messageId", filtre.messageId);
      if (filtre.tags) p.set("tags", filtre.tags);
      const r = (await this.appeler("GET", `/smtp/statistics/events?${p.toString()}`)) as { events?: EvenementBrevo[] };
      const lot = Array.isArray(r.events) ? r.events : [];
      tous.push(...lot);
      if (lot.length < PAGE) break;
    }
    return tous;
  }

  /** Crée ou met à jour un contact (reflet des consentements, R9). */
  async contact(corps: { email: string; attributes: Record<string, boolean> }): Promise<void> {
    await this.appeler("POST", "/contacts", { ...corps, updateEnabled: true });
  }
}
