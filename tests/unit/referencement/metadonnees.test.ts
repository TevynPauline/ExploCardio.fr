import { describe, expect, it } from "vitest";
import { LIMITE_DESCRIPTION, LIMITE_TITRE, SUFFIXE_TITRE, couperAuMot, metadonneesReferencement, resoudreMetadonnees } from "@/lib/referencement/metadonnees";

const long = "Holter tensionnel ambulatoire pour la mesure de la pression artérielle sur vingt-quatre heures en cabinet de cardiologie libérale, avec brassards adultes et logiciel d’analyse inclus dans le coffret";

describe("couperAuMot", () => {
  it("laisse un texte court intact et coupe un texte long au mot, avec …", () => {
    expect(couperAuMot("  Holter   ECG ", 60)).toBe("Holter ECG");
    const c = couperAuMot(long, 50);
    expect(c.length).toBeLessThanOrEqual(50);
    expect(c.endsWith("…")).toBe(true);
    expect(long.startsWith(c.slice(0, -1))).toBe(true);
  });
});

describe("resoudreMetadonnees", () => {
  it("le texte saisi l'emporte et n'est jamais coupé", () => {
    const m = resoudreMetadonnees({ titre: long, description: long }, { titre: "Auto", description: "Auto" });
    expect(m).toEqual({ titre: long, description: long, origineTitre: "saisi", origineDescription: "saisi" });
  });

  it("à défaut, textes automatiques coupés : titre (suffixe compris) ≤ 60, description ≤ 160", () => {
    const m = resoudreMetadonnees({ titre: "  ", description: null }, { titre: long, description: long });
    expect(m.origineTitre).toBe("automatique");
    expect((m.titre + SUFFIXE_TITRE).length).toBeLessThanOrEqual(LIMITE_TITRE);
    expect(m.description.length).toBeLessThanOrEqual(LIMITE_DESCRIPTION);
  });

  it("ne renvoie jamais un titre vide", () => {
    expect(resoudreMetadonnees(null, { titre: "", description: "" }).titre).toBe("ExploCardio.fr");
  });
});

describe("metadonneesReferencement", () => {
  it("lecture en échec → textes automatiques", async () => {
    const m = await metadonneesReferencement("page:x", { titre: "Holter ECG", description: "Texte." }, async () => {
      throw new Error("base injoignable");
    });
    expect(m.titre).toBe("Holter ECG");
  });
});
