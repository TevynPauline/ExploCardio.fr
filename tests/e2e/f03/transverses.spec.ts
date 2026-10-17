import { expect, test } from "@playwright/test";
import { CATEGORIES } from "./outils";

// T043 (SC-005, SC-011, SC-012) : pages de F03 de 320 à 1 920 px, liens du catalogue,
// jamais « prix sur demande ».

test.describe.configure({ timeout: 300_000 });

const FICHES = [
  "/holter-ecg/dms-300-4l",
  "/holter-tensionnel/suntech-oscar-2",
  "/epreuve-effort/koch-evolution-korele-8000",
  "/holter-ecg/ecg-de-repos/dms-cardioscan-resting-12-derivations",
  "/accessoires-consommables/electrodes-holter",
  "/accessoires-consommables/suntech-brassard-mapa-orbit",
];
const PAGES_F03 = [...CATEGORIES.map((c) => c.chemin), ...FICHES, "/services/installation-formation", "/panier"];

test("SC-011 : aucune page de F03 ne défile horizontalement de 320 à 1 920 px", async ({ page }) => {
  const fautes: string[] = [];
  for (const largeur of [320, 390, 820, 1280, 1920]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    for (const chemin of PAGES_F03) {
      await page.goto(chemin);
      if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) fautes.push(`${chemin} à ${largeur} px`);
    }
  }
  expect(fautes).toEqual([]);
});

test("SC-012 et SC-005 : aucun lien du catalogue ne mène à une erreur ; jamais « prix sur demande »", async ({ page, request }) => {
  const liens = new Set<string>();
  const fautes: string[] = [];
  for (const chemin of [...CATEGORIES.map((c) => c.chemin), ...FICHES]) {
    await page.goto(chemin);
    if (/prix sur demande/i.test(await page.locator("main").innerText())) fautes.push(`« prix sur demande » sur ${chemin}`);
    for (const href of await page.locator("main a[href^='/']").evaluateAll((els) => els.map((e) => e.getAttribute("href")!))) liens.add(href.split("#")[0]!);
  }
  for (const lien of liens) {
    const r = await request.get(lien);
    if (r.status() >= 400) fautes.push(`${lien} → ${r.status()}`);
  }
  expect(fautes).toEqual([]);
  expect(liens.size).toBeGreaterThan(30);
});
