import { createHmac, timingSafeEqual } from "node:crypto";

// Liens de préférences et de désinscription sans connexion (F10, D8) : l'adresse signée par
// HMAC-SHA256, sans expiration. La clé est dérivée d'AUTH_SECRET : elle ne sert qu'à cela.

function cle(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET est absente : impossible de signer les liens de préférences.");
  return createHmac("sha256", secret).update("explocardio:preferences-email").digest();
}

function signature(adresse: string): string {
  return createHmac("sha256", cle()).update(adresse).digest("base64url");
}

export function signerJeton(email: string): string {
  const adresse = email.trim().toLowerCase();
  return `${Buffer.from(adresse).toString("base64url")}.${signature(adresse)}`;
}

/** Adresse du jeton, ou null s'il est falsifié ou mal formé. */
export function lireJeton(jeton: string): string | null {
  const [partie, sig] = jeton.split(".");
  if (!partie || !sig) return null;
  const adresse = Buffer.from(partie, "base64url").toString("utf8");
  const attendue = Buffer.from(signature(adresse));
  const recue = Buffer.from(sig);
  if (attendue.length !== recue.length || !timingSafeEqual(attendue, recue)) return null;
  return adresse;
}
