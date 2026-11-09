import { describe, expect, it } from "vitest";
import { creerRegistre } from "@/connecteurs/registre";
import type { LigneDevis } from "@/connecteurs/odoo/interfaces";
import { prixTtc } from "@/domaine/catalogue/prix";

// T006 — invariant des totaux (F22, SC-002) : la somme des TTC des lignes et des frais de port
// est égale au total TTC du connecteur, sur 20 paniers variés (sans bons d'achat).

const TVA_FRAIS = 20;

describe("totaux TTC du panier", () => {
  it("Σ TTC des lignes + TTC du port = total TTC, sur 20 paniers", async () => {
    const odoo = creerRegistre(process.env).odoo();
    const refs = (await odoo.catalogue.listerReferences()).filter((r) => r.prixHt > 0 && r.type !== "logiciel");
    expect(refs.length).toBeGreaterThan(5);
    let verifies = 0;
    for (let i = 0; i < 20; i++) {
      const choisies = [refs[i % refs.length]!, refs[(i * 7 + 3) % refs.length]!, refs[(i * 13 + 5) % refs.length]!].slice(0, 1 + (i % 3));
      const lignes: LigneDevis[] = [...new Map(choisies.map((r) => [r.defaultCode, r])).values()].map((r, j) => ({
        defaultCode: r.defaultCode,
        formule: "achat",
        quantite: 1 + ((i + j) % 4) * (i % 5 === 0 ? 5 : 1),
      }));
      const devis = await odoo.commandes.calculerDevis({ partenaireRef: null, lignes, codePromo: i % 4 === 1 ? "DEMO10" : null });
      const a = devis.achat;
      if (!a) continue;
      const lignesTtc = devis.lignes.filter((l) => l.formule === "achat").reduce((s, l) => s + prixTtc(l.totalHt, l.tauxTva), 0);
      expect(lignesTtc + prixTtc(a.fraisPortHt + a.fraisSpecifiquesHt, TVA_FRAIS), `panier ${i}`).toBe(a.totalTtc);
      verifies++;
    }
    expect(verifies).toBeGreaterThanOrEqual(18);
  });
});
