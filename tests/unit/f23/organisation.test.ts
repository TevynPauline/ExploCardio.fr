import { describe, expect, it } from "vitest";
import {
  blocsAffiches,
  cibleApresAnimation,
  MESSAGE_AUCUN_BLOC,
  normaliserOrganisation,
  ORGANISATION_DEFAUT,
  validerOrganisation,
} from "@/domaine/organisation-accueil";

// F23 (FR-001, FR-002, FR-015, FR-018) : organisation des blocs de l'accueil.

describe("organisation de l'accueil", () => {
  it("ordre de départ : animation, gammes, pourquoi, offre digitale masquée, carrousel", () => {
    expect(ORGANISATION_DEFAUT.map((p) => p.bloc)).toEqual(["animation", "gammes", "pourquoi", "offre-digitale", "offres"]);
    expect(ORGANISATION_DEFAUT.find((p) => p.bloc === "offre-digitale")?.affiche).toBe(false);
    expect(blocsAffiches([...ORGANISATION_DEFAUT])).toEqual(["animation", "gammes", "pourquoi", "offres"]);
  });

  it("valeur absente ou illisible → ordre de départ", () => {
    expect(normaliserOrganisation(null)).toEqual(ORGANISATION_DEFAUT);
    expect(normaliserOrganisation("pas du json")).toEqual(ORGANISATION_DEFAUT);
    expect(normaliserOrganisation('{"bloc":"offres"}')).toEqual(ORGANISATION_DEFAUT);
  });

  it("blocs inconnus et doublons ignorés, blocs absents ajoutés masqués en fin", () => {
    const o = normaliserOrganisation(
      JSON.stringify([
        { bloc: "offres", affiche: true },
        { bloc: "inconnu", affiche: true },
        { bloc: "offres", affiche: false },
        { bloc: "animation", affiche: false },
      ]),
    );
    expect(o).toEqual([
      { bloc: "offres", affiche: true },
      { bloc: "animation", affiche: false },
      { bloc: "gammes", affiche: false },
      { bloc: "pourquoi", affiche: false },
      { bloc: "offre-digitale", affiche: false },
    ]);
  });

  it("aucun bloc affiché en base → ordre de départ", () => {
    const tousMasques = ORGANISATION_DEFAUT.map((p) => ({ ...p, affiche: false }));
    expect(normaliserOrganisation(JSON.stringify(tousMasques))).toEqual(ORGANISATION_DEFAUT);
  });

  it("enregistrement : refuse aucun bloc affiché, un bloc manquant ou un doublon", () => {
    const tousMasques = ORGANISATION_DEFAUT.map((p) => ({ ...p, affiche: false }));
    expect(validerOrganisation(tousMasques)).toEqual({ ok: false, message: MESSAGE_AUCUN_BLOC });
    expect(validerOrganisation(ORGANISATION_DEFAUT.slice(1)).ok).toBe(false);
    const doublon = [...ORGANISATION_DEFAUT.slice(1), { bloc: "offres", affiche: true }];
    expect(validerOrganisation(doublon).ok).toBe(false);
    expect(validerOrganisation([...ORGANISATION_DEFAUT].reverse()).ok).toBe(true);
  });

  it("un bloc indisponible (carrousel vide) n'est pas rendu", () => {
    expect(blocsAffiches([...ORGANISATION_DEFAUT], (b) => b !== "offres")).toEqual(["animation", "gammes", "pourquoi"]);
  });

  it("« Voir l'offre » mène au bloc qui suit l'animation, sinon au contact", () => {
    expect(cibleApresAnimation(["animation", "gammes", "offres"])).toBe("#acces-rapide");
    expect(cibleApresAnimation(["offres", "animation", "pourquoi"])).toBe("#pourquoi-choisir");
    expect(cibleApresAnimation(["gammes", "animation"])).toBe("#contact");
  });
});
