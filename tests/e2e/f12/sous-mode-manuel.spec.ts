import { expect, test } from "@playwright/test";
import { COMPTES, connecterNavigateur } from "../session";
import { acheterHolterCloud, clientConnecte, nombreEmails, requete } from "./outils";

// T023 (US5, FR-019 à FR-022, SC-006, SC-007) : plateforme non automatisée (réglée au
// démonstrateur le temps du test) → tâche au back-office avec le médecin, ses coordonnées, le
// logiciel, l'action et la date ; client « en cours d'ouverture » ; confirmée → actif et email.

test.describe.configure({ timeout: 240_000, mode: "serial" });

async function sousMode(mode: "auto" | "manual") {
  await requete("site", `INSERT INTO parametre (cle, valeur, "modifieLe") VALUES ('demo.pca_sous_mode', $1, now()) ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur, "modifieLe" = now()`, [mode]);
}

test.afterAll(async () => {
  await requete("site", `DELETE FROM parametre WHERE cle = 'demo.pca_sous_mode'`);
});

test("sous-mode manuel : tâche, « en cours d'ouverture », confirmation → actif et email", async ({ page, browser, baseURL }) => {
  await sousMode("manual");
  const c = await clientConnecte(browser, baseURL, page);
  await acheterHolterCloud(page, c.email);
  await page.goto("/mon-compte/logiciels");
  await expect(page.getByRole("listitem", { name: /Logiciel CardioScan/ })).toContainText("En cours d’ouverture");
  expect(await nombreEmails(c.email, "est ouvert")).toBe(0);
  expect(await nombreEmails("admin@demo.explocardio.test", "Accès Cloud à ouvrir")).toBeGreaterThan(0);

  const contexte = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterNavigateur(contexte, COMPTES.admin);
  const admin = await contexte.newPage();
  await admin.goto("/admin/logiciels-cloud");
  await expect(admin.locator("main")).toContainText("Plateforme non automatisée");
  const tache = admin.getByRole("listitem", { name: new RegExp(`Tâche ouvrir .* ${c.email.replace(/[.]/g, "\\.")}`) });
  await expect(tache).toContainText("Ouvrir l’accès à CardioScan");
  await expect(tache).toContainText("avant le");
  await tache.getByRole("button", { name: "Confirmer la tâche réalisée" }).click();
  await expect(admin.locator("main").getByRole("status")).toContainText("Tâche confirmée");
  await contexte.close();

  await page.goto("/mon-compte/logiciels");
  await expect(page.getByRole("listitem", { name: /Logiciel CardioScan/ })).toContainText("Actif");
  expect(await nombreEmails(c.email, "est ouvert")).toBe(1);
  await sousMode("auto");
});
