import { expect, it } from "vitest";
import { cleDeTest, suiteDeContrat } from "../harness";
import { COMMANDES_REFERENCE } from "./fidelite-reference";
import { livraison, nouveauPartenaire, REF, type Registre } from "./outils";

// Règles de F06 avec les paramètres par défaut : 0 % sous 500 € HT, 5 % de 500 € à 1 000 € HT,
// 10 % au-dessus, sur le montant éligible (consommables et accessoires seulement).

async function commanderPuisAppliquer(registre: Registre, lignes: { defaultCode: string; quantite: number }[], options: { partenaireRef?: string; bonsHt?: number; mode?: "carte" | "virement" } = {}) {
  const partenaireRef = options.partenaireRef ?? (await nouveauPartenaire(registre));
  const commande = { partenaireRef, lignes, livraison, paiement: { mode: options.mode ?? ("carte" as const), reference: "FICT-PAY-fidelite" }, bonsUtilisesHt: options.bonsHt };
  const { ref } =
    options.mode === "virement"
      ? await registre.odoo().commandes.creerCommandeVirement(commande, cleDeTest("fidelite"))
      : await registre.odoo().commandes.creerCommandePayee(commande, cleDeTest("fidelite"));
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

  // ------------------------------------------------------------------ Jeu de référence (FR-039)

  for (const c of COMMANDES_REFERENCE) {
    it(`référence — ${c.nom}`, async () => {
      const estimation = await fidelite().estimerGains(null, c.lignes);
      expect(estimation).toMatchObject({ montantEligibleHt: c.eligibleHt, bonsAchatHt: c.bonsHt });
      const { partenaireRef } = await commanderPuisAppliquer(registre, c.lignes);
      const cagnotte = await fidelite().lireCagnotte(partenaireRef);
      expect(cagnotte.soldeHt).toBe(c.bonsHt);
      expect(cagnotte.soldeHt).toBe(cagnotte.mouvements.reduce((s, m) => s + m.montantHt, 0)); // SC-004
    });
  }

  it("estimation pour un visiteur : palier suivant et seuil des droits", async () => {
    const e = await fidelite().estimerGains(null, [{ defaultCode: REF.accessoire, quantite: 16 }]);
    expect(e.palierSuivant).toEqual({ manqueHt: 10_000, tauxPourcent: 5 });
    expect(e.seuilDroitsHt).toBeGreaterThan(0);
    expect(e.droitsJusquAu).toBeInstanceOf(Date); // 400 € ≥ seuil de démonstration (300 €)
  });

  it("bons utilisés dans l'ordre de leur expiration, et exclus du montant éligible", async () => {
    const { partenaireRef } = await commanderPuisAppliquer(registre, [{ defaultCode: REF.consommable, quantite: 5 }, { defaultCode: REF.accessoire, quantite: 16 }]);
    // Solde 120 € ; nouvelle commande de 800 € HT payée avec 50 € de bons.
    const deuxieme = await commanderPuisAppliquer(registre, [{ defaultCode: REF.consommable, quantite: 5 }], { partenaireRef, bonsHt: 5_000 });
    const cagnotte = await fidelite().lireCagnotte(partenaireRef);
    expect(cagnotte.mouvements.find((m) => m.type === "utilisation")?.montantHt).toBe(-5_000);
    // Montant éligible : 800 − 50 = 750 € → 5 % = 37,50 €.
    expect(cagnotte.mouvements.find((m) => m.type === "credit" && m.commandeRef === deuxieme.commandeRef)?.montantHt).toBe(3_750);
    expect(cagnotte.soldeHt).toBe(12_000 - 5_000 + 3_750);
    expect(cagnotte.lots.reduce((s, l) => s + l.resteHt, 0)).toBe(cagnotte.soldeHt);
  });

  it("remboursement intégral : bons et droits retirés, bons utilisés rendus à leur validité d'origine ; rejouer ne change rien", async () => {
    const premiere = await commanderPuisAppliquer(registre, [{ defaultCode: REF.consommable, quantite: 5 }, { defaultCode: REF.accessoire, quantite: 16 }]);
    const avant = await fidelite().lireCagnotte(premiere.partenaireRef);
    const validiteOrigine = avant.lots[0]!.validiteFin;
    const seconde = await commanderPuisAppliquer(registre, [{ defaultCode: REF.consommable, quantite: 5 }], { partenaireRef: premiere.partenaireRef, bonsHt: 2_000 });
    const lue = await registre.odoo().commandes.lireCommande(seconde.commandeRef);
    await registre.odoo().commandes.enregistrerRemboursement(
      { commandeRef: seconde.commandeRef, montantTtc: lue.montantTtc, motif: "test", source: "stripe", referenceStripe: cleDeTest("re") },
      cleDeTest("remb"),
    );
    await fidelite().appliquerRegles(seconde.commandeRef);
    const apres = await fidelite().lireCagnotte(premiere.partenaireRef);
    expect(apres.soldeHt).toBe(12_000); // crédit de la seconde retiré, 20 € rendus
    const rendu = apres.mouvements.find((m) => m.type === "restitution");
    expect(rendu?.montantHt).toBe(2_000);
    expect(rendu?.validiteFin?.getTime()).toBe(validiteOrigine.getTime());
    const rejeu = await fidelite().appliquerRegles(seconde.commandeRef);
    expect(rejeu.mouvements).toEqual([]);
    expect((await fidelite().lireCagnotte(premiere.partenaireRef)).soldeHt).toBe(12_000);
  });

  it("remboursement partiel : crédit recalculé sur le montant restant, au taux du palier atteint", async () => {
    const { partenaireRef, commandeRef } = await commanderPuisAppliquer(registre, [{ defaultCode: REF.consommable, quantite: 5 }, { defaultCode: REF.accessoire, quantite: 16 }]);
    const lue = await registre.odoo().commandes.lireCommande(commandeRef);
    // Remboursement de la moitié : 600 € restants → 5 % = 30 €.
    await registre.odoo().commandes.enregistrerRemboursement(
      { commandeRef, montantTtc: Math.round(lue.montantTtc / 2), motif: "partiel", source: "stripe", referenceStripe: cleDeTest("re") },
      cleDeTest("remb"),
    );
    await fidelite().appliquerRegles(commandeRef);
    expect((await fidelite().lireCagnotte(partenaireRef)).soldeHt).toBe(Math.round(Math.round(120_000 * (1 - Math.round(lue.montantTtc / 2) / lue.montantTtc)) * 0.05));
  });

  it("droits : retirés quand la commande qui les a ouverts est remboursée ; historique tenu", async () => {
    const { partenaireRef, commandeRef } = await commanderPuisAppliquer(registre, [{ defaultCode: REF.consommable, quantite: 5 }]);
    expect((await fidelite().lireDroitsAssistance(partenaireRef)).statut).toBe("actif");
    const lue = await registre.odoo().commandes.lireCommande(commandeRef);
    await registre.odoo().commandes.enregistrerRemboursement({ commandeRef, montantTtc: lue.montantTtc, motif: "test", source: "stripe", referenceStripe: cleDeTest("re") }, cleDeTest("remb"));
    await fidelite().appliquerRegles(commandeRef);
    const droits = await fidelite().lireDroitsAssistance(partenaireRef);
    expect(droits.statut).toBe("inactif");
    expect(droits.historique.map((e) => e.type)).toEqual(["ouverture", "retrait"]);
  });

  it("commande par virement annulée faute de paiement : rien crédité, bons utilisés rendus à leur validité d'origine", async () => {
    const premiere = await commanderPuisAppliquer(registre, [{ defaultCode: REF.consommable, quantite: 5 }, { defaultCode: REF.accessoire, quantite: 16 }]);
    const validite = (await fidelite().lireCagnotte(premiere.partenaireRef)).lots[0]!.validiteFin;
    const virement = await commanderPuisAppliquer(registre, [{ defaultCode: REF.consommable, quantite: 1 }], { partenaireRef: premiere.partenaireRef, bonsHt: 3_000, mode: "virement" });
    await registre.odoo().commandes.annulerCommandeEnAttente(virement.commandeRef, "Virement non reçu");
    const c = await fidelite().lireCagnotte(premiere.partenaireRef);
    expect(c.soldeHt).toBe(12_000);
    expect(c.mouvements.find((m) => m.type === "restitution")?.validiteFin?.getTime()).toBe(validite.getTime());
    expect(c.mouvements.some((m) => m.type === "credit" && m.commandeRef === virement.commandeRef)).toBe(false);
  });

  it("deux commandes enregistrées en même temps : chacune créditée une fois (SC-005)", async () => {
    const partenaireRef = await nouveauPartenaire(registre);
    const lignes = [{ defaultCode: REF.consommable, quantite: 5 }];
    await Promise.all([commanderPuisAppliquer(registre, lignes, { partenaireRef }), commanderPuisAppliquer(registre, lignes, { partenaireRef })]);
    expect((await fidelite().lireCagnotte(partenaireRef)).soldeHt).toBe(8_000);
  });

  it("assistance à l'acte : intervention ouverte, ni bons ni droits", async () => {
    const regles = await fidelite().lireReglesProgramme();
    const { partenaireRef } = await commanderPuisAppliquer(registre, [{ defaultCode: regles.articleAssistanceActe, quantite: 1 }]);
    expect(await fidelite().listerInterventions(partenaireRef)).toEqual([expect.objectContaining({ etat: "disponible" })]);
    expect((await fidelite().lireCagnotte(partenaireRef)).soldeHt).toBe(0);
    expect((await fidelite().lireDroitsAssistance(partenaireRef)).statut).toBe("inactif");
  });

  it("promotions en cours : remise automatique et vente flash, avec prix d'origine et remisé", async () => {
    const promos = await fidelite().promotionsEnCours(new Date());
    expect(promos.some((p) => p.type === "vente_flash" && p.articles.length > 0)).toBe(true);
    for (const p of promos) for (const a of p.articles) expect(a.prixRemiseHt).toBeLessThan(a.prixHt);
    expect(promos.every((p) => p.type !== "code_promo" || p.code)).toBe(true);
  });

  it("lit l'offre de bienvenue : article offert et disponibilité (F02)", async () => {
    const offre = await fidelite().lireOffreBienvenue();
    expect(offre).not.toBeNull();
    expect(offre!.defaultCode).toBe("EC-BIENVENUE-TENSIOMETRE");
    expect(["disponible", "delai", "indisponible"]).toContain(offre!.disponibilite.etat);
  });
});
