import { lireJeton } from "./jetons";
import { changerPreference, desabonnerNewsletter, type OrigineConsentement, type TypePreference } from "./preferences";

// Désinscription sans connexion (F10, FR-011, FR-013, FR-023) : newsletter ou un type d'email de
// service, désigné par le lien signé. Effet immédiat, y compris sur les envois déjà programmés
// (ils sont réévalués au moment de partir).

const TYPES: readonly TypePreference[] = ["reapprovisionnement", "panierAbandonne", "alerteBons", "alerteDroits"];

export function objetConnu(objet: string): objet is "newsletter" | TypePreference {
  return objet === "newsletter" || (TYPES as readonly string[]).includes(objet);
}

export async function executerDesinscription(jeton: string, objet: string, origine: OrigineConsentement): Promise<boolean> {
  const email = lireJeton(jeton);
  if (!email || !objetConnu(objet)) return false;
  if (objet === "newsletter") await desabonnerNewsletter(email, origine);
  else await changerPreference(email, objet, false, origine);
  return true;
}
