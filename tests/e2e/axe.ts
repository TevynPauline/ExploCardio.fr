import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** Vérifie la page avec axe-core aux niveaux WCAG 2.2 A et AA (principe VIII). */
export async function verifierAccessibilite(page: Page) {
  const resultat = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(resultat.violations, JSON.stringify(resultat.violations, null, 2)).toEqual([]);
}
