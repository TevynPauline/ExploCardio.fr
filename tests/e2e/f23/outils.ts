import { expect, type Page } from "@playwright/test";

// Outils des tests F23 : organisation de l'accueil par l'écran du back-office.

export type Place = { bloc: string; affiche: boolean };

export const ORGANISATION_DEPART: Place[] = [
  { bloc: "animation", affiche: true },
  { bloc: "gammes", affiche: true },
  { bloc: "pourquoi", affiche: true },
  { bloc: "offre-digitale", affiche: false },
  { bloc: "offres", affiche: true },
];

const ordreAffiche = (page: Page) => page.locator("li[data-bloc]").evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.bloc!));

/** Ordonne et coche les blocs avec les boutons de l'écran, puis enregistre (session admin requise). */
export async function organiser(page: Page, cible: Place[], attendu: string | null = "Organisation de l’accueil enregistrée") {
  await page.goto("/admin/contenus/organisation");
  for (const [i, p] of cible.entries()) {
    for (;;) {
      const position = (await ordreAffiche(page)).indexOf(p.bloc);
      if (position <= i) break;
      await page.locator(`li[data-bloc="${p.bloc}"]`).getByRole("button", { name: /^Monter/ }).click();
    }
  }
  expect(await ordreAffiche(page)).toEqual(cible.map((p) => p.bloc));
  for (const p of cible) await page.locator(`li[data-bloc="${p.bloc}"]`).getByLabel("Affiché sur l’accueil").setChecked(p.affiche);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  if (attendu) await expect(page.getByText(attendu)).toBeVisible({ timeout: 90_000 });
}

/** Ordre des blocs déplaçables rendus sur l'accueil public. */
export const blocsAccueil = (page: Page) =>
  page.locator("main [data-section]").evaluateAll((els) =>
    els.map((e) => (e as HTMLElement).dataset.section!).filter((s) => s !== "contact"),
  );
