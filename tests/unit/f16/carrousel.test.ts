import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Vignette } from "@/domaine/vignettes";
import { Carrousel } from "@/ui/accueil/Carrousel";

// T008 (complément) — carrousel sans vignette ou avec une seule vignette (F16, cas limites).

const v = (id: string, x: Partial<Vignette> = {}): Vignette => ({ id, titre: `Titre ${id}`, phrase: "Phrase", lien: "/inscription", libelleLien: "Voir", image: null, fond: "pale", ...x });
const rendu = (vignettes: Vignette[]) => renderToStaticMarkup(createElement(Carrousel, { vignettes }));

describe("carrousel", () => {
  it("aucune vignette : rien n'est affiché", () => {
    expect(rendu([])).toBe("");
  });
  it("une seule vignette : ni flèches, ni points, ni pause", () => {
    const html = rendu([v("a")]);
    expect(html).toContain("Titre a");
    expect(html).not.toContain("Vignette suivante");
    expect(html).not.toContain("Pause");
  });
  it("plusieurs vignettes : première visible, les autres masquées et inertes ; bouton omis sans lien", () => {
    const html = rendu([v("a"), v("b", { lien: null, libelleLien: null })]);
    expect(html).toMatch(/aria-label="1 sur 2"(?![^>]*aria-hidden)/);
    expect(html).toMatch(/aria-label="2 sur 2"[^>]*aria-hidden="true"|aria-hidden="true"[^>]*aria-label="2 sur 2"/);
    expect(html.match(/>Voir</g)).toHaveLength(1);
    expect(html).toContain("Vignette suivante");
  });
});
