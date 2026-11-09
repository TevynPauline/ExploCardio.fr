import { describe, expect, it } from "vitest";
import { prixTtc } from "@/domaine/catalogue/prix";
import { emailsCommandes } from "@/emails/modeles-commandes";
import { emailsLocations } from "@/emails/modeles-locations";
import { euros } from "@/lib/montants";
import { produit } from "@/lib/referencement/schema";

// T025, T030 — emails et données structurées (F22, FR-014, FR-015) : TTC d'abord, HT ensuite.

const norm = (t: string) => t.replace(/\s+/g, " ");

describe("emails : montants TTC d'abord", () => {
  it("confirmation de commande : lignes et total en TTC, puis HT", async () => {
    const e = await emailsCommandes.confirmation({
      ref: "FICT-SO-F22",
      lignes: [{ libelle: "Électrodes", quantite: 2, totalHt: 32000, tauxTva: 20 }],
      totalHt: 33500,
      totalTtc: 40200,
      virement: null,
    });
    for (const version of [e.texte, e.rendu]) {
      const t = norm(version);
      expect(t).toContain(norm(`${euros(38400)} TTC (soit ${euros(32000)} HT)`));
      expect(t).toContain(norm(`Total : ${euros(40200)} TTC, soit ${euros(33500)} HT.`));
    }
  });

  it("devis envoyé : même présentation", async () => {
    const e = await emailsCommandes.devisEnvoye({
      ref: "FICT-SO-F22",
      lignes: [{ libelle: "Brassard", quantite: 1, totalHt: 5000, tauxTva: 20 }],
      totalHt: 6500,
      totalTtc: 7800,
      validiteLe: new Date("2026-12-01T12:00:00Z"),
    });
    expect(norm(e.texte)).toContain(norm(`Total : ${euros(7800)} TTC, soit ${euros(6500)} HT.`));
  });

  it("rappel de retour d'une location : TTC puis HT", async () => {
    const e = await emailsLocations.rappelRetour({ appareil: "Holter", dateLimiteRetour: new Date("2026-12-01T12:00:00Z"), facturationLe: new Date("2026-12-02T12:00:00Z"), montantHt: 5000 });
    expect(norm(e.texte)).toContain(norm(`${euros(prixTtc(5000, 20))} TTC, soit ${euros(5000)} HT`));
  });
});

describe("données structurées (F21) : prix TTC affiché en premier", () => {
  it("le prix déclaré est le TTC calculé comme sur la fiche", () => {
    for (const [ht, taux] of [[199000, 20], [4990, 20], [123456, 20]] as const) {
      const p = produit("https://www.explocardio.fr", {
        nom: "Article",
        reference: "REF",
        marque: "DMS",
        images: [],
        chemin: "/holter-ecg/article",
        variantes: [{ prixTtc: prixTtc(ht, taux) / 100, prixHt: ht / 100, disponibilite: "en_stock" }],
      });
      expect((p.offers as { price: number }).price).toBe(prixTtc(ht, taux) / 100);
    }
  });
});
