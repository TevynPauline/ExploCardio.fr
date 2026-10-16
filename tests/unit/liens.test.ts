import { describe, expect, it } from "vitest";
import { lienValide, verifierLien } from "@/domaine/liens";

// T060 (FR-046) : un lien de contenu mène toujours à une page existante.
describe("validation des liens des contenus", () => {
  it.each(["/", "/holter-ecg", "/mise-a-disposition#depannage-express", "/qui-sommes-nous?motif=Financement", "https://www.exemple.fr/page"])(
    "accepte %s",
    (lien) => expect(lienValide(lien)).toBe(true),
  );

  it.each(["/page-inexistante", "//autre-site.fr", "javascript:alert(1)", "http://www.exemple.fr", "", "texte"])("refuse « %s »", (lien) => {
    expect(lienValide(lien)).toBe(false);
  });

  it("explique le refus d'une page inexistante", () => {
    const r = verifierLien("/promotions");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.raison).toContain("/promotions");
  });
});
