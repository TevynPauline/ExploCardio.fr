import { expect, test } from "@playwright/test";
import { COMPTES, connecterNavigateur } from "../session";

// T031 — back-office en HT, avec le TTC en aide (F22, US5, FR-017, SC-004).

test.describe.configure({ timeout: 120_000 });

test("prix de démonstration : saisie en HT, aide « soit … € TTC sur le site »", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin/demonstration/prix");
  const main = page.locator("main");
  await expect(main.getByRole("columnheader", { name: "Prix HT (€)" })).toBeVisible();
  const champ = main.getByLabel(/^Prix HT de /).first();
  await expect(champ).toHaveAttribute("aria-describedby", /^ttc-/);
  const aide = page.locator(`#${await champ.getAttribute("aria-describedby")}`);
  await expect(aide).toContainText(/soit .* TTC sur le site/);
  // Aucun prix du back-office n'utilise la présentation client (TTC d'abord).
  await expect(main.locator("[data-prix-ttc]")).toHaveCount(0);
});
