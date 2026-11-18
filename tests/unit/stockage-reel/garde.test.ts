import { describe, expect, it } from "vitest";
import { creerRegistre } from "@/connecteurs/registre";

// F26 (T016, US3, FR-003) : compartiment incohérent avec l'environnement → configuration
// incomplète à chaque appel, sans jamais revenir à la démonstration.

const incoherent = {
  ...process.env,
  CONNECTOR_STOCKAGE: "real",
  STOCKAGE_ENVIRONNEMENT: "recette",
  STOCKAGE_COMPARTIMENT: "explocardio-production",
  STOCKAGE_CLE_ACCES: "SCWTEST",
  STOCKAGE_CLE_SECRETE: "secret",
};

describe("garde du compartiment", () => {
  it("dépôt et lecture refusés, la variable du compartiment est citée", async () => {
    const stockage = creerRegistre(incoherent).stockage();
    const attendu = { code: "CONFIGURATION_INCOMPLETE", details: { variablesManquantes: ["STOCKAGE_COMPARTIMENT"] } };
    await expect(stockage.deposer("/stockage/produits/a.png", "image/png", new Uint8Array(1))).rejects.toMatchObject(attendu);
    await expect(stockage.lire("/stockage/produits/a.png")).rejects.toMatchObject(attendu);
    await expect(stockage.existe("/stockage/produits/a.png")).rejects.toMatchObject(attendu);
  });
});
