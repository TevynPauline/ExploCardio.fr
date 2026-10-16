import { expect, it } from "vitest";
import { cleDeTest, suiteDeContrat } from "../harness";
import { livraison, nouveauPartenaire, REF, type Registre } from "./outils";

// Règles de F06 avec les paramètres par défaut : 0 % sous 500 € HT, 5 % de 500 € à 1 000 € HT,
// 10 % au-dessus, sur le montant éligible (consommables et accessoires seulement).

async function commanderPuisAppliquer(registre: Registre, lignes: { defaultCode: string; quantite: number }[]) {
  const partenaireRef = await nouveauPartenaire(registre);
  const { ref } = await registre.odoo().commandes.creerCommandePayee(
    { partenaireRef, lignes, livraison, paiement: { mode: "carte", reference: "FICT-PAY-fidelite" } },
    cleDeTest("fidelite"),
  );
  const resultat = await registre.odoo().fidelite.appliquerRegles(ref);
  return { partenaireRef, commandeRef: ref, resultat };
}

suiteDeContrat("odoo", "fidélité (contracts/odoo.md §7, règles de F06)", ({ registre }) => {
  const fidelite = () => registre.odoo().fidelite;

  it("SC-001 de F06 : une commande éligible de 1 200 € HT crédite 120 €", async () => {
    // 5 cartons d'électrodes (5 × 160 €) + 16 cartes SD (16 × 25 €) = 1 200 € HT
    const { partenaireRef } = await commanderPuisAppliquer(registre, [
      { defaultCode: REF.consommable, quantite: 5 },
      { defaultCode: REF.accessoire, quantite: 16 },
    ]);
    const cagnotte = await fidelite().lireCagnotte(partenaireRef);
    expect(cagnotte.soldeHt).toBe(12_000);
    expect(cagnotte.mouvements[0]).toMatchObject({ type: "credit", montantHt: 12_000 });
    expect(cagnotte.prochaineExpiration?.montantHt).toBe(12_000);
  });

  it("une commande éligible de 800 € HT crédite 40 € (palier à 5 %)", async () => {
    const { partenaireRef } = await commanderPuisAppliquer(registre, [{ defaultCode: REF.consommable, quantite: 5 }]);
    expect((await fidelite().lireCagnotte(partenaireRef)).soldeHt).toBe(4_000);
  });

  it("sous 500 € HT, aucun crédit ; les équipements ne donnent pas droit au crédit", async () => {
    const petit = await commanderPuisAppliquer(registre, [{ defaultCode: REF.accessoire, quantite: 4 }]);
    expect((await fidelite().lireCagnotte(petit.partenaireRef)).soldeHt).toBe(0);
    const equipement = await commanderPuisAppliquer(registre, [{ defaultCode: REF.equipement, quantite: 1 }]);
    expect((await fidelite().lireCagnotte(equipement.partenaireRef)).soldeHt).toBe(0);
  });

  it("appliquer deux fois les règles ne crédite rien de plus (F06, FR-018)", async () => {
    const { partenaireRef, commandeRef } = await commanderPuisAppliquer(registre, [{ defaultCode: REF.consommable, quantite: 5 }]);
    const second = await fidelite().appliquerRegles(commandeRef);
    expect(second.mouvements).toEqual([]);
    expect((await fidelite().lireCagnotte(partenaireRef)).soldeHt).toBe(4_000);
  });

  it("une commande éligible au-dessus du seuil ouvre les droits d'assistance", async () => {
    const { partenaireRef } = await commanderPuisAppliquer(registre, [{ defaultCode: REF.consommable, quantite: 5 }]);
    const droits = await fidelite().lireDroitsAssistance(partenaireRef);
    expect(droits.statut).toBe("actif");
    expect(droits.fin!.getTime()).toBeGreaterThan(Date.now());
  });

  it("lit les droits d'assistance des cas utiles", async () => {
    expect((await fidelite().lireDroitsAssistance(REF.partenaireDroitsActifs)).statut).toBe("actif");
    expect((await fidelite().lireDroitsAssistance(REF.partenaireSansDroits)).statut).toBe("inactif");
  });

  it("estime les gains d'un panier sans rien écrire", async () => {
    const partenaireRef = await nouveauPartenaire(registre);
    const estimation = await fidelite().estimerGains(partenaireRef, [
      { defaultCode: REF.consommable, quantite: 5 },
      { defaultCode: REF.accessoire, quantite: 16 },
      { defaultCode: REF.equipement, quantite: 1 },
    ]);
    expect(estimation).toMatchObject({ montantEligibleHt: 120_000, tauxPourcent: 10, bonsAchatHt: 12_000 });
    expect(estimation.droitsJusquAu).toBeInstanceOf(Date);
    expect((await fidelite().lireCagnotte(partenaireRef)).soldeHt).toBe(0);
  });

  it("lit l'offre de bienvenue : article offert et disponibilité (F02)", async () => {
    const offre = await fidelite().lireOffreBienvenue();
    expect(offre).not.toBeNull();
    expect(offre!.defaultCode).toBe("EC-BIENVENUE-TENSIOMETRE");
    expect(["disponible", "delai", "indisponible"]).toContain(offre!.disponibilite.etat);
  });
});
