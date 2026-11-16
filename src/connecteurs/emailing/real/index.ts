import { NotFound } from "../../erreurs";
import { implementationRefusee } from "../../non-livre";
import type { ConnecteurEmailing, EmailClient, NotificationEquipe, SuiviEnvoi } from "../interfaces";
import { ClientBrevo, type CorpsEnvoi } from "./client";
import { etiquetteCle, suiviDepuisEvenements } from "./correspondance";
import { creerGardeRecette, listeIgnoreeEnProduction } from "@/lib/garde-recette-emailing";

// Mode réel du connecteur emailing : Brevo (F25, contracts/emailing-reel.md). Configuration
// incomplète → chaque opération lève ConfigurationIncomplete, sans jamais basculer en
// démonstration (FR-003). Seuls l'adresse, l'objet, le rendu, le texte et des étiquettes
// techniques sont transmis (FR-009).

type Env = Record<string, string | undefined>;

/** Expéditeur vérifié dans Brevo le 2026-11-14 (FR-005) ; les réponses vont à la même boîte. */
export const EXPEDITEUR = { name: "ExploCardio.fr", email: "contact@explocardio.fr" } as const;
const JOURS_SUIVI = 7;

let signale = false;

function echapper(texte: string): string {
  return texte.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export function creerEmailingReel(variablesManquantes: string[], env: Env = process.env, options: { fetch?: typeof fetch } = {}): ConnecteurEmailing {
  if (variablesManquantes.length) return implementationRefusee<ConnecteurEmailing>("emailing", variablesManquantes);

  if (listeIgnoreeEnProduction(env) && !signale) {
    signale = true;
    console.error("[emailing] EMAILING_ADRESSES_AUTORISEES est renseignée sur le site public : elle est ignorée (FR-017).");
  }
  const garde = creerGardeRecette(env);
  const client = new ClientBrevo({ cle: env.EMAILING_API_KEY!, fetch: options.fetch });
  // Envois faits par ce processus : couvre une reprise immédiate, avant que Brevo n'expose
  // l'événement de l'étiquette (R3), et le suivi d'un envoi encore sans événement.
  const recents = new Map<string, string>();
  const emis = new Set<string>();

  /** Envoi idempotent : un email déjà parti avec cette clé n'est pas renvoyé (R3). */
  async function envoyer(corps: Omit<CorpsEnvoi, "sender" | "replyTo" | "tags">, cle: string, etiquettes: string[]): Promise<string> {
    for (const d of corps.to) garde.verifier(d.email);
    const etiquette = etiquetteCle(cle);
    const memo = recents.get(etiquette);
    if (memo) return memo;
    const deja = (await client.evenements({ tags: etiquette, jours: JOURS_SUIVI })).find((e) => e.messageId)?.messageId;
    const messageId = deja ?? (await client.envoyer({ ...corps, sender: { ...EXPEDITEUR }, replyTo: { ...EXPEDITEUR }, tags: [etiquette, ...etiquettes] }));
    if (recents.size > 5000) recents.clear();
    recents.set(etiquette, messageId);
    emis.add(messageId);
    return messageId;
  }

  return {
    async envoyerEmail(email: EmailClient, cle: string) {
      const enTetes =
        email.famille !== "transactionnel" && email.desinscription
          ? { "List-Unsubscribe": `<${email.desinscription}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
          : undefined;
      const envoiId = await envoyer(
        { to: [{ email: email.destinataire }], subject: email.objet, htmlContent: email.rendu, textContent: email.texte, ...(enTetes ? { headers: enTetes } : {}) },
        cle,
        [`famille:${email.famille}`, `modele:${email.modele}`],
      );
      return { envoiId };
    },

    async envoyerNotificationEquipe(n: NotificationEquipe, cle: string) {
      // Les SMS (F19) ne sont pas encore branchés : la notification part par email (FR-015).
      if (n.canal === "sms") console.warn(`[emailing] notification SMS « ${n.declencheur} » envoyée par email (SMS non branchés).`);
      const objet = `${n.canal === "sms" ? "[SMS] " : ""}${n.objet ?? "Notification"}`;
      const html = `<p>${echapper(n.texte).replace(/\n/g, "<br>")}</p>`;
      let premier: string | null = null;
      for (const d of n.destinataires) {
        const id = await envoyer({ to: [{ email: d }], subject: objet, htmlContent: html, textContent: n.texte }, `${cle}:${d.toLowerCase()}`, ["famille:equipe"]);
        premier ??= id;
      }
      return { envoiId: premier ?? "" };
    },

    async mettreAJourContact(contact: { email: string; consentements: Record<string, boolean> }) {
      const attributes = Object.fromEntries(Object.entries(contact.consentements).map(([k, v]) => [k.toUpperCase(), Boolean(v)]));
      await client.contact({ email: contact.email, attributes });
    },

    async lireSuivi(envoiId: string): Promise<SuiviEnvoi> {
      const suivi = suiviDepuisEvenements(await client.evenements({ messageId: envoiId, jours: JOURS_SUIVI }));
      if (!suivi) {
        // Tout juste envoyé par ce processus : Brevo n'a pas encore d'événement.
        if (emis.has(envoiId)) return { etat: "envoye", ouvertLe: null, motifRejet: null, rejetDefinitif: false, plainte: false };
        throw new NotFound("Envoi", envoiId);
      }
      return suivi;
    },
  };
}
