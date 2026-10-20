import { expect, test } from "@playwright/test";
import { requete } from "./outils";

// T052 (US5, FR-028) : inscription confirmée seulement après le lien de l'email.

test("inscription depuis le pied de page, confirmation par le lien, désinscription", async ({ page }) => {
  const email = `newsletter-e2e-${Date.now()}@demo.explocardio.test`;
  await page.goto("/");
  const pied = page.locator("footer");
  await page.waitForTimeout(1_700);
  await pied.getByLabel("Votre adresse email").fill(email);
  await pied.getByRole("checkbox").check();
  await pied.getByRole("button", { name: "M’inscrire" }).click();
  await expect(pied.getByRole("status")).toContainText("cliquez sur le lien pour confirmer");

  const [inscription] = await requete<{ etat: string }>("site", `SELECT etat FROM inscription_newsletter WHERE email = $1`, [email]);
  expect(inscription!.etat).toBe("en_attente");
  const [message] = await requete<{ rendu: string }>("site", `SELECT rendu FROM message_demonstration WHERE destinataire = $1 ORDER BY date DESC LIMIT 1`, [email]);
  expect(message!.rendu).toMatch(/se désinscrire/i);
  const lien = message!.rendu.match(/\/newsletter\/confirmation\?jeton=[A-Za-z0-9_-]+/)![0];

  await page.goto(lien);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Inscription confirmée");
  const [confirmee] = await requete<{ etat: string }>("site", `SELECT etat FROM inscription_newsletter WHERE email = $1`, [email]);
  expect(confirmee!.etat).toBe("confirmee");

  await page.goto(lien.replace("confirmation", "desinscription"));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vous êtes désinscrit");
  await requete("site", `DELETE FROM inscription_newsletter WHERE email = $1`, [email]);
  await requete("site", `DELETE FROM consentement WHERE email = $1`, [email]);
});

test("sans consentement coché, l'inscription est refusée avec l'explication", async ({ page }) => {
  await page.goto("/");
  const pied = page.locator("footer");
  await page.waitForTimeout(1_700);
  await pied.getByLabel("Votre adresse email").fill("sans-case@demo.explocardio.test");
  await pied.getByRole("button", { name: "M’inscrire" }).click();
  await expect(pied.getByRole("status")).toContainText("Cochez la case");
});
