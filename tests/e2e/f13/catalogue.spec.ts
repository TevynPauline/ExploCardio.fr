import { expect, test } from "@playwright/test";
import { COMPTES, connecterNavigateur } from "../session";

// T013 — habiller les produits d'Odoo (F13, US3) : la liste indique ce qui manque à chaque
// produit ; aucun prix, stock ni nom d'Odoo n'est modifiable (SC-007).

test.describe.configure({ timeout: 180_000 });

test("la liste indique ce qui manque ; la fiche n'expose aucune donnée d'Odoo en saisie", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin/catalogue");
  const tableau = page.getByRole("region", { name: "Tableau des produits" });
  await expect(tableau.getByRole("columnheader", { name: "Ce qui manque" })).toBeVisible();
  const cellules = await tableau.locator("tbody tr td:last-child").allInnerTexts();
  expect(cellules.length).toBeGreaterThan(0);
  expect(cellules.every((c) => c === "Rien" || /Texte|Photo|Type|Publication|Odoo/.test(c))).toBe(true);

  await tableau.locator("tbody tr th a").first().click();
  await expect(page.locator("main h1")).toBeVisible();
  const noms = await page.locator("main form [name]").evaluateAll((els) => els.map((e) => e.getAttribute("name")));
  expect(noms.filter((n) => /prix|stock|^nom$|defaultCode|tarif/i.test(n ?? ""))).toEqual([]);
});
