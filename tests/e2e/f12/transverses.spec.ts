import { expect, test } from "@playwright/test";
import { COMPTES, connecterNavigateur } from "../session";
import { acheterHolterCloud, clientConnecte } from "./outils";

// T027 : pages de F12 de 320 à 1 920 px sans défilement horizontal.

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

test("pages client de F12", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await acheterHolterCloud(page, c.email);
  await page.goto("/holter-ecg");
  const fiche = new URL((await page.locator("main").getByRole("link", { name: /CardioScan Holter ECG/ }).first().getAttribute("href"))!, "http://x").pathname;
  expect(await sansDefilement(page, ["/mon-compte/logiciels", "/services/hebergement-donnees-sante", "/demo/plateforme-cloud", fiche])).toEqual([]);
});

test("back-office de F12", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  expect(await sansDefilement(page, ["/admin/logiciels-cloud?q=demo", "/admin/devis", "/admin/demonstration/pannes", "/admin/contenus/coordonnees"])).toEqual([]);
});
