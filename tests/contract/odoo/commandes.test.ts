import { expect, it } from "vitest";
import { cleDeTest, suiteDeContrat } from "../harness";
import { livraison, nouveauPartenaire, REF } from "./outils";

suiteDeContrat("odoo", "commandes (contracts/odoo.md §4)", ({ registre }) => {
  const commandes = () => registre.odoo().commandes;

  it("crée une commande payée une seule fois par clé et la relit", async () => {
    const partenaireRef = await nouveauPartenaire(registre);
    const cle = cleDeTest("commande");
    const commande = {
      partenaireRef,
      lignes: [{ defaultCode: REF.consommable, quantite: 2 }],
      livraison,
      paiement: { mode: "carte" as const, reference: `FICT-PAY-${cle}` },
    };
    const a = await commandes().creerCommandePayee(commande, cle);
    const b = await commandes().creerCommandePayee(commande, cle);
    expect(b.ref).toBe(a.ref);

    const liste = await commandes().listerCommandes(partenaireRef);
    expect(liste.filter((c) => c.ref === a.ref)).toHaveLength(1);

    const lue = await commandes().lireCommande(a.ref);
    expect(lue.partenaireRef).toBe(partenaireRef);
    expect(lue.lignes).toHaveLength(1);
    expect(lue.montantTtc).toBe(lue.montantHt + lue.tva);
    expect(lue.fraisPortHt).toBe(1500);
  });

  it("ajoute une ligne offerte à 0 € (cadeau de bienvenue)", async () => {
    const partenaireRef = await nouveauPartenaire(registre);
    const { ref } = await commandes().creerCommandePayee(
      {
        partenaireRef,
        lignes: [
          { defaultCode: REF.consommable, quantite: 1 },
          { defaultCode: "EC-BIENVENUE-TENSIOMETRE", quantite: 1, offerte: true },
        ],
        livraison,
        paiement: { mode: "carte", reference: "FICT-PAY-bienvenue" },
      },
      cleDeTest("bienvenue"),
    );
    const c = await commandes().lireCommande(ref);
    expect(c.lignes.find((l) => l.defaultCode === "EC-BIENVENUE-TENSIOMETRE")?.prixUnitaireHt).toBe(0);
  });

  it("lève OutOfStock si un article est indisponible", async () => {
    const partenaireRef = await nouveauPartenaire(registre);
    await expect(
      commandes().creerCommandePayee(
        {
          partenaireRef,
          lignes: [{ defaultCode: REF.enRupture, quantite: 1 }],
          livraison,
          paiement: { mode: "carte", reference: "FICT-PAY-rupture" },
        },
        cleDeTest("rupture"),
      ),
    ).rejects.toMatchObject({ code: "OUT_OF_STOCK" });
  });

  it("lève NotFound pour une commande inconnue", async () => {
    await expect(commandes().lireCommande("FICT-SO-INCONNUE")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// F04 — devis, virement, annulation, changements, remboursements (contracts/odoo.md de F04).
suiteDeContrat("odoo", "commandes : opérations ajoutées par F04", ({ registre }) => {
  const commandes = () => registre.odoo().commandes;
  const adresse = { adresse: "1 rue du Test", codePostal: "75001", ville: "Paris" };

  it("devis : totaux cohérents, TVA par taux, franco et frais des équipements volumineux", async () => {
    const d = await commandes().calculerDevis({ partenaireRef: null, lignes: [{ defaultCode: REF.consommable, formule: "achat", quantite: 1 }], modeLivraison: "standard" });
    const a = d.achat!;
    const net = d.lignes.reduce((s, l) => s + l.totalHt, 0);
    expect(a.totalHt).toBe(net + a.fraisPortHt + a.fraisSpecifiquesHt - a.bonsHt);
    expect(a.totalTtc).toBe(a.totalHt + a.tva);
    expect(d.modeLivraison).toBe("standard");
    const standard = d.modesLivraison.find((m) => m.code === "standard")!;
    if (net >= d.seuilFrancoHt && d.seuilFrancoHt > 0) expect(standard.francoAtteint).toBe(true);
    // Petit panier sous le seuil : forfait payé.
    const petit = await commandes().calculerDevis({ partenaireRef: null, lignes: [{ defaultCode: REF.accessoire, formule: "achat", quantite: 1 }], modeLivraison: "standard" });
    expect(petit.achat!.fraisPortHt).toBeGreaterThan(0);
    // Équipement volumineux : frais propres, hors franco.
    const lourd = await commandes().calculerDevis({ partenaireRef: null, lignes: [{ defaultCode: "EC-KOCH-KORELE8000", formule: "achat", quantite: 1 }], modeLivraison: "standard" });
    expect(lourd.achat!.fraisSpecifiquesHt).toBeGreaterThan(0);
  });

  it("devis : code promo appliqué ou refusé avec le motif ; règle de cumul expliquée", async () => {
    const lignes = [{ defaultCode: REF.consommable, formule: "achat" as const, quantite: 1 }];
    const ok = await commandes().calculerDevis({ partenaireRef: null, lignes, codePromo: "DEMO10" });
    expect(ok.codePromo).toMatchObject({ code: "DEMO10", applique: true });
    expect(ok.achat!.remiseCodePromoHt).toBeGreaterThan(0);
    const ko = await commandes().calculerDevis({ partenaireRef: null, lignes, codePromo: "INCONNU" });
    expect(ko.codePromo).toMatchObject({ applique: false, motif: expect.any(String) });
    expect(ko.achat!.remiseCodePromoHt).toBe(0);
    expect(ok.regleCumul.length).toBeGreaterThan(10);
  });

  it("devis : bons plafonnés, total jamais négatif ; mise à disposition dans le bloc mensuel", async () => {
    const d = await commandes().calculerDevis({
      partenaireRef: REF.partenaireDroitsActifs,
      lignes: [
        { defaultCode: REF.consommable, formule: "achat", quantite: 1 },
        { defaultCode: REF.equipementMad, formule: "mise_a_disposition", quantite: 1 },
      ],
      bonsDemandesHt: 99_999_999,
    });
    expect(d.achat!.bonsHt).toBeLessThanOrEqual(d.lignes.filter((l) => l.formule === "achat").reduce((s, l) => s + l.totalHt, 0));
    expect(d.achat!.totalHt).toBeGreaterThanOrEqual(0);
    expect(d.abonnement!.premierMoisHt).toBeGreaterThan(0);
    expect(d.abonnement!.moisSuivantsTtc).toBeGreaterThan(d.abonnement!.moisSuivantsHt);
  });

  it("devis : express absent quand un article n'est pas en stock", async () => {
    const d = await commandes().calculerDevis({ partenaireRef: null, lignes: [{ defaultCode: REF.enDelai, formule: "achat", quantite: 1 }], modeLivraison: "express" });
    const express = d.modesLivraison.find((m) => m.code === "express")!;
    expect(express.disponible).toBe(false);
    expect(express.motif).toBeTruthy();
    expect(d.modeLivraison).not.toBe("express");
  });

  it("commande payée : montants identiques au devis, idempotente", async () => {
    const partenaireRef = await nouveauPartenaire(registre);
    const lignes = [{ defaultCode: REF.consommable, quantite: 2 }];
    const devis = await commandes().calculerDevis({ partenaireRef, lignes: lignes.map((l) => ({ ...l, formule: "achat" as const })), modeLivraison: "standard" });
    const cle = cleDeTest("devis");
    const c = { partenaireRef, lignes, livraison: { ...adresse, mode: "standard" }, paiement: { mode: "carte" as const, reference: `FICT-PAY-${cle}` } };
    const a = await commandes().creerCommandePayee(c, cle);
    expect((await commandes().creerCommandePayee(c, cle)).ref).toBe(a.ref);
    const lue = await commandes().lireCommande(a.ref);
    expect(lue.montantTtc).toBe(devis.achat!.totalTtc);
    expect(lue.statut).toBe("payee");
  });

  it("virement : en attente, stock réservé, échéance ; annulation : stock rendu", async () => {
    const partenaireRef = await nouveauPartenaire(registre);
    const avant = (await registre.odoo().stock.lireDisponibilite([REF.consommable]))[0]!.quantiteDisponible!;
    const cle = cleDeTest("virement");
    const { ref, echeance } = await commandes().creerCommandeVirement(
      { partenaireRef, lignes: [{ defaultCode: REF.consommable, quantite: 1 }], livraison: { ...adresse, mode: "standard" }, paiement: { mode: "virement", reference: cle } },
      cle,
    );
    expect(echeance.getTime()).toBeGreaterThan(Date.now());
    expect((await commandes().lireCommande(ref)).statut).toBe("en_attente_paiement");
    expect((await registre.odoo().stock.lireDisponibilite([REF.consommable]))[0]!.quantiteDisponible).toBe(avant - 1);
    await commandes().annulerCommandeEnAttente(ref, "Virement non reçu");
    expect((await commandes().lireCommande(ref)).statut).toBe("annulee");
    expect((await registre.odoo().stock.lireDisponibilite([REF.consommable]))[0]!.quantiteDisponible).toBe(avant);
  });

  it("remboursement : avoir à la suite, partiel puis total, idempotent ; changements listés", async () => {
    const depuis = new Date(Date.now() - 1000);
    const partenaireRef = await nouveauPartenaire(registre);
    const cle = cleDeTest("rembourse");
    const { ref } = await commandes().creerCommandePayee(
      { partenaireRef, lignes: [{ defaultCode: REF.consommable, quantite: 1 }], livraison: { ...adresse, mode: "standard" }, paiement: { mode: "carte", reference: `FICT-PAY-${cle}` } },
      cle,
    );
    const total = (await commandes().lireCommande(ref)).montantTtc;
    const r1 = await commandes().enregistrerRemboursement({ commandeRef: ref, montantTtc: 1000, motif: "Geste commercial", source: "stripe", referenceStripe: "FICT-RE-1" }, `${cle}:r1`);
    expect((await commandes().enregistrerRemboursement({ commandeRef: ref, montantTtc: 1000, motif: "Geste commercial", source: "stripe", referenceStripe: "FICT-RE-1" }, `${cle}:r1`)).avoir).toBe(r1.avoir);
    expect((await commandes().lireCommande(ref)).statut).toBe("remboursee_partiellement");
    await commandes().enregistrerRemboursement({ commandeRef: ref, montantTtc: total - 1000, motif: "Retour", source: "stripe", referenceStripe: "FICT-RE-2" }, `${cle}:r2`);
    const lue = await commandes().lireCommande(ref);
    expect(lue.statut).toBe("remboursee");
    expect(lue.remboursementsTtc).toBe(total);
    const factures = await registre.odoo().factures.listerFactures(partenaireRef);
    expect(factures.filter((f) => f.type === "avoir")).toHaveLength(2);
    const changements = await commandes().listerChangements(depuis);
    expect(changements.find((c) => c.ref === ref)).toMatchObject({ statut: "remboursee" });
  });

  it("liste les remboursements décidés dans Odoo à exécuter", async () => {
    const liste = await commandes().listerRemboursementsAExecuter();
    expect(Array.isArray(liste)).toBe(true);
  });

  it("lève NotFound pour une commande inconnue", async () => {
    await expect(commandes().annulerCommandeEnAttente("FICT-SO-INCONNUE", "test")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
