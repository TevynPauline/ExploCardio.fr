import { describe, expect, it } from "vitest";
import { adressesAutorisees, environnementEmailing, variablesManquantes } from "@/lib/config";

// T003 (F25, R8) : variables du mode réel de l'outil d'envoi.

const base = { CONNECTOR_EMAILING: "real", EMAILING_API_KEY: "cle-de-test" };

describe("configuration du connecteur emailing réel", () => {
  it("exige l'environnement, avec une valeur admise", () => {
    expect(variablesManquantes("emailing", base)).toContain("EMAILING_ENVIRONNEMENT");
    expect(variablesManquantes("emailing", { ...base, EMAILING_ENVIRONNEMENT: "test" })).toContain("EMAILING_ENVIRONNEMENT");
    expect(environnementEmailing({ EMAILING_ENVIRONNEMENT: "test" })).toBeNull();
  });

  it("en recette, exige la liste des adresses autorisées", () => {
    expect(variablesManquantes("emailing", { ...base, EMAILING_ENVIRONNEMENT: "recette" })).toEqual(["EMAILING_ADRESSES_AUTORISEES"]);
    expect(variablesManquantes("emailing", { ...base, EMAILING_ENVIRONNEMENT: "recette", EMAILING_ADRESSES_AUTORISEES: " , " })).toEqual(["EMAILING_ADRESSES_AUTORISEES"]);
    expect(variablesManquantes("emailing", { ...base, EMAILING_ENVIRONNEMENT: "recette", EMAILING_ADRESSES_AUTORISEES: "a@b.fr" })).toEqual([]);
  });

  it("en production, la liste n'est pas exigée", () => {
    expect(variablesManquantes("emailing", { ...base, EMAILING_ENVIRONNEMENT: "production" })).toEqual([]);
  });

  it("normalise la liste : minuscules, espaces retirés, vides écartés", () => {
    expect(adressesAutorisees({ EMAILING_ADRESSES_AUTORISEES: " Contact@ExploCardio.fr ,, @Exemple.FR " })).toEqual(["contact@explocardio.fr", "@exemple.fr"]);
  });
});
