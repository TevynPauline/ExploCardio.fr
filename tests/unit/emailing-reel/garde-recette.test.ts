import { describe, expect, it } from "vitest";
import { adresseAutorisee, creerGardeRecette, gardeRecetteActive, listeIgnoreeEnProduction } from "@/lib/garde-recette-emailing";

// T004 (F25, FR-016, FR-017) : garde des adresses autorisées sur le site de recette.

const liste = ["equipe@explocardio.fr", "@exemple.fr"];

describe("adresses autorisées", () => {
  it("accepte une adresse exacte et un domaine exact, sans tenir compte de la casse", () => {
    expect(adresseAutorisee("Equipe@ExploCardio.fr", liste)).toBe(true);
    expect(adresseAutorisee("quelquun@exemple.fr", liste)).toBe(true);
  });

  it("refuse les sous-domaines, les domaines qui ressemblent et les autres adresses", () => {
    expect(adresseAutorisee("x@sous.exemple.fr", liste)).toBe(false);
    expect(adresseAutorisee("x@exemple.fr.pirate.com", liste)).toBe(false);
    expect(adresseAutorisee("autre@explocardio.fr", liste)).toBe(false);
    expect(adresseAutorisee("pas-une-adresse", liste)).toBe(false);
  });
});

describe("garde de recette", () => {
  const recette = { CONNECTOR_EMAILING: "real", EMAILING_ENVIRONNEMENT: "recette", EMAILING_ADRESSES_AUTORISEES: liste.join(",") };

  it("en recette, refuse une adresse hors liste avec la cause attendue", () => {
    const garde = creerGardeRecette(recette);
    expect(() => garde.verifier("equipe@explocardio.fr")).not.toThrow();
    expect(() => garde.verifier("cardiologue@cabinet.fr")).toThrow(expect.objectContaining({ code: "OPERATION_REFUSED", details: { cause: "adresse_non_autorisee_en_recette" } }));
    expect(gardeRecetteActive(recette)).toBe(true);
  });

  it("en production, tout est permis et une liste renseignée est signalée", () => {
    const prod = { ...recette, EMAILING_ENVIRONNEMENT: "production" };
    expect(creerGardeRecette(prod).permet("cardiologue@cabinet.fr")).toBe(true);
    expect(gardeRecetteActive(prod)).toBe(false);
    expect(listeIgnoreeEnProduction(prod)).toBe(true);
    expect(listeIgnoreeEnProduction({ ...prod, EMAILING_ADRESSES_AUTORISEES: "" })).toBe(false);
  });

  it("en démonstration, la garde n'est jamais active", () => {
    expect(gardeRecetteActive({ ...recette, CONNECTOR_EMAILING: "demo" })).toBe(false);
  });
});
