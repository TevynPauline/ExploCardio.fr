import { expect, test } from "@playwright/test";
import { clientConnecte } from "../f04/outils";
import { requete } from "../bases";

// T008 (US2, FR-005, SC-005) : en démonstration, la page de contact montre le message qui aurait
// été pré-rempli : nom et cabinet du client connecté, modèle à compléter sinon.

test("message pré-rempli : client connecté, puis visiteur", async ({ page, browser, baseURL }) => {
  await page.goto("/demo/contact?moyen=whatsapp");
  await expect(page.getByTestId("message-prerempli")).toHaveText("Bonjour, je suis le Dr …, cabinet …");

  const c = await clientConnecte(browser, baseURL, page);
  const [u] = await requete<{ nom: string; cabinet: string | null }>("site", `SELECT u.name AS nom, c."nomCabinet" AS cabinet FROM utilisateur u JOIN compte_client c ON c."utilisateurId" = u.id WHERE u.email = $1`, [c.email]);
  await page.goto("/mon-compte");
  await page.locator("main").getByRole("link", { name: /^Écrire sur WhatsApp/ }).click();
  const message = page.getByTestId("message-prerempli");
  await expect(message).toHaveText(`Bonjour, je suis le Dr ${u!.nom}${u!.cabinet ? `, cabinet ${u!.cabinet}` : ""}.`);
  await expect(message).not.toContainText(c.email);
});
