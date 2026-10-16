import type { Page } from "@playwright/test";
import { ETAT_ACCES } from "../acces-global";
import { requete } from "../bases";

export { ETAT_ACCES, requete };

/** Pages publiques de F01 (contracts/pages-et-liens.md). */
export const PAGES_F01 = [
  "/",
  "/catalogue",
  "/holter-ecg",
  "/holter-ecg/ecg-de-repos",
  "/holter-tensionnel",
  "/epreuve-effort",
  "/accessoires-consommables",
  "/services",
  "/services/hebergement-donnees-sante",
  "/services/assistance",
  "/financement",
  "/mise-a-disposition",
  "/qui-sommes-nous",
  "/recherche?q=oscar",
  "/panier",
  "/mentions-legales",
  "/cgv",
  "/cgu",
  "/confidentialite",
  "/cookies",
];

export async function estOrdinateur(page: Page) {
  return (page.viewportSize()?.width ?? 0) >= 1280;
}
