import { createHmac, timingSafeEqual } from "node:crypto";
import { lireParametreEntier } from "@/lib/parametres";

// Fermeture des sessions de l'équipe inactives (F13, D5, FR-025) : à chaque page du back-office,
// le proxy relit l'heure de la dernière activité (cookie signé, lié à la session) ; au-delà du
// délai (« securite.inactivite_minutes », 30 par défaut), la session est fermée.

export const COOKIE_ACTIVITE = "ec_activite";
export const COOKIES_SESSION = ["__Secure-better-auth.session_token", "better-auth.session_token"];

function signer(texte: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET est absent : impossible de signer l'activité.");
  return createHmac("sha256", `activite:${secret}`).update(texte).digest("base64url");
}

/** Empreinte courte de la session : une nouvelle connexion repart d'une activité neuve. */
function empreinte(session: string): string {
  return signer(`session:${session}`).slice(0, 16);
}

export function valeurActivite(session: string, maintenant = Date.now()): string {
  const corps = `${maintenant}.${empreinte(session)}`;
  return `${corps}.${signer(corps)}`;
}

/** Heure de la dernière activité de cette session, ou `null` (cookie absent, altéré, autre session). */
export function derniereActivite(valeur: string | undefined, session: string): number | null {
  if (!valeur) return null;
  const [instant, e, sig] = valeur.split(".");
  if (!instant || !e || !sig || e !== empreinte(session)) return null;
  const attendue = Buffer.from(signer(`${instant}.${e}`));
  const recue = Buffer.from(sig);
  if (attendue.length !== recue.length || !timingSafeEqual(attendue, recue)) return null;
  const n = Number(instant);
  return Number.isFinite(n) ? n : null;
}

export function estInactive(derniere: number | null, maintenant: number, delaiMinutes: number): boolean {
  return derniere !== null && maintenant - derniere > delaiMinutes * 60_000;
}

let cache: { minutes: number; lu: number } | null = null;

/** Délai d'inactivité en minutes (relu toutes les 10 secondes). */
export async function delaiInactivite(): Promise<number> {
  if (cache && Date.now() - cache.lu < 10_000) return cache.minutes;
  cache = { minutes: await lireParametreEntier("securite.inactivite_minutes", 30), lu: Date.now() };
  return cache.minutes;
}
