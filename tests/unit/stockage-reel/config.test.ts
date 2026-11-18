import { describe, expect, it } from "vitest";
import { compartimentIncoherent, modeDuConnecteur, regionStockage, stockageIncoherent, variablesManquantes } from "@/lib/config";

// F26 (T003, FR-003, FR-004, R2) : configuration du stockage et garde du nom du compartiment.

const complet = {
  CONNECTOR_STOCKAGE: "real",
  STOCKAGE_ENVIRONNEMENT: "recette",
  STOCKAGE_COMPARTIMENT: "explocardio-recette",
  STOCKAGE_CLE_ACCES: "SCWTEST",
  STOCKAGE_CLE_SECRETE: "secret",
};

describe("configuration du stockage", () => {
  it("démonstration par défaut, sans aucune variable exigée", () => {
    expect(modeDuConnecteur("stockage", {})).toBe("demo");
  });

  it("recette complète avec un compartiment « recette »", () => {
    expect(variablesManquantes("stockage", complet)).toEqual([]);
    expect(stockageIncoherent(complet)).toBe(false);
  });

  it("environnement absent ou inconnu : manquant", () => {
    expect(variablesManquantes("stockage", { ...complet, STOCKAGE_ENVIRONNEMENT: undefined })).toEqual(["STOCKAGE_ENVIRONNEMENT"]);
    expect(variablesManquantes("stockage", { ...complet, STOCKAGE_ENVIRONNEMENT: "prod" })).toEqual(["STOCKAGE_ENVIRONNEMENT"]);
  });

  it("compartiment de production sur la recette, ou l'inverse : compartiment compté manquant et alerte", () => {
    const inverse = { ...complet, STOCKAGE_COMPARTIMENT: "explocardio-production" };
    expect(variablesManquantes("stockage", inverse)).toEqual(["STOCKAGE_COMPARTIMENT"]);
    expect(stockageIncoherent(inverse)).toBe(true);
    const melange = { ...complet, STOCKAGE_ENVIRONNEMENT: "production", STOCKAGE_COMPARTIMENT: "explocardio-recette-production" };
    expect(compartimentIncoherent(melange)).toBe(true);
    expect(compartimentIncoherent({ ...complet, STOCKAGE_ENVIRONNEMENT: "production", STOCKAGE_COMPARTIMENT: "ExploCardio-PRODUCTION" })).toBe(false);
  });

  it("l'alerte ne concerne que le mode réel", () => {
    expect(stockageIncoherent({ ...complet, CONNECTOR_STOCKAGE: "demo", STOCKAGE_COMPARTIMENT: "explocardio-production" })).toBe(false);
  });

  it("région de Paris par défaut", () => {
    expect(regionStockage({})).toBe("fr-par");
    expect(regionStockage({ STOCKAGE_REGION: "nl-ams" })).toBe("nl-ams");
  });
});
