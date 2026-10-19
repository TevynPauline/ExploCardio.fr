import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { creerRegistre } from "@/connecteurs/registre";
import { enregistrerEffetsCommande, rattraperCommandes } from "@/domaine/commande/effets";
import { lancerPaiement } from "@/domaine/commande/paiement";
import { choisirLivraison, choisirPaiement, enregistrerAdresses, ouvrirCommande } from "@/domaine/commande/tunnel";
import { traiterEvenementPaiement } from "@/domaine/paiements";
import { premiereDatePour } from "@/domaine/location/offre";
import { lignesPanier, panierPour } from "@/domaine/catalogue/panier";
import { dbSite } from "@/lib/db/site";
import { dbDemo } from "@/lib/db/demo";
import { compteValide, evenement, nettoyer, remplirPanier } from "./outils";

// T015 — effets des paiements : une seule commande par paiement, réservation consommée une
// seule fois, refus, Odoo injoignable puis rattrapage (F04, US2, US3, FR-022 à FR-025).

enregistrerEffetsCommande();
afterAll(nettoyer);
const odoo = () => creerRegistre(process.env).odoo();
const adresses = { livraison: { ligne1: "2 rue Livraison", codePostal: "69003", ville: "Lyon" }, facturation: { ligne1: "2 rue Livraison", codePostal: "69003", ville: "Lyon" } };

async function stock(code: string) {
  return (await odoo().stock.lireDisponibilite([code]))[0]!.quantiteDisponible!;
}

async function commandePrete(lignes: Parameters<typeof remplirPanier>[1], moyens: { achat?: "carte" | "virement"; abonnement?: "carte" | "sepa" } = { achat: "carte" }) {
  const compte = await compteValide();
  await remplirPanier(compte.compteId, lignes);
  let c = await enregistrerAdresses(await ouvrirCommande(compte.compteId), adresses);
  // F05 : date de livraison de chaque mise à disposition (au plus tôt).
  const dates: Record<string, string> = {};
  for (const l of lignes.filter((x) => x.formule === "mise_a_disposition")) dates[l.defaultCode] = await premiereDatePour(l.defaultCode, "69003");
  c = await choisirLivraison(c, lignes.some((l) => l.formule === "achat") ? "standard" : null, dates);
  c = await choisirPaiement(c, moyens.achat ?? null, moyens.abonnement ?? null);
  return { compte, commande: c };
}

describe("paiement par carte", () => {
  it("réservation, paiement réussi rejoué deux fois → une seule commande, stock décompté une fois, panier vidé", async () => {
    const avant = await stock("EC-ELEC-HOLTER-50");
    const { compte, commande } = await commandePrete([{ defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 2 }]);
    const lancement = await lancerPaiement(commande, true);
    expect(lancement.type).toBe("paiement");
    expect(await stock("EC-ELEC-HOLTER-50")).toBe(avant - 2); // réservé
    // Double clic : même session.
    const bis = await lancerPaiement((await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } })), true);
    expect(bis).toEqual(lancement);

    const evt = evenement("paiement_reussi", { commandeRef: commande.ref, montantTtc: 1 });
    await traiterEvenementPaiement(evt);
    await traiterEvenementPaiement(evt);
    await traiterEvenementPaiement({ ...evt, id: `${evt.id}-bis` }); // même paiement, autre identifiant d'événement
    const c = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } });
    expect(c).toMatchObject({ etatAchat: "payee", etape: "terminee" });
    const commandes = await odoo().commandes.listerCommandes(compte.partenaireRef);
    expect(commandes).toHaveLength(1);
    expect(commandes[0]!.statut).toBe("payee");
    expect(await stock("EC-ELEC-HOLTER-50")).toBe(avant - 2); // pas de second décompte
    const panier = await panierPour({ compteId: compte.compteId }, false);
    expect(await lignesPanier(panier!.id)).toHaveLength(0);
    expect(await dbSite().messageDemonstration.count({ where: { destinataire: compte.email, objet: { startsWith: "Votre commande" } } })).toBe(1);
  });

  it("paiement refusé : réservation libérée, commande à repayer, panier conservé", async () => {
    const avant = await stock("EC-ELEC-HOLTER-50");
    const { compte, commande } = await commandePrete([{ defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 1 }]);
    await lancerPaiement(commande, true);
    await traiterEvenementPaiement(evenement("paiement_refuse", { commandeRef: commande.ref, paiementRef: null }));
    const c = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } });
    expect(c.etatAchat).toBe("refusee");
    expect(c.motifRefus).toBeTruthy();
    expect(await stock("EC-ELEC-HOLTER-50")).toBe(avant);
    expect(await lignesPanier((await panierPour({ compteId: compte.compteId }, false))!.id)).toHaveLength(1);
    // Nouvelle tentative : nouvelle session (autre clé).
    const relance = await lancerPaiement(c, true);
    expect(relance.type).toBe("paiement");
    expect((await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } })).tentative).toBe(2);
  });

  it("Odoo injoignable à la confirmation : « à enregistrer », puis rattrapé", async () => {
    const { compte, commande } = await commandePrete([{ defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 1 }]);
    await lancerPaiement(commande, true);
    await dbSite().panneSimulee.upsert({ where: { connecteur: "odoo" }, create: { connecteur: "odoo", active: true }, update: { active: true } });
    try {
      await traiterEvenementPaiement(evenement("paiement_reussi", { commandeRef: commande.ref }));
      expect((await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } })).etatAchat).toBe("a_enregistrer");
    } finally {
      await dbSite().panneSimulee.update({ where: { connecteur: "odoo" }, data: { active: false } });
    }
    await rattraperCommandes();
    expect((await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } })).etatAchat).toBe("payee");
    expect(await odoo().commandes.listerCommandes(compte.partenaireRef)).toHaveLength(1);
  });

  it("cadeau de bienvenue : ligne à 0 € à la première commande d'un bénéficiaire", async () => {
    const { compte, commande } = await commandePrete([{ defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 1 }]);
    const c = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compte.compteId } });
    await dbSite().attributionCadeau.create({ data: { numero: c.rpps!, compteId: c.id, etat: "droit_ouvert" } });
    await lancerPaiement(commande, true);
    await traiterEvenementPaiement(evenement("paiement_reussi", { commandeRef: commande.ref }));
    const [resume] = await odoo().commandes.listerCommandes(compte.partenaireRef);
    const lue = await odoo().commandes.lireCommande(resume!.ref);
    expect(lue.lignes.find((l) => l.prixUnitaireHt === 0)?.libelle).toMatch(/Tensiomètre/);
    expect((await dbSite().attributionCadeau.findUniqueOrThrow({ where: { numero: c.rpps! } })).etat).toMatch(/remis|en_attente_stock/);
  });
});

