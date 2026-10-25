import type { Page } from "@playwright/test";

// Outils communs des parcours de F16.

/** Vrai si la page défile horizontalement (contenu plus large que la fenêtre). */
export async function defileHorizontalement(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

/** Boîte d'un élément (lève une erreur s'il n'est pas affiché). */
export async function boite(page: Page, selecteur: ReturnType<Page["locator"]>) {
  const b = await selecteur.boundingBox();
  if (!b) throw new Error("Élément non affiché");
  return b;
}
