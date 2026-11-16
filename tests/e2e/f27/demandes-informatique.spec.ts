import { expect, test } from "@playwright/test";
import { requete } from "../bases";
import { COMPTES, connecterNavigateur } from "../session";

// F27, US5 : suivi des demandes Informatique médicale dans le back-office.

test("une demande se suit : état, note, journal ; filtre « À traiter »", async ({ page, context }, info) => {
  test.skip(info.project.name !== "desktop");
  const id = `f27-${Date.now()}`;
  await requete(
    "site",
    `INSERT INTO demande_informatique (id, interets, medecins, postes, secretariat, logiciels, "prestataireActuel", delai, coordonnees, creneau, "consentementLe", "modifieLe")
     VALUES ($1, '{acces_distance}', 1, 2, false, '{"holter":{"choix":"cardioscan"},"mapa":{"choix":"aucun"},"effort":{"choix":"aucun"}}', 'non', 'vite',
     '{"nom":"Dr Suivi","cabinet":"Cabinet Suivi F27","codePostal":"75001","email":"suivi@demo.explocardio.test","telephone":"0102030405"}', 'midi', now(), now())`,
    [id],
  );
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin/demandes/informatique");
  const fiche = page.locator(`#demande-${id}`);
  await expect(fiche).toContainText("Cabinet Suivi F27");
  await expect(fiche).toContainText("Nouvelle");
  await fiche.getByLabel("État").selectOption("transmise");
  await fiche.getByLabel("Note interne").fill("Rappelé, transmis à 2i.");
  await fiche.getByRole("button", { name: "Enregistrer le suivi" }).click();
  await expect(page.getByText("Suivi enregistré.")).toBeVisible();
  await page.goto("/admin/demandes/informatique?etat=non_traitees");
  await expect(page.locator(`#demande-${id}`)).toHaveCount(0);
  const [j] = await requete<{ n: string }>("site", `SELECT count(*) AS n FROM journal_action WHERE action = 'demandes.informatique.suivi' AND objet = $1`, [id]);
  expect(Number(j!.n)).toBe(1);
});
