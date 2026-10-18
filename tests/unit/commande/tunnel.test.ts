import { afterAll, describe, expect, it } from "vitest";
import { ouvrirCommande, enregistrerAdresses, choisirLivraison, choisirPaiement, devisCommande, TunnelRefuse, SaisieInvalide, avantHeureLimiteExpress } from "@/domaine/commande/tunnel";
import { lancerPaiement } from "@/domaine/commande/paiement";
import { dbSite } from "@/lib/db/site";
import { ecrireParametre } from "@/lib/parametres";
import { compteValide, nettoyer, remplirPanier } from "./outils";

// T014 — tunnel de commande (F04, US2, FR-007 à FR-014).

afterAll(nettoyer);

const adresses = {
  livraison: { ligne1: "2 rue Livraison", codePostal: "69003", ville: "Lyon" },
  facturation: { ligne1: "3 rue Facture", codePostal: "69003", ville: "Lyon" },
};

describe("tunnel", () => {
  it("crée la commande du site, préremplie, puis la reprend à l'étape atteinte", async () => {
    const { compteId } = await compteValide();
    await remplirPanier(compteId, [{ defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 2 }]);
    const c = await ouvrirCommande(compteId);
    expect(c.ref).toMatch(/^EC-\d{4}-\d{6}$/);
    expect((c.adresses as { livraison: { ligne1: string } }).livraison.ligne1).toBe("1 rue du Test");
    await enregistrerAdresses(c, adresses);
    const reprise = await ouvrirCommande(compteId);
    expect(reprise.id).toBe(c.id);
    expect(reprise.etape).toBe("livraison");
  });

  it("refuse un compte non validé ou suspendu, et un panier vide ; accepte un compte en attente pour une mise à disposition seule", async () => {
    const enAttente = await compteValide({ statut: "en_attente" });
    await remplirPanier(enAttente.compteId, [{ defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 1 }]);
    await expect(ouvrirCommande(enAttente.compteId)).rejects.toBeInstanceOf(TunnelRefuse);
    const suspendu = await compteValide({ statut: "suspendu" });
    await remplirPanier(suspendu.compteId, [{ defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 1 }]);
    await expect(ouvrirCommande(suspendu.compteId)).rejects.toBeInstanceOf(TunnelRefuse);
    const vide = await compteValide();
    await expect(ouvrirCommande(vide.compteId)).rejects.toMatchObject({ redirection: "/catalogue" });
    const express = await compteValide({ statut: "en_attente" });
    await remplirPanier(express.compteId, [{ defaultCode: "EC-DMS-3004L-CLOUD", formule: "mise_a_disposition", quantite: 1 }]);
    await expect(ouvrirCommande(express.compteId)).resolves.toMatchObject({ etatAbonnement: "a_payer" });
  });

  it("refuse une livraison hors de France métropolitaine", async () => {
    const { compteId } = await compteValide();
    await remplirPanier(compteId, [{ defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 1 }]);
    const c = await ouvrirCommande(compteId);
    await expect(enregistrerAdresses(c, { ...adresses, livraison: { ...adresses.livraison, codePostal: "97400" } })).rejects.toBeInstanceOf(SaisieInvalide);
  });

  it("express : proposé seulement avant l'heure limite et si tout est en stock", async () => {
    const { compteId } = await compteValide();
    await remplirPanier(compteId, [{ defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 1 }]);
    const c = await enregistrerAdresses(await ouvrirCommande(compteId), adresses);
    const avant = await dbSite().parametre.findUnique({ where: { cle: "commande.heure_limite_express" } });
    try {
      await ecrireParametre("commande.heure_limite_express", "00:00", null);
      expect(await avantHeureLimiteExpress()).toBe(false);
      const devis = await devisCommande(c);
      expect(devis.modesLivraison.find((m) => m.code === "express")).toMatchObject({ disponible: false });
      await expect(choisirLivraison(c, "express")).rejects.toBeInstanceOf(SaisieInvalide);
      await ecrireParametre("commande.heure_limite_express", "23:59", null);
      const ok = await choisirLivraison(c, "express");
      expect(ok.modeLivraison).toBe("express");
    } finally {
      await ecrireParametre("commande.heure_limite_express", avant?.valeur ?? "14:00", null);
    }
  });

  it("virement refusé pour un abonnement ; CGV obligatoires", async () => {
    const { compteId } = await compteValide();
    await remplirPanier(compteId, [{ defaultCode: "EC-DMS-3004L-CLOUD", formule: "mise_a_disposition", quantite: 1 }]);
    const c = await enregistrerAdresses(await ouvrirCommande(compteId), adresses);
    await expect(choisirPaiement(c, null, "virement")).rejects.toBeInstanceOf(SaisieInvalide);
    const p = await choisirPaiement(c, null, "sepa");
    await expect(lancerPaiement(p, false)).rejects.toBeInstanceOf(SaisieInvalide);
  });
});
