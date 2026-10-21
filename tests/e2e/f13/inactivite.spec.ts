import { expect, test } from "@playwright/test";
import { requete } from "../bases";
import { COMPTES, connecterNavigateur } from "../session";

// T025 — inactivité (F13, D5) : délai réglé à 1 minute ; après 61 secondes sans activité, la
// session est fermée et la page de connexion l'explique.

test.describe.configure({ timeout: 240_000 });

test("session de l'équipe fermée après le délai d'inactivité", async ({ page, context }) => {
  const [avant] = await requete<{ valeur: string }>("site", `SELECT valeur FROM parametre WHERE cle = 'securite.inactivite_minutes'`);
  await requete("site", `INSERT INTO parametre (cle, valeur, "modifieLe") VALUES ('securite.inactivite_minutes', '1', now()) ON CONFLICT (cle) DO UPDATE SET valeur = '1'`);
  try {
    await connecterNavigateur(context, COMPTES.support);
    // Le délai est relu toutes les 10 secondes.
    await page.waitForTimeout(11_000);
    await page.goto("/admin");
    await expect(page.locator("main h1")).toHaveText("À traiter");
    await page.waitForTimeout(30_000);
    await page.goto("/admin/clients");
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/clients/);
    await page.waitForTimeout(62_000);
    await page.goto("/admin/clients");
    await expect(page).toHaveURL(/\/connexion\?raison=inactivite/);
    await expect(page.locator("main").getByRole("status")).toContainText("fermée après une période d’inactivité");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/connexion/);
  } finally {
    if (avant) await requete("site", `UPDATE parametre SET valeur = $1 WHERE cle = 'securite.inactivite_minutes'`, [avant.valeur]);
    else await requete("site", `DELETE FROM parametre WHERE cle = 'securite.inactivite_minutes'`);
  }
});
