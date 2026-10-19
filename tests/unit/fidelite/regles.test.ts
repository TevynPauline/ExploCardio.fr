import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { creerRegistre } from "@/connecteurs/registre";
import * as administration from "@/connecteurs/odoo/demo/administration";
import { ajusterCagnotte } from "@/connecteurs/odoo/demo/fidelite-admin";
import { suivreCommandes } from "@/domaine/commande/suivi";
import { COMMANDE_1200, ELECTRODES, commandePayee, compteValide, nettoyer } from "./outils";

// T025 — règles du programme (F06, US7, FR-016, FR-021, FR-026, FR-027) : une modification ne
// touche que les commandes suivantes ; un ajustement manuel apparaît avec son motif.

const fidelite = () => creerRegistre(process.env).odoo().fidelite;
let initiales: administration.ParametresCommerciaux;
beforeAll(async () => {
  initiales = await administration.lireParametresCommerciaux();
});
afterEach(() => administration.modifierParametresCommerciaux(initiales));
afterAll(nettoyer);

describe("règles du programme", () => {
  it("taux modifié : la commande suivante au nouveau taux, le crédit passé inchangé, même après un remboursement partiel (SC-002)", async () => {
    const compte = await compteValide();
    const avant = await commandePayee(compte.partenaireRef, COMMANDE_1200);
    expect((await fidelite().lireCagnotte(compte.partenaireRef)).soldeHt).toBe(12_000);

    await administration.modifierParametresCommerciaux({
      ...initiales,
      paliers: initiales.paliers.map((p) => (p.tauxPourcent === 10 ? { ...p, tauxPourcent: 15 } : p)),
    });
    await commandePayee(compte.partenaireRef, COMMANDE_1200);
    expect((await fidelite().lireCagnotte(compte.partenaireRef)).soldeHt).toBe(12_000 + 18_000);

    // Remboursement d'un carton (160 € HT) sur la première commande : recalcul avec les règles figées
    // (10 %) : 1 040 € éligibles → 104 €, soit 16 € retirés.
    await administration.deciderRemboursement(avant.ref, 19_200, "Un carton abîmé");
    await suivreCommandes();
    expect((await fidelite().lireCagnotte(compte.partenaireRef)).soldeHt).toBe(30_000 - 1_600);
  });

  it("seuil, durée ou prolongation modifiés : droits acquis inchangés", async () => {
    const compte = await compteValide();
    await commandePayee(compte.partenaireRef, [{ defaultCode: ELECTRODES, quantite: 5 }]);
    const { fin } = await fidelite().lireDroitsAssistance(compte.partenaireRef);
    await administration.modifierParametresCommerciaux({ ...initiales, seuilDroitsCentimes: 200_000, dureeDroitsJours: 30, plafondDroitsJours: 60, prolongation: "remise_a_zero" });
    const apres = await fidelite().lireDroitsAssistance(compte.partenaireRef);
    expect(apres.statut).toBe("actif");
    expect(apres.fin).toEqual(fin);
    expect((await fidelite().lireReglesProgramme()).seuilDroitsHt).toBe(200_000);
  });

  it("ajustement manuel : mouvement « ajustement » avec son motif dans l'historique", async () => {
    const compte = await compteValide();
    await ajusterCagnotte(compte.partenaireRef, 2_500, "Geste commercial après un retard", "tests");
    const { soldeHt, mouvements } = await fidelite().lireCagnotte(compte.partenaireRef);
    expect(soldeHt).toBe(2_500);
    expect(mouvements).toEqual([expect.objectContaining({ type: "ajustement", montantHt: 2_500, motif: "Geste commercial après un retard" })]);
  });
});
