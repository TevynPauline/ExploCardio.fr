import { createHmac, timingSafeEqual } from "node:crypto";

// Protection des formulaires sans service tiers (FR-032, R6) : horodatage signé (délai minimal
// entre l'affichage et l'envoi) et champ piège invisible.

export const CHAMP_PIEGE = "site_web";

function signer(valeur: string): string {
  return createHmac("sha256", `formulaire:${process.env.AUTH_SECRET ?? ""}`).update(valeur).digest("base64url");
}

export function jetonAffichage(maintenant = Date.now()): string {
  return `${maintenant}.${signer(String(maintenant))}`;
}

export type VerdictRobot = "ok" | "trop-rapide" | "suspect";

export function verifierEnvoi(jeton: string, piege: string, delaiMinimalMs: number, maintenant = Date.now()): VerdictRobot {
  if (piege.trim()) return "suspect";
  const [horodatage, sig] = jeton.split(".");
  if (!horodatage || !sig) return "suspect";
  const attendue = Buffer.from(signer(horodatage));
  const recue = Buffer.from(sig);
  if (attendue.length !== recue.length || !timingSafeEqual(attendue, recue)) return "suspect";
  return maintenant - Number(horodatage) < delaiMinimalMs ? "trop-rapide" : "ok";
}
