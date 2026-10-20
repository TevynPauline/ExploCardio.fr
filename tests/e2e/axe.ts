import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/**
 * Vérifie la page avec axe-core aux niveaux WCAG 2.2 A et AA (principe VIII). Les aperçus
 * d'emails (iframes isolées, sans script) en sont exclus : axe ne peut pas s'y exécuter ; les
 * emails ont leur propre contrôle (tests/unit/emailing/modeles.test.ts).
 */
export async function verifierAccessibilite(page: Page) {
  const resultat = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .exclude("iframe[sandbox]")
    .analyze();
  expect(resultat.violations, JSON.stringify(resultat.violations, null, 2)).toEqual([]);
}
