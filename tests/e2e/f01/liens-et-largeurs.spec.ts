import { expect, test } from "@playwright/test";
import { PAGES_F01 } from "./outils";

// T033 (SC-006, SC-012, FR-046).

test("SC-012 : aucun lien de l'en-tête, de l'accueil ou du pied de page ne mène à une erreur", async ({ page, request }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const internes = new Set<string>();
  const recolter = async () => {
    for (const href of await page.locator("a[href^='/']").evaluateAll((els) => els.map((e) => e.getAttribute("href")!))) internes.add(href.split("#")[0]!);
  };
  await recolter();
  // Contenu des méga-menus
  for (const bouton of await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("button").all()) {
    await bouton.click();
    await recolter();
    await page.keyboard.press("Escape");
  }
  const fautes: string[] = [];
  for (const lien of internes) {
    const r = await request.get(lien || "/");
    if (r.status() >= 400) fautes.push(`${lien} → ${r.status()}`);
  }
  expect(fautes).toEqual([]);
  expect(internes.size).toBeGreaterThan(20);
});

test("SC-006 : aucune page de F01 ne défile horizontalement de 320 à 1 920 px", async ({ page }) => {
  test.setTimeout(240_000);
  const fautes: string[] = [];
  for (const largeur of [320, 390, 820, 1280, 1920]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    for (const chemin of PAGES_F01) {
      await page.goto(chemin);
      const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (deborde) fautes.push(`${chemin} à ${largeur} px`);
    }
  }
  expect(fautes).toEqual([]);
});

test("zoom du texte à 200 % : rien ne déborde sur l'accueil", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(deborde).toBe(false);
});
