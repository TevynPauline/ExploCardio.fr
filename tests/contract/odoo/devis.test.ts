import { expect, it } from "vitest";
import { NotFound } from "@/connecteurs/erreurs";
import { cleDeTest, suiteDeContrat } from "../harness";
import { livraison, nouveauPartenaire, reapprovisionnerDemo, REF } from "./outils";

// F16 (US6) : devis enregistrés d'Odoo, transformables en commande
// (specs/016-evolutions-fin-phase-1/contracts/connecteur-odoo-devis.md).

const adresse = { adresse: livraison.adresse, codePostal: livraison.codePostal, ville: livraison.ville };

/** En démonstration seulement : modifie l'instantané ou la validité d'un devis fictif. */
async function retoucherDevisDemo(ref: string, maj: { prixUnitaireHt?: number; expire?: boolean }) {
  const { modeDuConnecteur } = await import("@/lib/config");
  if (modeDuConnecteur("odoo") !== "demo") return false;
  const { dbDemo } = await import("@/lib/db/demo");
  const c = await dbDemo().commandeVente.findUniqueOrThrow({ where: { ref } });
  const livraisonDevis = c.livraison as { devis: { calcul: { lignes: { prixUnitaireHt: number; totalHt: number; quantite: number; remiseHt: number }[] } } };
  if (maj.prixUnitaireHt !== undefined) {
    for (const l of livraisonDevis.devis.calcul.lignes) {
      l.prixUnitaireHt = maj.prixUnitaireHt;
      l.totalHt = maj.prixUnitaireHt * l.quantite - l.remiseHt;
    }
  }
  await dbDemo().commandeVente.update({
    where: { ref },
    data: { livraison: livraisonDevis, ...(maj.expire ? { validiteLe: new Date(Date.now() - 60_000) } : {}) },
  });
  return true;
}

suiteDeContrat("odoo", "devis enregistrés (F16, contracts/connecteur-odoo-devis.md)", ({ registre }) => {
  const commandes = () => registre.odoo().commandes;

  it("crée un devis une seule fois par clé, avec le calcul de calculerDevis et 30 jours de validité", async () => {
    const partenaireRef = await nouveauPartenaire(registre);
    const lignes = [{ defaultCode: REF.consommable, formule: "achat" as const, quantite: 3 }];
    const cle = cleDeTest("devis");
    const a = await commandes().creerDevis({ partenaireRef, lignes, livraison: adresse }, cle);
    const b = await commandes().creerDevis({ partenaireRef, lignes, livraison: adresse }, cle);
    expect(b.ref).toBe(a.ref);
    expect(a.etat).toBe("valide");
    expect(a.commandeRef).toBeNull();

    const calcul = await commandes().calculerDevis({ partenaireRef, lignes });
    expect(a.calcul.achat?.totalTtc).toBe(calcul.achat?.totalTtc);
    expect(a.totalTtc).toBe(calcul.achat?.totalTtc);
    const jours = Math.round((a.validiteLe.getTime() - a.creeLe.getTime()) / 86_400_000);
    expect(jours).toBe(30);

    const liste = await commandes().listerDevis(partenaireRef);
    expect(liste.map((d) => d.ref)).toEqual([a.ref]);
    // Un devis n'est pas une commande (Mon compte → Commandes).
    expect((await commandes().listerCommandes(partenaireRef)).some((c) => c.ref === a.ref)).toBe(false);
    await expect(commandes().lireCommande(a.ref)).rejects.toBeInstanceOf(NotFound);
  });

  it("garde le premier mois et les mois suivants d'une mise à disposition", async () => {
    const partenaireRef = await nouveauPartenaire(registre);
    const d = await commandes().creerDevis(
      { partenaireRef, lignes: [{ defaultCode: REF.equipementMad, formule: "mise_a_disposition", quantite: 1 }], livraison: adresse },
      cleDeTest("devis-mad"),
    );
    expect(d.calcul.abonnement?.moisSuivantsHt).toBeGreaterThan(0);
    expect(d.demande).toEqual([{ defaultCode: REF.equipementMad, formule: "mise_a_disposition", quantite: 1 }]);
  });

  it("produit le PDF du devis et refuse celui d'un autre client", async () => {
    const partenaireRef = await nouveauPartenaire(registre);
    const autre = await nouveauPartenaire(registre);
    const d = await commandes().creerDevis({ partenaireRef, lignes: [{ defaultCode: REF.accessoire, formule: "achat", quantite: 1 }], livraison: adresse }, cleDeTest("devis-pdf"));
    const pdf = await commandes().lireDevisPdf(partenaireRef, d.ref);
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
    await expect(commandes().lireDevisPdf(autre, d.ref)).rejects.toBeInstanceOf(NotFound);
    await expect(commandes().lireDevis(autre, d.ref)).rejects.toBeInstanceOf(NotFound);
  });

  it("confirme le devis en commande aux prix du devis ; un devis expiré n'impose plus ses prix", async () => {
    await reapprovisionnerDemo([REF.consommable]);
    const partenaireRef = await nouveauPartenaire(registre);
    const lignes = [{ defaultCode: REF.consommable, formule: "achat" as const, quantite: 2 }];
    const d = await commandes().creerDevis({ partenaireRef, lignes, livraison: adresse }, cleDeTest("devis-confirme"));
    const demo = await retoucherDevisDemo(d.ref, { prixUnitaireHt: 100 });

    if (demo) {
      // Prix du devis (plus bas que le prix du jour) repris par le calcul du panier et du tunnel.
      const avecDevis = await commandes().calculerDevis({ partenaireRef, lignes, devisRef: d.ref });
      expect(avecDevis.lignes[0]!.prixUnitaireHt).toBe(100);
    }

    const { ref } = await commandes().creerCommandePayee(
      { partenaireRef, lignes: lignes.map(({ defaultCode, quantite }) => ({ defaultCode, quantite })), livraison, paiement: { mode: "carte", reference: "FICT-PAY-devis" }, devisRef: d.ref },
      cleDeTest("commande-devis"),
    );
    expect(ref).toBe(d.ref);
    const commande = await commandes().lireCommande(ref);
    if (demo) expect(commande.lignes[0]!.prixUnitaireHt).toBe(100);
    const lu = await commandes().lireDevis(partenaireRef, d.ref);
    expect(lu.etat).toBe("commande");
    expect(lu.commandeRef).toBe(ref);
    // Déjà commandé : il ne fixe plus aucun prix.
    const apres = await commandes().calculerDevis({ partenaireRef, lignes, devisRef: d.ref });
    expect(apres.lignes[0]!.prixUnitaireHt).not.toBe(100);

    const e = await commandes().creerDevis({ partenaireRef, lignes, livraison: adresse }, cleDeTest("devis-expire"));
    if (await retoucherDevisDemo(e.ref, { prixUnitaireHt: 100, expire: true })) {
      expect((await commandes().lireDevis(partenaireRef, e.ref)).etat).toBe("expire");
      const jour = await commandes().calculerDevis({ partenaireRef, lignes, devisRef: e.ref });
      expect(jour.lignes[0]!.prixUnitaireHt).not.toBe(100);
    }
    const etats = (await commandes().listerDevis(partenaireRef)).map((x) => [x.ref, x.etat]);
    expect(etats[0]![0]).toBe(e.ref);
  });
});
