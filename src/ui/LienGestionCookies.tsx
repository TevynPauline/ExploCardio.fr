"use client";

import Link from "next/link";
import { FINALITES } from "@/domaine/consentement";
import { EVENEMENT_GESTION } from "./PanneauCookies";

/**
 * « Gestion des cookies » (FR-035) : rouvre le panneau de choix si des usages sont soumis au
 * consentement ; sinon mène à la page Cookies qui décrit les cookies nécessaires.
 */
export function LienGestionCookies() {
  const classe = "inline-flex min-h-11 min-w-11 items-center text-white underline-offset-2 hover:underline";
  if (FINALITES.length === 0) {
    return (
      <Link href="/cookies" className={classe}>
        Gestion des cookies
      </Link>
    );
  }
  return (
    <button type="button" className={classe} onClick={() => window.dispatchEvent(new Event(EVENEMENT_GESTION))}>
      Gestion des cookies
    </button>
  );
}
