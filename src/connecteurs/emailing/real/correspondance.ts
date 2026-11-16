import { createHash } from "node:crypto";
import type { SuiviEnvoi } from "../interfaces";

// Correspondances entre Brevo et le contrat du connecteur emailing (F25, research R3 et R6).

/** Événement de l'API « statistiques des emails transactionnels » de Brevo. */
export type EvenementBrevo = {
  event: string;
  date: string;
  messageId?: string;
  reason?: string;
  tag?: string;
};

/** Étiquette d'idempotence : aucune donnée personnelle, seulement l'empreinte de la clé. */
export function etiquetteCle(cle: string): string {
  return `cle:${createHash("sha256").update(cle).digest("hex").slice(0, 32)}`;
}

const REJET_DEFINITIF = new Set(["hardbounce", "hardbounces", "invalid", "blocked", "error"]);
const REJET_TEMPORAIRE = new Set(["softbounce", "softbounces", "bounces"]);
const REMIS = new Set(["delivered"]);
const OUVERT = new Set(["opened", "uniqueopened", "proxyopen", "loadedbyproxy"]);
const PLAINTE = new Set(["spam", "unsubscribed"]);

const MOTIFS: Record<string, string> = {
  hardbounce: "Adresse inexistante ou refusée",
  hardbounces: "Adresse inexistante ou refusée",
  invalid: "Adresse invalide",
  blocked: "Adresse bloquée par l'outil d'envoi",
  error: "Erreur de l'outil d'envoi",
  softbounce: "Rejet temporaire (boîte pleine ou serveur indisponible)",
  softbounces: "Rejet temporaire (boîte pleine ou serveur indisponible)",
  bounces: "Rejet temporaire",
};

/** Suivi d'un envoi à partir de ses événements ; `null` s'il n'y en a aucun. Rejet > remis > envoyé. */
export function suiviDepuisEvenements(evenements: readonly EvenementBrevo[]): SuiviEnvoi | null {
  if (!evenements.length) return null;
  const tries = [...evenements].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const nom = (e: EvenementBrevo) => e.event.toLowerCase();

  const ouverture = tries.find((e) => OUVERT.has(nom(e)));
  const plainte = tries.some((e) => PLAINTE.has(nom(e)));
  const definitif = tries.find((e) => REJET_DEFINITIF.has(nom(e)));
  const temporaire = tries.find((e) => REJET_TEMPORAIRE.has(nom(e)));
  const remis = tries.some((e) => REMIS.has(nom(e)));
  const ouvertLe = ouverture ? new Date(ouverture.date) : null;

  const rejet = definitif ?? (remis ? undefined : temporaire);
  if (rejet) {
    const motif = MOTIFS[nom(rejet)] ?? "Rejeté";
    return {
      etat: "rejete",
      ouvertLe: null,
      motifRejet: rejet.reason ? `${motif} : ${rejet.reason}`.slice(0, 300) : motif,
      rejetDefinitif: Boolean(definitif),
      plainte,
    };
  }
  return { etat: remis || ouvertLe ? "remis" : "envoye", ouvertLe, motifRejet: null, rejetDefinitif: false, plainte };
}
