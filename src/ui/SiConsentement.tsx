"use client";

import type { ReactNode } from "react";
import { accepte } from "@/domaine/consentement";
import { useChoixConsentement } from "./cookie-navigateur";

/**
 * N'affiche un contenu tiers (vidéo, mesure d'audience…) qu'après accord de sa finalité
 * (FR-034). Tout futur traceur DOIT passer par ce composant.
 */
export function SiConsentement({ finalite, children, sinon = null }: { finalite: string; children: ReactNode; sinon?: ReactNode }) {
  const { choix } = useChoixConsentement();
  return <>{accepte(choix, finalite) ? children : sinon}</>;
}
