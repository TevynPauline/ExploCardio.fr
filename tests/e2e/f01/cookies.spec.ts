import { expect, test, type BrowserContextOptions } from "@playwright/test";
import { ETAT_ACCES } from "./outils";
import { readFileSync } from "node:fs";

// T040 (US3, SC-007, SC-011). Sans finalité déclarée (D3) : bandeau d'information.
// Avec une finalité de test (page /demo/essai-cookies) : consentement en un geste.

type Etat = Exclude<BrowserContextOptions["storageState"], string | undefined>;

function accesSeulement(): Etat {
  const etat = JSON.parse(readFileSync(ETAT_ACCES, "utf8")) as Etat;
  return { cookies: etat.cookies.filter((c) => c.name !== "ec_consentement"), origins: [] };
}

test.describe("première visite", () => {
  test.use({ storageState: accesSeulement() });

  test("mode information : « J'ai compris », aucun cookie non nécessaire, page Cookies", async ({ page, context }) => {
    await page.goto("/");
    const bandeau = page.getByRole("region", { name: "Cookies" });
    await expect(bandeau).toBeVisible();
    await expect(bandeau.getByRole("link", { name: "En savoir plus" })).toHaveAttribute("href", "/cookies");
    const avant = (await context.cookies()).map((c) => c.name).sort();
    expect(avant.every((n) => ["ec_demo_acces"].includes(n))).toBe(true);
    // Au clavier seul (SC-011)
    await bandeau.getByRole("button", { name: "J’ai compris" }).focus();
    await page.keyboard.press("Enter");
    await expect(bandeau).toBeHidden();
    const apres = (await context.cookies()).map((c) => c.name);
    expect(apres).toContain("ec_consentement");
    await page.reload();
    await expect(page.getByRole("region", { name: "Cookies" })).toHaveCount(0);
    await page.getByRole("link", { name: "Gestion des cookies" }).click();
    await expect(page).toHaveURL(/\/cookies$/);
  });

  test("mode consentement : accepter et refuser en un geste, de même apparence, rien avant le choix", async ({ page, context }) => {
    await page.goto("/demo/essai-cookies");
    const bandeau = page.getByRole("region", { name: "Cookies" });
    const refuser = bandeau.getByRole("button", { name: "Tout refuser" });
    const accepter = bandeau.getByRole("button", { name: "Tout accepter" });
    await expect(refuser).toBeVisible();
    await expect(accepter).toBeVisible();
    expect(await refuser.getAttribute("class")).toBe(await accepter.getAttribute("class"));
    const [r, a] = [await refuser.boundingBox(), await accepter.boundingBox()];
    expect(Math.abs(r!.y - a!.y)).toBeLessThan(2);
    expect((await context.cookies()).some((c) => c.name === "ec_consentement")).toBe(false);
    await refuser.click();
    const choix = (await context.cookies()).find((c) => c.name === "ec_consentement");
    expect(decodeURIComponent(choix!.value)).toContain('"audience":false');
    await page.reload();
    await expect(page.getByRole("region", { name: "Cookies" })).toHaveCount(0);
  });

  test("mode consentement : personnaliser par finalité", async ({ page, context }) => {
    await page.goto("/demo/essai-cookies");
    const bandeau = page.getByRole("region", { name: "Cookies" });
    await bandeau.getByRole("button", { name: "Personnaliser" }).click();
    await bandeau.getByRole("checkbox", { name: /Mesure d'audience/ }).check();
    await bandeau.getByRole("button", { name: "Enregistrer mes choix" }).click();
    const choix = (await context.cookies()).find((c) => c.name === "ec_consentement");
    expect(decodeURIComponent(choix!.value)).toContain('"audience":true');
  });
});
