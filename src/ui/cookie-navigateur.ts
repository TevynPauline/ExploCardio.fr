"use client";

import { useSyncExternalStore } from "react";
import { COOKIE_CONSENTEMENT, lireChoix, type ChoixConsentement } from "@/domaine/consentement";

// Lecture du choix de consentement dans le navigateur, synchronisée entre composants.

export const EVENEMENT_CHOIX = "ec:choix-cookies";

function valeurCookie(): string {
  return (
    document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${COOKIE_CONSENTEMENT}=`))
      ?.slice(COOKIE_CONSENTEMENT.length + 1) ?? ""
  );
}

function abonner(rappel: () => void) {
  window.addEventListener(EVENEMENT_CHOIX, rappel);
  return () => window.removeEventListener(EVENEMENT_CHOIX, rappel);
}

/** Valeur brute du cookie ; `null` pendant le rendu serveur (choix encore inconnu). */
export function useValeurConsentement(): string | null {
  return useSyncExternalStore(abonner, valeurCookie, () => null);
}

export function useChoixConsentement(): { connu: boolean; choix: ChoixConsentement | null } {
  const valeur = useValeurConsentement();
  return { connu: valeur !== null, choix: valeur ? lireChoix(valeur) : null };
}

export function enregistrerCookie(entree: string) {
  document.cookie = entree;
  window.dispatchEvent(new Event(EVENEMENT_CHOIX));
}
