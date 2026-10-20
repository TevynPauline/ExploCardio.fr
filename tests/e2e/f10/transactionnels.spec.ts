import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { requete } from "../bases";
import { creerCompteValide } from "../f02/outils";
import { COMPTES, connecterNavigateur, postAvecPatience } from "../session";

// T011 — emails transactionnels (F10, US1, SC-003) : un seul email par événement, tracé ; reçu
// même sans aucune préférence ni newsletter ; lisible dans la boîte de démonstration, y compris
// à 375 px, avec sa version texte ; la consultation simule l'ouverture.

test("un compte qui a tout désactivé reçoit quand même ses emails transactionnels, une seule fois", async ({ page, context, baseURL }) => {
  test.setTimeout(180_000);
  const compte = await creerCompteValide(page, { newsletter: false });
  await requete(
    "site",
    `INSERT INTO preferences_email (email, "compteId", reapprovisionnement, "panierAbandonne", "alerteBons", "alerteDroits", "modifieLe")
     VALUES ($1, $2, false, false, false, false, now()) ON CONFLICT (email) DO UPDATE SET reapprovisionnement = false, "panierAbandonne" = false, "alerteBons" = false, "alerteDroits" = false`,
    [compte.email, compte.id],
  );

  // Confirmation de l'adresse (à l'inscription) : un seul envoi tracé, transactionnel, parti.
  const confirmations = await requete<{ etat: string; famille: string }>("site", `SELECT etat, famille FROM envoi WHERE destinataire = $1 AND modele = 'confirmation_adresse'`, [compte.email]);
  expect(confirmations).toEqual([{ etat: "envoye", famille: "transactionnel" }]);

  // Réinitialisation du mot de passe : reçue malgré les préférences coupées.
  const r = await postAvecPatience(context.request, "/api/auth/request-password-reset", { email: compte.email, redirectTo: "/connexion" }, { origin: baseURL! });
  expect(r.ok()).toBe(true);
  await expect
    .poll(async () => (await requete("site", `SELECT 1 FROM envoi WHERE destinataire = $1 AND modele = 'reinitialisation_mot_de_passe' AND etat = 'envoye'`, [compte.email])).length, { timeout: 20_000 })
    .toBe(1);

  // Boîte de démonstration : rendu, version texte, ouverture simulée ; lisible à 375 px.
  await connecterNavigateur(context, COMPTES.admin);
  const p = page;
  await p.goto(`/admin/demonstration/boite?onglet=clients&destinataire=${encodeURIComponent(compte.email)}`);
  await p.getByRole("link", { name: /Réinitialiser votre mot de passe/ }).first().click();
  await expect(p.getByRole("heading", { name: "Réinitialiser votre mot de passe", level: 2 })).toBeVisible();
  await p.getByText("Version texte").click();
  await expect(p.locator("pre")).toContainText("Mentions légales");
  await verifierAccessibilite(p);
  const [m] = await requete<{ ouvert: boolean }>("site", `SELECT "ouvertLe" IS NOT NULL AS ouvert FROM message_demonstration WHERE destinataire = $1 AND objet LIKE 'Réinitialiser%' ORDER BY date DESC LIMIT 1`, [compte.email]);
  expect(m!.ouvert).toBe(true);

  await p.setViewportSize({ width: 375, height: 800 });
  const rendu = p.frameLocator("iframe[title^=\"Rendu de l'email\"]");
  await expect(rendu.getByRole("link", { name: "Choisir un nouveau mot de passe" })).toBeVisible();
  // L'iframe est isolée (sans script) : on compare les positions plutôt que d'y exécuter du code.
  const cadre = (await p.locator("iframe[title^=\"Rendu de l'email\"]").boundingBox())!;
  for (const nom of ["Choisir un nouveau mot de passe", "Mentions légales"]) {
    const b = (await rendu.getByRole("link", { name: nom }).boundingBox())!;
    expect(b.x + b.width).toBeLessThanOrEqual(cadre.x + cadre.width + 1);
  }
});
