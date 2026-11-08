import { describe, expect, it } from "vitest";
import { origineCanonique, politiqueIndexation } from "@/lib/referencement/politique";

const attente = { DOMAINES_PAGE_ATTENTE: "www.explocardio.fr", SITE_MODE: "demo", SITE_URL: "https://demo.example.test/" };

describe("politiqueIndexation (F21, R1)", () => {
  it("adresse de la page d'attente → attente (casse et port ignorés)", () => {
    expect(politiqueIndexation("www.explocardio.fr", attente)).toBe("attente");
    expect(politiqueIndexation("WWW.ExploCardio.fr:443", attente)).toBe("attente");
  });

  it("production → ouvert", () => {
    expect(politiqueIndexation("www.explocardio.fr", { SITE_MODE: "prod" })).toBe("ouvert");
  });

  it("démonstration, configuration absente ou inconnue, hôte absent → ferme", () => {
    expect(politiqueIndexation("demo.example.test", attente)).toBe("ferme");
    expect(politiqueIndexation("www.explocardio.fr", {})).toBe("ferme");
    expect(politiqueIndexation("www.explocardio.fr", { SITE_MODE: "production" })).toBe("ferme");
    expect(politiqueIndexation(null, attente)).toBe("ferme");
    expect(politiqueIndexation(undefined, {})).toBe("ferme");
  });
});

describe("origineCanonique", () => {
  it("attente → premier domaine d'attente en https", () => {
    expect(origineCanonique("attente", { DOMAINES_PAGE_ATTENTE: "www.explocardio.fr, autre.test" })).toBe("https://www.explocardio.fr");
  });

  it("ouvert → SITE_URL sans barre finale", () => {
    expect(origineCanonique("ouvert", { SITE_URL: "https://www.explocardio.fr/" })).toBe("https://www.explocardio.fr");
  });
});
