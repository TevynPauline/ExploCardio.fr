import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { requete } from "../bases";
import { COMPTES, connecterNavigateur } from "../session";
import { defileHorizontalement } from "./outils";

// T015 — accueil (F16, US4, FR-009 à FR-011, FR-014) : ordre des sections, sections retirées,
// « Pourquoi préférer ExploCardio.fr » modifiable au back-office.

test.describe.configure({ timeout: 180_000 });

test("ordre des sections ; ni Équipement, ni Actualités, ni offre de bienvenue en section", async ({ page }) => {
  await page.goto("/");
  const sections = await page.locator("[data-section]").evaluateAll((els) => els.map((e) => e.getAttribute("data-section")));
  expect(sections).toEqual(["carrousel", "acces-rapide", "pourquoi", "service-fidelite", "offre-digitale", "contact"]);
  const pourquoi = page.locator("[data-section=pourquoi]");
  await expect(pourquoi.getByRole("heading", { level: 2 })).toHaveText("Pourquoi préférer ExploCardio.fr");
  await expect(pourquoi.getByRole("heading", { level: 3 })).toHaveCount(4);
  await expect(page.locator("[data-section=contact]")).not.toContainText("Régis Andrieu");
  await verifierAccessibilite(page);
  for (const largeur of [320, 1920]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto("/");
    expect(await defileHorizontalement(page), `${largeur} px`).toBe(false);
  }
});

test("un argument modifié au back-office apparaît sur l'accueil", async ({ page, context }) => {
  const [avant] = await requete<{ titre: string }>("site", `SELECT titre FROM contenu WHERE type = 'argument' AND cle = '2'`);
  await connecterNavigateur(context, COMPTES.admin);
  try {
    await page.goto("/admin/contenus/accueil");
    await page.getByLabel("Titre (60 caractères au plus)").nth(1).fill("Des prix HT clairs (essai)");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.locator("main").getByRole("status")).toContainText("Arguments enregistrés");
    await expect
      .poll(async () => {
        await page.goto("/");
        return page.locator("[data-section=pourquoi]").innerText();
      }, { timeout: 60_000 })
      .toContain("Des prix HT clairs (essai)");
  } finally {
    await requete("site", `UPDATE contenu SET titre = $1 WHERE type = 'argument' AND cle = '2'`, [avant!.titre]);
    await page.goto("/admin/contenus/accueil");
    await page.getByRole("button", { name: "Enregistrer" }).click();
  }
});
