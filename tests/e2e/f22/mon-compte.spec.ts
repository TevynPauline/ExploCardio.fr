import { expect, test } from "@playwright/test";
import { COMPTES, connecterNavigateur } from "../session";
import { verifierPrixTtcDabord } from "./outils";

// T023 — Mon compte en TTC d'abord (F22, US4, FR-013) ; documents d'Odoo inchangés (FR-016).

test.describe.configure({ timeout: 180_000 });

test("commandes, détail d'une commande, devis et factures : TTC d'abord", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.clientDroits);
  await page.goto("/mon-compte/commandes");
  await verifierPrixTtcDabord(page.locator("main"));
  await page.locator("main").getByRole("link", { name: /FICT-SO|Commande/ }).first().click();
  await expect(page.locator("main")).toContainText(/Total TTC .*€/);
  await verifierPrixTtcDabord(page.locator("main"));
  await page.goto("/mon-compte/factures");
  if (await page.locator("main [data-prix-ttc]").count()) await verifierPrixTtcDabord(page.locator("main"));
  await page.goto("/mon-compte/devis");
  if (await page.locator("main [data-prix-ttc]").count()) await verifierPrixTtcDabord(page.locator("main"));
});
