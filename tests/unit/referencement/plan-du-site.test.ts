import { describe, expect, it } from "vitest";
import { adressesPlanDuSite } from "@/lib/referencement/plan-du-site";

const O = "https://www.explocardio.fr";

describe("adressesPlanDuSite (contrats § 2)", () => {
  it("ferme : aucune adresse", async () => {
    expect(await adressesPlanDuSite("ferme", O, async () => [{ chemin: "/holter-ecg" }])).toEqual([]);
  });

  it("attente : la seule page d'accueil, même si des pages existent", async () => {
    expect(await adressesPlanDuSite("attente", O, async () => [{ chemin: "/holter-ecg" }])).toEqual([{ url: `${O}/` }]);
  });

  it("ouvert : accueil puis pages, sans doublon, avec date ; une lecture en échec garde l'accueil", async () => {
    const date = new Date("2026-11-01T00:00:00Z");
    expect(await adressesPlanDuSite("ouvert", O, async () => [{ chemin: "/" }, { chemin: "/holter-ecg", modifieLe: date }, { chemin: "/holter-ecg" }])).toEqual([
      { url: `${O}/` },
      { url: `${O}/holter-ecg`, lastModified: date },
    ]);
    expect(
      await adressesPlanDuSite("ouvert", O, async () => {
        throw new Error("base injoignable");
      }),
    ).toEqual([{ url: `${O}/` }]);
  });
});
