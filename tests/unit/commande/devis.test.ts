import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { ajouterAuPanier, panierPour } from "@/domaine/catalogue/panier";
import { panierDetaille } from "@/domaine/commande/devis";
import { dbSite } from "@/lib/db/site";
import { dbDemo } from "@/lib/db/demo";

// T008 — panier détaillé : devis d'Odoo, blocs, changements, indisponibles, panne (F04, US1).

const jetons: string[] = [];
async function panierAvec(lignes: { defaultCode: string; formule: "achat" | "mise_a_disposition"; quantite: number }[]) {
  const jeton = randomBytes(24).toString("base64url");
  jetons.push(jeton);
  for (const l of lignes) {
    const r = await ajouterAuPanier({ jeton }, l);
    if (!r.ok) throw new Error(r.message);
  }
  return (await panierPour({ jeton }, false))!;
}

afterAll(async () => {
  for (const j of jetons) {
    const p = await panierPour({ jeton: j }, false);
    if (p) await dbSite().panier.delete({ where: { id: p.id } });
  }
});

describe("panierDetaille", () => {
  it("deux blocs : paiement unique et abonnement mensuel, avec le devis d'Odoo", async () => {
    const panier = await panierAvec([
      { defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 2 },
      { defaultCode: "EC-DMS-3004L-CLOUD", formule: "mise_a_disposition", quantite: 1 },
    ]);
    const d = await panierDetaille(panier.id, null);
    expect(d.indisponible).toBe(false);
    expect(d.devis!.achat!.totalTtc).toBeGreaterThan(d.devis!.achat!.totalHt);
    expect(d.devis!.abonnement!.premierMoisHt).toBeGreaterThan(0);
    expect(d.lignes.map((l) => l.formule).sort()).toEqual(["achat", "mise_a_disposition"]);
    expect(d.bloquant).toBe(false);
  });

  it("code promo : remise appliquée, ou refus avec le motif", async () => {
    const panier = await panierAvec([{ defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 1 }]);
    await dbSite().panier.update({ where: { id: panier.id }, data: { codePromo: "DEMO10" } });
    expect((await panierDetaille(panier.id, null)).devis!.codePromo).toMatchObject({ applique: true });
    await dbSite().panier.update({ where: { id: panier.id }, data: { codePromo: "FAUX" } });
    expect((await panierDetaille(panier.id, null)).devis!.codePromo).toMatchObject({ applique: false, motif: expect.any(String) });
  });

  it("prix changé depuis l'ajout : signalé avec l'ancien prix", async () => {
    const panier = await panierAvec([{ defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 1 }]);
    await dbSite().lignePanier.updateMany({ where: { panierId: panier.id }, data: { prixHtConstate: 1 } });
    const [ligne] = (await panierDetaille(panier.id, null)).lignes;
    expect(ligne).toMatchObject({ prixAChange: true, ancienPrixHt: 1 });
  });

  it("article devenu indisponible : marqué et bloquant ; article en délai : délai rappelé", async () => {
    const panier = await panierAvec([
      { defaultCode: "EC-SUN-MINIBRAVO", formule: "achat", quantite: 1 },
      { defaultCode: "EC-KOCH-ULTRA", formule: "achat", quantite: 1 },
    ]);
    const stock = await dbDemo().stock.findFirstOrThrow({ where: { variante: { defaultCode: "EC-SUN-MINIBRAVO" } } });
    await dbDemo().stock.update({ where: { id: stock.id }, data: { quantite: 0, etatHorsStock: "indisponible" } });
    try {
      const d = await panierDetaille(panier.id, null);
      expect(d.lignes.find((l) => l.defaultCode === "EC-SUN-MINIBRAVO")).toMatchObject({ indisponible: true });
      expect(d.lignes.find((l) => l.defaultCode === "EC-KOCH-ULTRA")!.delaiJours).toEqual(expect.any(Number));
      expect(d.bloquant).toBe(true);
    } finally {
      await dbDemo().stock.update({ where: { id: stock.id }, data: { quantite: stock.quantite, etatHorsStock: stock.etatHorsStock } });
    }
  });

  it("Odoo injoignable : lignes lisibles, aucun montant affirmé", async () => {
    const panier = await panierAvec([{ defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 1 }]);
    await dbSite().panneSimulee.upsert({ where: { connecteur: "odoo" }, create: { connecteur: "odoo", active: true }, update: { active: true } });
    try {
      const d = await panierDetaille(panier.id, null);
      expect(d.indisponible).toBe(true);
      expect(d.devis).toBeNull();
      expect(d.lignes).toHaveLength(1);
      expect(d.bloquant).toBe(true);
    } finally {
      await dbSite().panneSimulee.update({ where: { connecteur: "odoo" }, data: { active: false } });
    }
  });
});
