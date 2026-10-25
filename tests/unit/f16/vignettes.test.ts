import { describe, expect, it } from "vitest";
import { lienDisponible, vignetteVisible } from "@/domaine/vignettes";

// T007 — vignettes du carrousel (F16, US2, FR-007, FR-008) : visibilité, offre de bienvenue,
// lien vers une page disparue.

const maintenant = new Date("2026-11-02T10:00:00Z");
const v = (x: Partial<Parameters<typeof vignetteVisible>[0]> = {}) => ({ etat: "publie", debut: null, fin: null, cle: null, ...x });

describe("visibilité d'une vignette", () => {
  it("publiée et dans sa période seulement", () => {
    expect(vignetteVisible(v(), maintenant, true)).toBe(true);
    expect(vignetteVisible(v({ etat: "preparation" }), maintenant, true)).toBe(false);
    expect(vignetteVisible(v({ etat: "retire" }), maintenant, true)).toBe(false);
    expect(vignetteVisible(v({ debut: new Date("2026-11-03T00:00:00Z") }), maintenant, true)).toBe(false);
    expect(vignetteVisible(v({ fin: new Date("2026-11-01T00:00:00Z") }), maintenant, true)).toBe(false);
    expect(vignetteVisible(v({ debut: new Date("2026-11-01T00:00:00Z"), fin: new Date("2026-11-30T00:00:00Z") }), maintenant, true)).toBe(true);
  });

  it("la vignette de l'offre de bienvenue suit l'activation de l'offre", () => {
    expect(vignetteVisible(v({ cle: "offre-bienvenue" }), maintenant, true)).toBe(true);
    expect(vignetteVisible(v({ cle: "offre-bienvenue" }), maintenant, false)).toBe(false);
    expect(vignetteVisible(v({ cle: null }), maintenant, false)).toBe(true);
  });
});

describe("lien d'une vignette", () => {
  const fiches = new Set(["/holter-ecg/dms-300-4l"]);
  it("page du site, fiche publiée ou adresse https : disponible", () => {
    expect(lienDisponible("/inscription", fiches)).toBe(true);
    expect(lienDisponible("/holter-ecg/dms-300-4l", fiches)).toBe(true);
    expect(lienDisponible("/holter-ecg/dms-300-4l?formule=achat", fiches)).toBe(true);
    expect(lienDisponible("https://exemple.fr/offre", fiches)).toBe(true);
  });
  it("fiche retirée, page inconnue, lien vide : indisponible (bouton omis)", () => {
    expect(lienDisponible("/holter-ecg/retire", fiches)).toBe(false);
    expect(lienDisponible("/inconnue", fiches)).toBe(false);
    expect(lienDisponible("http://exemple.fr", fiches)).toBe(false);
    expect(lienDisponible(null, fiches)).toBe(false);
  });
});
