import { afterAll, describe, expect, it, vi } from "vitest";
import { ouvrirCommande, enregistrerAdresses, choisirPaiement, TunnelRefuse, SaisieInvalide, CLIENT_BLOQUE } from "@/domaine/commande/tunnel";
import { registre } from "@/connecteurs/registre";
import { lancerPaiement } from "@/domaine/commande/paiement";
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

  it("virement refusé pour un abonnement ; CGV obligatoires", async () => {
    const { compteId } = await compteValide();
    await remplirPanier(compteId, [{ defaultCode: "EC-DMS-3004L-CLOUD", formule: "mise_a_disposition", quantite: 1 }]);
    const c = await enregistrerAdresses(await ouvrirCommande(compteId), adresses);
    await expect(choisirPaiement(c, null, "virement")).rejects.toBeInstanceOf(SaisieInvalide);
    const p = await choisirPaiement(c, null, "sepa");
    await expect(lancerPaiement(p, false)).rejects.toBeInstanceOf(SaisieInvalide);
  });

  it("client « mauvais payeur » dans Odoo : renvoyé au panier avant tout paiement, carte ou virement", async () => {
    const { compteId } = await compteValide();
    await remplirPanier(compteId, [{ defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 1 }]);
    const c = await enregistrerAdresses(await ouvrirCommande(compteId), adresses);
    const clients = registre.odoo().clients;
    const lire = clients.lireSituation.bind(clients);
    const espion = vi.spyOn(clients, "lireSituation").mockImplementation(async (ref) => {
      const s = await lire(ref);
      return { ...s, partenaire: { ...s.partenaire, commandesBloquees: true } };
    });
    try {
      for (const moyen of ["carte", "virement"] as const) {
        const p = await choisirPaiement(c, moyen, null);
        expect(await lancerPaiement(p, true)).toEqual({ type: "redirection", url: "/panier", message: CLIENT_BLOQUE });
      }
    } finally {
      espion.mockRestore();
    }
  });
});
