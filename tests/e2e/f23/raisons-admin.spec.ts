import { expect, test } from "@playwright/test";
import { requete } from "../bases";
import { COMPTES, connecterNavigateur } from "../session";

// T022 — textes des cartes « Pourquoi choisir » au back-office (F23, US4 ; FR-011).

test.describe.configure({ timeout: 360_000 });

const PHRASE_DEPART = "Vos achats vous rapportent des points, à convertir en services ou en bons d’achat.";

test("la phrase de la carte 4 modifiée apparaît sur l'accueil ; un titre vide est refusé", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  const phrase = page.locator("#raison-4-phrase");
  try {
    await page.goto("/admin/contenus");
    await page.getByRole("link", { name: /Textes de l.accueil/ }).click();
    await expect(page.getByRole("heading", { name: "Pourquoi choisir ExploCardio.fr ?" })).toBeVisible({ timeout: 60_000 });
    await expect(page.locator("#raison-1-titre")).toHaveValue("Une offre de produits et de services");
    await expect(page.locator("#raison-1-titre")).toHaveAttribute("maxlength", "50");
    await expect(phrase).toHaveAttribute("maxlength", "160");
    await phrase.fill("Chaque achat vous rapporte des points.");
    await page.getByRole("button", { name: "Enregistrer les cartes" }).click();
    await expect(page.getByText("Cartes « Pourquoi choisir » enregistrées.")).toBeVisible({ timeout: 30_000 });
    const [journal] = await requete<{ n: number }>("site", `SELECT count(*)::int n FROM journal_action WHERE action = 'contenus.raisons.modifiees'`);
    expect(journal!.n).toBeGreaterThan(0);
    await page.goto("/");
    await expect(page.locator("[data-raison='4']")).toContainText("Chaque achat vous rapporte des points.");

    // Titre vide : refusé côté serveur (le champ « required » est contourné).
    await page.goto("/admin/contenus/accueil");
    await page.locator("#raison-2-titre").evaluate((e) => e.removeAttribute("required"));
    await page.locator("#raison-2-titre").fill("");
    await page.getByRole("button", { name: "Enregistrer les cartes" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /Titre de la carte 2/ })).toBeVisible({ timeout: 30_000 });
    await page.goto("/");
    await expect(page.locator("[data-raison='2'] h3")).toHaveText("Achetez, louez, financez");
  } finally {
    await page.goto("/admin/contenus/accueil");
    await phrase.fill(PHRASE_DEPART);
    await page.getByRole("button", { name: "Enregistrer les cartes" }).click();
    await expect(page.getByText("Cartes « Pourquoi choisir » enregistrées.")).toBeVisible({ timeout: 30_000 });
  }
});
