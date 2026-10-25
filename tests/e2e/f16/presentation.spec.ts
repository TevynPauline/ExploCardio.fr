import { expect, test } from "@playwright/test";
import { requete } from "../bases";
import { ELECTRODES, HOLTER, ajouterDepuisFiche } from "../f04/outils";

// T021 — présentation (F16, US9, FR-028, FR-030, FR-031, SC-009) : signature sans « (hors
// imagerie) », bloc contact sans le fondateur, mention « France métropolitaine ».

test.describe.configure({ timeout: 180_000 });

test("aucune page ne mentionne « hors imagerie » ; le fondateur reste sur Qui sommes-nous", async ({ page }) => {
  for (const chemin of ["/", "/catalogue", "/holter-ecg", HOLTER, "/services", "/qui-sommes-nous", "/cgv", "/aide"]) {
    await page.goto(chemin);
    expect(await page.locator("body").innerText(), chemin).not.toMatch(/hors imagerie/i);
    expect(await page.title()).not.toMatch(/hors imagerie/i);
  }
  await page.goto("/");
  await expect(page.locator("[data-section=contact]")).not.toContainText("Régis Andrieu");
  await page.goto("/qui-sommes-nous");
  await expect(page.locator("main")).toContainText("Régis Andrieu");
});

test("les emails envoyés n'ont plus « hors imagerie » dans leur signature", async () => {
  const recents = await requete<{ rendu: string }>("site", `SELECT rendu FROM message_demonstration WHERE date > now() - interval '1 day' ORDER BY date DESC LIMIT 20`);
  for (const m of recents) expect(m.rendu).not.toMatch(/hors imagerie/i);
});

test("mention « France métropolitaine » avec contact : fiche, panier, conditions de vente", async ({ page }) => {
  await page.goto(HOLTER);
  const mention = (p = page) => p.locator("main").getByText(/Livraison en France métropolitaine \(Corse comprise\)/);
  await expect(mention()).toBeVisible();
  await expect(page.locator("main").getByRole("link", { name: "contactez-nous" }).first()).toHaveAttribute("href", /qui-sommes-nous.*#contact/);
  await ajouterDepuisFiche(page, ELECTRODES);
  await page.goto("/panier");
  await expect(mention()).toBeVisible();
  await page.goto("/cgv");
  await expect(page.locator("main")).toContainText("réservée aux livraisons en France métropolitaine");
});