describe("mise à disposition et panier mixte", () => {
  // Un appareil du parc disponible pour chaque test (les essais successifs en louent).
  beforeEach(async () => {
    const lot = await dbDemo().numeroSerie.findFirstOrThrow({ where: { variante: { defaultCode: "EC-DMS-3004L-CLOUD" } }, orderBy: { numero: "asc" } });
    await dbDemo().numeroSerie.update({ where: { id: lot.id }, data: { statut: "disponible" } });
  });

  it("achat payé puis abonnement : abonnements créés, facture du premier mois, panier vidé", async () => {
    const { compte, commande } = await commandePrete(
      [
        { defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 1 },
        { defaultCode: "EC-DMS-3004L-CLOUD", formule: "mise_a_disposition", quantite: 1 },
      ],
      { achat: "carte", abonnement: "sepa" },
    );
    await lancerPaiement(commande, true);
    await traiterEvenementPaiement(evenement("paiement_reussi", { commandeRef: commande.ref }));
    let c = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } });
    expect(c.etatAchat).toBe("payee");
    expect(c.etape).not.toBe("terminee");
    const suite = await lancerPaiement(c, true);
    expect(suite.type).toBe("paiement");
    await traiterEvenementPaiement(evenement("paiement_reussi", { abonnementRef: commande.ref, montantTtc: 5880, moyen: "sepa" }));
    c = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } });
    expect(c).toMatchObject({ etatAbonnement: "payee", etape: "terminee" });
    expect(c.odooAbonnementRefs).toHaveLength(1);
    const locations = await odoo().location.listerLocations(compte.partenaireRef);
    expect(locations.map((l) => l.ref)).toContain(c.odooAbonnementRefs[0]);
    const factures = await odoo().factures.listerFactures(compte.partenaireRef);
    expect(factures.some((f) => f.montantTtc === 5880)).toBe(true);
  });

  it("achat par virement : commande en attente créée, puis abonnement payé aussitôt", async () => {
    const { compte, commande } = await commandePrete(
      [
        { defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 1 },
        { defaultCode: "EC-DMS-3004L-CLOUD", formule: "mise_a_disposition", quantite: 1 },
      ],
      { achat: "virement", abonnement: "carte" },
    );
    const lancement = await lancerPaiement(commande, true);
    expect(lancement.type).toBe("paiement"); // directement la session d'abonnement
    const c = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } });
    expect(c.etatAchat).toBe("en_attente_virement");
    expect(c.echeanceVirement).toBeTruthy();
    const [resume] = await odoo().commandes.listerCommandes(compte.partenaireRef);
    expect(resume!.statut).toBe("en_attente_paiement");
  });
});
