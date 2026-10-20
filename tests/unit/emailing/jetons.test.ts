import { describe, expect, it } from "vitest";
import { lireJeton, signerJeton } from "@/domaine/emailing/jetons";

// T005 — liens de préférences sans connexion (F10, D8) : jeton signé propre à l'adresse.

describe("jetons de préférences", () => {
  it("un jeton signé redonne l'adresse, en minuscules", () => {
    expect(lireJeton(signerJeton("Dr.Valdrin@Demo.Explocardio.test"))).toBe("dr.valdrin@demo.explocardio.test");
  });

  it("même jeton quelle que soit la casse ; adresses différentes → jetons différents", () => {
    expect(signerJeton("A@exemple.test")).toBe(signerJeton("a@exemple.test"));
    expect(signerJeton("a@exemple.test")).not.toBe(signerJeton("b@exemple.test"));
  });

  it("refuse un jeton falsifié, tronqué ou vide", () => {
    const j = signerJeton("a@exemple.test");
    const [adresse, signature] = j.split(".");
    const autre = Buffer.from("b@exemple.test").toString("base64url");
    expect(lireJeton(`${autre}.${signature}`)).toBeNull();
    expect(lireJeton(`${adresse}.${signature!.slice(0, -2)}`)).toBeNull();
    expect(lireJeton(adresse!)).toBeNull();
    expect(lireJeton("")).toBeNull();
  });
});
