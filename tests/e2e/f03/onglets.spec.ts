import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";

// T028 (US4, FR-018 à FR-021, FR-042).

test.describe.configure({ timeout: 90_000 });

const OSCAR = "/holter-tensionnel/suntech-oscar-2";

test("onglets au clavier, sans rechargement ; onglet sans contenu absent", async ({ page }) => {
  await page.goto(OSCAR);
  const onglets = page.getByRole("tablist", { name: /Informations sur Oscar 2/ }).getByRole("tab");
  await expect(onglets.first()).toHaveText("Caractéristiques techniques");
  const titres = await onglets.allInnerTexts();
  expect(titres).toEqual(expect.arrayContaining(["Caractéristiques techniques", "Contenu du coffret", "Logiciel associé", "Documents", "Garantie"]));
  await expect(page.getByRole("tabpanel")).toContainText("Durée d'enregistrement");

  await page.evaluate(() => ((window as unknown as { __marqueur: number }).__marqueur = 1));
  await onglets.first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Contenu du coffret" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { name: "Contenu du coffret" })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("brassard Orbit");
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Garantie" })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "Caractéristiques techniques" })).toBeFocused();
  expect(await page.evaluate(() => (window as unknown as { __marqueur?: number }).__marqueur)).toBe(1);
  await verifierAccessibilite(page);

  // Fiche sans aucun contenu d'onglet : pas de section « Informations »
  await page.goto("/holter-tensionnel/microlife-watchbp-03");
  await expect(page.getByRole("tablist")).toHaveCount(0);
});

test("documents : type et taille indiqués, consultables", async ({ page, request }) => {
  await page.goto(OSCAR);
  await page.getByRole("tab", { name: "Documents" }).click();
  const lien = page.getByRole("tabpanel").getByRole("link", { name: /Notice Oscar 2/ });
  await expect(page.getByRole("tabpanel")).toContainText(/Notice, PDF, \d+ Ko/);
  const r = await request.get((await lien.getAttribute("href"))!);
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toBe("application/pdf");
});

test("consommables compatibles : prix et ajout rapide ; produits associés", async ({ page }) => {
  await page.goto(OSCAR);
  await page.getByRole("tab", { name: "Consommables compatibles" }).click();
  const panneau = page.getByRole("tabpanel");
  await expect(panneau).toContainText("Brassard MAPA Orbit");
  await expect(panneau).toContainText(/€ HT/);
  await panneau.getByRole("button", { name: "Ajouter au panier" }).first().click();
  await expect(panneau.getByRole("status").filter({ hasText: "Ajouté au panier" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Produits associés" })).toBeVisible();
});

test("mobile 390 px : onglets lisibles, cibles de 44 px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(OSCAR);
  const tailles = await page.getByRole("tab").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  expect(tailles.length).toBeGreaterThan(0);
  for (const h of tailles) expect(h).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
