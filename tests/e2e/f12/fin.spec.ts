import { expect, test } from "@playwright/test";
import { accesDe, avancerJusquAu, clientConnecte, expedier, livrer, louerHolterCloud, nombreEmails, rendreParcDesTests } from "./outils";

// T014 (US2, FR-007, FR-008, SC-002) : résilier une location avec logiciel → fin programmée ;
// « Avancer la date » → délai de grâce à la fin, puis fermé au terme du délai ; emails.

test.describe.configure({ timeout: 300_000, mode: "serial" });
test.beforeEach(rendreParcDesTests);

const JOUR = 24 * 3600_000;

test("résiliation d'une location avec logiciel : délai de grâce à la fin, puis fermé", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  const ref = await louerHolterCloud(page, c.partenaireRef);
  await expedier(browser, baseURL, ref);
  await livrer(browser, baseURL, ref);
  await page.goto("/mon-compte/locations");
  await page.getByRole("link", { name: `Résilier la location ${ref}` }).click();
  await page.waitForURL(/\/resilier$/);
  await page.getByRole("button", { name: "Confirmer la résiliation" }).click();
  await expect(page.locator("main").getByRole("status").filter({ hasText: "Votre résiliation est enregistrée" })).toBeVisible();

  const [a] = await accesDe(c.partenaireRef);
  const fin = new Date(a!.finPrevue!);
  await page.goto("/mon-compte/logiciels");
  await expect(page.getByRole("listitem", { name: /Logiciel CardioScan/ })).toContainText(/jusqu’au \d+ \S+ \d{4}/);

  await avancerJusquAu(browser, baseURL, new Date(fin.getTime() + JOUR));
  await page.goto("/mon-compte/logiciels");
  const logiciel = page.getByRole("listitem", { name: /Logiciel CardioScan/ });
  await expect(logiciel).toContainText("En délai de grâce");
  await expect(logiciel).toContainText("consultation et récupération de vos données jusqu’au");
  expect(await nombreEmails(c.email, "en délai de grâce")).toBe(1);

  await avancerJusquAu(browser, baseURL, new Date(fin.getTime() + 32 * JOUR));
  await page.goto("/mon-compte/logiciels");
  await expect(page.getByRole("region", { name: "Accès terminés" }).getByRole("listitem", { name: /Logiciel CardioScan/ })).toContainText("Fermé");
  expect(await nombreEmails(c.email, "est fermé")).toBe(1);
});
