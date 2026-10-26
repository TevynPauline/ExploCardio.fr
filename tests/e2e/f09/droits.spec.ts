import { expect, test } from "@playwright/test";
import { COMPTES, connecterNavigateur } from "../session";
import { clientConnecte } from "../f04/outils";
import { requete } from "../bases";

// T018 (US5, FR-009, FR-010) : droits d'assistance à côté du contact dans « Mon compte » ;
// l'équipe retrouve le client par son téléphone dans Back-office → Assistance.

test.describe.configure({ timeout: 180_000 });

test("Mon compte : droits à côté du contact ; équipe : client retrouvé par téléphone", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await page.goto("/mon-compte");
  const droits = page.getByRole("region", { name: "Vos droits d’assistance" });
  await expect(droits).toContainText(/Pas de droits en cours|Assistance offerte jusqu’au/);
  await expect(droits.getByRole("link", { name: "Mes droits d’assistance" })).toBeVisible();

  const telephone = `06 ${String(Date.now()).slice(-8).replace(/(\d{2})(?=\d)/g, "$1 ")}`;
  await requete("site", `UPDATE utilisateur SET telephone = $2 WHERE email = $1`, [c.email, telephone]);
  const contexte = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterNavigateur(contexte, COMPTES.support);
  const support = await contexte.newPage();
  // F13 (D6) : la recherche du support est dans la rubrique Clients.
  await support.goto("/admin/assistance");
  await support.getByLabel("Nom, cabinet, téléphone, email, SIRET ou SIREN").fill(telephone.replace(/\s/g, ""));
  await support.getByRole("button", { name: "Rechercher" }).click();
  await expect(support.getByRole("row").filter({ hasText: c.email })).toBeVisible();
  await contexte.close();
});
