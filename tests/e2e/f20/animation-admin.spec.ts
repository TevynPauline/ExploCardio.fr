import { expect, test } from "@playwright/test";
import { requete } from "../bases";
import { defileHorizontalement } from "../f16/outils";
import { COMPTES, connecterNavigateur } from "../session";

// T015 — textes de l'animation modifiés au back-office (F20, US4, FR-017).

test.describe.configure({ timeout: 180_000 });

test("un mot modifié au back-office apparaît dans l'animation de l'accueil", async ({ page, context }) => {
  const [avant] = await requete<{ titre: string }>("site", `SELECT titre FROM contenu WHERE type = 'argument' AND cle = 'mot-2'`);
  await connecterNavigateur(context, COMPTES.admin);
  try {
    await page.goto("/admin/contenus");
    await page.getByRole("link", { name: /Animation de l.accueil/ }).click();
    await expect(page.getByLabel("Phrase d’accroche (80 caractères au plus)")).toHaveValue("Une offre pensée pour la cardiologie libérale");
    // Champ trop long refusé par le formulaire (16 caractères au plus).
    await expect(page.getByLabel("Mot 2 (16 caractères au plus)")).toHaveAttribute("maxlength", "16");
    // Cinq arguments, rattachés aux mots (FR-022).
    await expect(page.getByLabel(/^Argument \d — .+ \(30 caractères au plus\)$/)).toHaveCount(5);
    await expect(page.getByLabel("Argument 5 — Fidélité (30 caractères au plus)")).toHaveValue("Une fidélité récompensée");
    await page.getByLabel("Mot 2 (16 caractères au plus)").fill("Clé en main pro");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    // Premier enregistrement : l'action peut être compilée à la volée par le serveur de développement.
    await expect(page.locator("main").getByRole("status")).toContainText("Animation enregistrée", { timeout: 20_000 });
    const [journal] = await requete<{ n: number }>("site", `SELECT count(*)::int n FROM journal_action WHERE action = 'contenus.animation.modifiee'`);
    expect(journal!.n).toBeGreaterThan(0);
    await expect
      .poll(async () => {
        await page.goto("/");
        return page.locator("[data-section=trois-temps] .sr-only").innerText();
      }, { timeout: 60_000 })
      .toContain("Clé en main pro");
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/");
    expect(await defileHorizontalement(page)).toBe(false);
  } finally {
    // Remise en état par le formulaire : l'enregistrement vide aussi le cache de l'accueil.
    await page.goto("/admin/contenus/accueil");
    await page.getByLabel("Mot 2 (16 caractères au plus)").fill(avant?.titre ?? "Expertise");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.locator("main").getByRole("status")).toContainText("Animation enregistrée");
  }
});
