import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/**
 * Vérifie la page avec axe-core aux niveaux WCAG 2.2 A et AA (principe VIII). Les aperçus
 * d'emails (iframes isolées, sans script) en sont exclus : axe ne peut pas s'y exécuter ; les
 * emails ont leur propre contrôle (tests/unit/emailing/modeles.test.ts).
 */
export async function verifierAccessibilite(page: Page) {
  // F20 : l'animation d'ouverture de l'accueil fait passer ses textes par des fondus ; un contrôle
  // lancé en plein fondu les verrait à moitié transparents. On la mène à son terme (bandeau
  // compact) avant le contrôle ; une animation figée par le test (en pause) n'est pas touchée.
  const scene = page.locator("[data-section=trois-temps]");
  if (await scene.count()) {
    const enCours = await scene.evaluate((s) => {
      const animations = s.getAnimations({ subtree: true }).filter((a) => a.playState === "running");
      for (const a of animations) a.finish();
      return animations.length > 0;
    });
    // Fin de l'animation : fondu de sortie, puis bandeau compact et son fondu d'apparition.
    if (enCours) {
      await expect
        .poll(
          () => scene.evaluate((s) => s.hasAttribute("data-compact") && s.getAnimations({ subtree: true }).every((a) => a.playState !== "running")),
          { timeout: 5_000 },
        )
        .toBe(true);
    }
  }
  // F23 : les schémas des cartes « Pourquoi choisir » apparaissent en fondu à l'entrée à l'écran ;
  // on les amène à leur état final avant le contrôle.
  await page.evaluate(() => {
    for (const carte of document.querySelectorAll<HTMLElement>(".pq-carte")) {
      carte.dataset.visible = "";
      for (const a of carte.getAnimations({ subtree: true })) a.finish();
    }
  });
  const resultat = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .exclude("iframe[sandbox]")
    .analyze();
  expect(resultat.violations, JSON.stringify(resultat.violations, null, 2)).toEqual([]);
}
