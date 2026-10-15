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
