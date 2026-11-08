import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { COMPTES, connecterNavigateur } from "../session";

// T030 (F14, FR-027) : page « Contrôle des données Odoo » en démonstration.

test.describe.configure({ timeout: 120_000 });

test("le rapport de contrôle s'affiche depuis le catalogue, avec ses compteurs et l'export CSV", async ({ browser, baseURL }) => {
  const equipe = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterNavigateur(equipe, COMPTES.admin);
  const page = await equipe.newPage();

  await page.goto("/admin/catalogue");
  await page.getByRole("link", { name: "Contrôle des données Odoo" }).click();
  await page.waitForURL("**/admin/catalogue/controle", { timeout: 60_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contrôle des données Odoo");
  await expect(page.locator("main")).toContainText("base fictive");

  const compteurs = page.getByTestId("compteurs");
  await expect(compteurs).toContainText(/\d+ bloquants? · \d+ à compléter/);
  const [bloquants, aCompleter] = ((await compteurs.textContent()) ?? "").match(/\d+/g)!.map(Number);
  const lignes = page.getByRole("region", { name: "Anomalies des données Odoo" }).locator("tbody tr");
  if (bloquants! + aCompleter! > 0) {
    await expect(lignes).toHaveCount(bloquants! + aCompleter!);
    const reponse = await page.request.get("/admin/catalogue/controle/export");
    expect(reponse.status()).toBe(200);
    expect(reponse.headers()["content-type"]).toContain("text/csv");
    const csv = await reponse.text();
    expect(csv.split("\r\n")[0]).toBe("﻿Objet;Référence;Nom;Anomalie;Détail;Bloquant");
    expect(csv.trim().split("\r\n")).toHaveLength(bloquants! + aCompleter! + 1);
  } else {
    await expect(page.locator("main")).toContainText("Aucune anomalie");
  }
  await verifierAccessibilite(page);
  await equipe.close();
});

test("l'export est réservé à l'équipe", async ({ request }) => {
  const reponse = await request.get("/admin/catalogue/controle/export", { maxRedirects: 0 });
  expect(reponse.status()).not.toBe(200);
});
