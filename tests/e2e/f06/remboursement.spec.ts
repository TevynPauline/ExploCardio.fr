import { expect, test, type Browser } from "@playwright/test";
import { CARTE_SD, PANIER_1200, clientConnecte, commandesDe, composerPanier, ecranDemo, payerParCarte } from "./outils";

// T019 (US4, FR-017, FR-018, SC-003) : commande remboursée → bons et droits qu'elle avait
// apportés retirés ; commande payée en bons, remboursée → bons rendus avec leur validité d'origine.

test.describe.configure({ timeout: 240_000 });

async function rembourserTout(browser: Browser, baseURL: string | undefined, ref: string, montantTtc: number) {
  await ecranDemo(browser, baseURL, "/admin/demonstration/paiements", async (admin) => {
    const ligne = admin.getByRole("listitem", { name: `Commande ${ref}` });
    await ligne.getByLabel(`Montant à rembourser (${ref}, € TTC)`).fill((montantTtc / 100).toFixed(2).replace(".", ","));
    await ligne.getByRole("button", { name: "Décider un remboursement" }).click();
    await expect(admin.getByRole("status").filter({ hasText: "avoir émis" })).toBeVisible();
  });
}

test("commande de 1 200 € remboursée : 120 € de bons et droits retirés", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await composerPanier(page, c.email, PANIER_1200);
  await payerParCarte(page);
  const [commande] = await commandesDe(c.partenaireRef);
  await rembourserTout(browser, baseURL, commande!.ref, commande!.montant);

  await page.goto("/mon-compte/bons-achat");
  await expect(page.getByRole("row", { name: new RegExp(`Retrait.*${commande!.ref}`) })).toBeVisible();
  await expect(page.locator("main")).toContainText("0,00 € HT");
  await page.goto("/mon-compte/assistance");
  await expect(page.locator("main")).toContainText("Pas de droits d’assistance en cours");
  await expect(page.locator("main")).toContainText("Retrait le");
});

test("commande payée en bons, remboursée : bons rendus avec leur validité d'origine (SC-003)", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await composerPanier(page, c.email, PANIER_1200);
  await payerParCarte(page);
  await composerPanier(page, c.email, { [CARTE_SD]: 4 });
  await page.goto("/panier");
  const bons = page.getByRole("region", { name: "Bons d’achat" });
  await bons.getByLabel(/Montant à utiliser/).fill("50,00");
  await bons.getByRole("button", { name: "Utiliser mes bons" }).click();
  await expect(bons.getByRole("status")).toContainText("50,00 € HT de bons appliqués");
  await payerParCarte(page);
  const [, payeeEnBons] = await commandesDe(c.partenaireRef);
  await rembourserTout(browser, baseURL, payeeEnBons!.ref, payeeEnBons!.montant);

  await page.goto("/mon-compte/bons-achat");
  await expect(page.locator("main")).toContainText("120,00 € HT");
  const credit = page.getByRole("row", { name: /Crédit/ });
  const rendus = page.getByRole("row", { name: /Bons rendus/ });
  await expect(rendus).toContainText(payeeEnBons!.ref);
  const validite = async (ligne: typeof credit) => (await ligne.locator("td").last().textContent())?.trim();
  expect(await validite(rendus)).toBe(await validite(credit));
});
