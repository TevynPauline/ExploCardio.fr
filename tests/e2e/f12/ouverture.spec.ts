import { expect, test } from "@playwright/test";
import { HOLTER_CLOUD, accesDe, acheterHolterCloud, clientConnecte, expedier, louerHolterCloud, nombreEmails, rendreParcDesTests } from "./outils";

// T010 (US1, FR-001, FR-002, FR-004, FR-006, SC-001) : location expédiée → logiciel actif dans
// « Mon compte » avant la livraison, email d'ouverture ; achat d'une configuration « + logiciel
// Cloud » → actif dès la confirmation, fin prévue affichée.

test.describe.configure({ timeout: 300_000, mode: "serial" });
test.beforeEach(rendreParcDesTests);

test("location d'un Holter « + logiciel Cloud » : accès actif dès l'expédition, email d'ouverture", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  const ref = await louerHolterCloud(page, c.partenaireRef);
  expect(await accesDe(c.partenaireRef)).toEqual([]);
  await expedier(browser, baseURL, ref);
  await page.goto("/mon-compte/logiciels");
  const logiciel = page.getByRole("listitem", { name: /Logiciel CardioScan/ });
  await expect(logiciel).toContainText("Actif");
  await expect(logiciel.getByRole("link", { name: /Accéder à la plateforme/ })).toBeVisible();
  const [a] = await accesDe(c.partenaireRef);
  expect(a).toMatchObject({ logiciel: HOLTER_CLOUD, origine: "location", sourceRef: ref });
  expect(await nombreEmails(c.email, "est ouvert")).toBe(1);
});

test("achat d'une configuration « + logiciel Cloud » : accès actif dès le paiement, pour 12 mois", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await acheterHolterCloud(page, c.email);
  await page.goto("/mon-compte/logiciels");
  const logiciel = page.getByRole("listitem", { name: /Logiciel CardioScan/ });
  await expect(logiciel).toContainText("Actif");
  await expect(logiciel).toContainText(/inclus avec votre appareil jusqu’au \d+ \S+ \d{4}/);
  await expect(logiciel.getByRole("button", { name: "Poursuivre avec l’abonnement" })).toBeVisible();
  const [a] = await accesDe(c.partenaireRef);
  expect(a).toMatchObject({ origine: "periode_incluse", etat: "actif" });
  expect(new Date(a!.finPrevue!).getTime()).toBeGreaterThan(Date.now() + 360 * 24 * 3600_000);
});
