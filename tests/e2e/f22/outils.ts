import { expect, type Locator } from "@playwright/test";

/**
 * Vérifie chaque prix rendu par le composant commun dans `zone` (F22) : TTC en premier, en
 * Semibold, puis « soit … HT » juste en dessous ; TTC ≥ HT. Renvoie le nombre de prix vus.
 */
export async function verifierPrixTtcDabord(zone: Locator, minimum = 1): Promise<number> {
  const prix = zone.locator("[data-prix-ttc]");
  await expect(prix.first()).toBeVisible();
  const n = await prix.count();
  expect(n).toBeGreaterThanOrEqual(minimum);
  for (let i = 0; i < n; i++) {
    const p = prix.nth(i);
    if (!(await p.isVisible())) continue;
    const [ttc, ht] = [Number(await p.getAttribute("data-prix-ttc")), Number(await p.getAttribute("data-prix-ht"))];
    expect(ttc).toBeGreaterThanOrEqual(ht);
    const lignes = p.locator(":scope > span");
    await expect(lignes.nth(0)).toContainText("TTC");
    await expect(lignes.nth(0)).toHaveCSS("font-weight", "600");
    await expect(lignes.nth(1)).toContainText(/^soit .* HT/);
    const [b0, b1] = [await lignes.nth(0).boundingBox(), await lignes.nth(1).boundingBox()];
    expect(b1!.y).toBeGreaterThan(b0!.y); // HT juste en dessous
  }
  return n;
}

/** Montant affiché « 1 234,56 € » → centimes. */
export function centimes(texte: string): number {
  const m = texte.replace(/[\s  ]/g, "").match(/(-?\d+(?:,\d{2})?)€/);
  if (!m) throw new Error(`Montant introuvable : ${texte}`);
  return Math.round(Number(m[1]!.replace(",", ".")) * 100);
}
