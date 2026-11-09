import { describe, expect, it } from "vitest";
import { CLES_RAISONS, LONGUEURS_RAISONS, RAISONS_DEFAUT, textesRaisons } from "@/domaine/textes-raisons";

// F23 (FR-008, FR-011) : textes des six cartes « Pourquoi choisir ExploCardio.fr ? ».

describe("cartes « Pourquoi choisir »", () => {
  it("six textes de départ, dans les longueurs autorisées", () => {
    expect(RAISONS_DEFAUT).toHaveLength(6);
    expect(CLES_RAISONS).toHaveLength(6);
    for (const r of RAISONS_DEFAUT) {
      expect(r.titre.length).toBeLessThanOrEqual(LONGUEURS_RAISONS.titre);
      expect(r.phrase.length).toBeLessThanOrEqual(LONGUEURS_RAISONS.phrase);
    }
    expect(RAISONS_DEFAUT.map((r) => r.titre)).toEqual([
      "Une offre de produits et de services",
      "Achetez, louez, financez",
      "L’assistance sans contrat",
      "Une fidélité récompensée",
      "Dépannage express",
      "Des interlocuteurs experts",
    ]);
  });

  it("textes enregistrés utilisés, repli sur le départ si absents ou vides", () => {
    const t = textesRaisons([
      { cle: "raison-2", titre: "  Achetez ou louez ", corps: "Comme vous voulez." },
      { cle: "raison-4", titre: "", corps: "  " },
    ]);
    expect(t[1]).toEqual({ titre: "Achetez ou louez", phrase: "Comme vous voulez." });
    expect(t[3]).toEqual(RAISONS_DEFAUT[3]);
    expect(t[0]).toEqual(RAISONS_DEFAUT[0]);
  });
});
