import { createHmac, timingSafeEqual } from "node:crypto";

// Signature de démonstration des événements de paiement : vérifiée par l'implémentation
// `demo` comme Stripe vérifie les siennes. Elle dérive du secret du site, jamais d'une clé Stripe.

function secret(): string {
  const base = process.env.AUTH_SECRET;
  if (!base) throw new Error("AUTH_SECRET est absent : impossible de signer les événements de démonstration.");
  return `paiement-demo:${base}`;
}

export function signer(contenu: string): string {
  return createHmac("sha256", secret()).update(contenu).digest("hex");
}

export function signatureValide(contenu: string, signature: string): boolean {
  const attendue = Buffer.from(signer(contenu), "hex");
  const recue = Buffer.from(signature, "hex");
  return attendue.length === recue.length && timingSafeEqual(attendue, recue);
}
