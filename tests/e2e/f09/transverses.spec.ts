import { expect, test } from "@playwright/test";
import { COMPTES, connecterNavigateur } from "../session";

// T020 : pages de F09 de 320 à 1 920 px sans défilement horizontal.

test.describe.configure({ timeout: 300_000 });

async function sansDefilement(page: import("@playwright/test").Page, chemins: string[]) {
  const fautes: string[] = [];
  for (const largeur of [320, 390, 820, 1280, 1920]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    for (const chemin of chemins) {
      await page.goto(chemin);
      if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) fautes.push(`${chemin} à ${largeur} px`);
    }
  }
  return fautes;
}

test("pages publiques de F09", async ({ page }) => {
  expect(await sansDefilement(page, ["/aide", "/aide/poser-un-holter-dms-300-4l", "/aide?theme=materiel", "/services/assistance", "/demo/contact?moyen=whatsapp"])).toEqual([]);
});

test("back-office de F09", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  expect(await sansDefilement(page, ["/admin/contenus/aide", "/admin/contenus/aide/nouveau", "/admin/contenus/coordonnees"])).toEqual([]);
});
