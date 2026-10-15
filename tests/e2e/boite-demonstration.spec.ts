import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "./axe";
import { COMPTES, connecterNavigateur, postAvecPatience } from "./session";

// US6 (SC-007) : un email déclenché par le site arrive dans la boîte de démonstration, séparé des
// notifications d'équipe, filtrable et affiché avec son rendu ; il n'est pas envoyé.

test("un email de réinitialisation apparaît dans la boîte de démonstration", async ({ page, context, baseURL }) => {
  test.setTimeout(120_000);
  const r = await postAvecPatience(
    context.request,
    "/api/auth/request-password-reset",
    { email: COMPTES.clientDroits, redirectTo: "/connexion" },
    { origin: baseURL! },
  );
  expect(r.ok()).toBe(true);

  await connecterNavigateur(context, COMPTES.admin);
  await page.goto(`/admin/demonstration/boite?onglet=clients&destinataire=${encodeURIComponent(COMPTES.clientDroits)}`);
  await verifierAccessibilite(page);
  const message = page.getByRole("link", { name: /Réinitialiser votre mot de passe/ }).first();
  await expect(message).toBeVisible();
  await message.click();
  await expect(page.getByRole("heading", { name: "Réinitialiser votre mot de passe", level: 2 })).toBeVisible();
  const rendu = page.frameLocator("iframe[title^=\"Rendu de l'email\"]");
  await expect(rendu.getByRole("link", { name: "Choisir un nouveau mot de passe" })).toBeVisible();
  await expect(rendu.getByText(/Version de démonstration — données fictives/)).toBeVisible();

  // Les notifications d'équipe sont dans un autre onglet
  await page.getByRole("link", { name: "Notifications d'équipe" }).click();
  await expect(page.getByRole("link", { name: /Réinitialiser votre mot de passe/ })).toHaveCount(0);
});
