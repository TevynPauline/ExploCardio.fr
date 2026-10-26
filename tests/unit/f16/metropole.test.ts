import { describe, expect, it } from "vitest";
import { MESSAGE_HORS_METROPOLE, PAYS_AUTRE, refusLivraison } from "@/domaine/comptes/adresses";
import { validerInscription } from "@/domaine/comptes/inscription";
import { saisieDeTest } from "../comptes/outils";

// T038 — livraison en France métropolitaine seulement (F16, US8, FR-029).

describe("refusLivraison", () => {
  it("refuse l'outre-mer (97, 98) sur le code postal", () => {
    expect(refusLivraison({ codePostal: "97400" }, "livraison")).toEqual({ "livraison.codePostal": MESSAGE_HORS_METROPOLE });
    expect(refusLivraison({ codePostal: "98000" }, "livraison")).toEqual({ "livraison.codePostal": MESSAGE_HORS_METROPOLE });
  });

  it("refuse un autre pays sur le pays, quel que soit le format du code postal", () => {
    expect(refusLivraison({ codePostal: "1000", pays: PAYS_AUTRE }, "livraison")).toEqual({ "livraison.pays": MESSAGE_HORS_METROPOLE });
    expect(refusLivraison({ codePostal: "75001", pays: PAYS_AUTRE }, "livraison")).toEqual({ "livraison.pays": MESSAGE_HORS_METROPOLE });
  });

  it("accepte la métropole et la Corse", () => {
    expect(refusLivraison({ codePostal: "75001", pays: "france" }, "livraison")).toBeNull();
    expect(refusLivraison({ codePostal: "20000" }, "livraison")).toBeNull();
    expect(refusLivraison({ codePostal: "20200" }, "livraison")).toBeNull();
  });
});

describe("inscription", () => {
  it("refuse une livraison à La Réunion ou à l'étranger", async () => {
    const reunion = await validerInscription(saisieDeTest({ adresseLivraison: { ligne1: "1 rue du Port", codePostal: "97400", ville: "Saint-Denis" } }));
    expect(reunion["adresseLivraison.codePostal"]).toBe(MESSAGE_HORS_METROPOLE);
    const belgique = await validerInscription(saisieDeTest({ adresseCabinet: { ligne1: "1 rue Royale", codePostal: "1000", ville: "Bruxelles", pays: PAYS_AUTRE } }));
    expect(belgique["adresseLivraison.pays"]).toBe(MESSAGE_HORS_METROPOLE);
  });

  it("accepte une facturation hors métropole quand la livraison est en métropole", async () => {
    const e = await validerInscription(
      saisieDeTest({ adresseLivraison: { ligne1: "2 rue du Test", codePostal: "75001", ville: "Paris" }, adresseFacturation: { ligne1: "1 rue du Port", codePostal: "97400", ville: "Saint-Denis" } }),
    );
    expect(Object.keys(e).filter((k) => k.startsWith("adresse"))).toEqual([]);
  });
});
