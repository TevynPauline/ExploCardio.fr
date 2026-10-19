import { afterAll, describe, expect, it } from "vitest";
import { creerRegistre } from "@/connecteurs/registre";
import { panierPour, utiliserBons } from "@/domaine/catalogue/panier";
import { panierDetaille } from "@/domaine/commande/devis";
import { enregistrerEffetsCommande } from "@/domaine/commande/effets";
import { lancerPaiement } from "@/domaine/commande/paiement";
import { choisirLivraison, choisirPaiement, enregistrerAdresses, ouvrirCommande, TunnelRefuse } from "@/domaine/commande/tunnel";
import { traiterEvenementPaiement } from "@/domaine/paiements";
import { evenement } from "../commande/outils";
import { CARTE_SD, COMMANDE_1200, commandePayee, compteValide, nettoyer, remplirPanier } from "./outils";

// T015 — bons d'achat au panier (F06, US3, D1, A6) : montant choisi, plafonné par Odoo au
// montant éligible ; débités seulement au paiement, lots qui expirent le plus tôt d'abord.

enregistrerEffetsCommande();
afterAll(nettoyer);
const fidelite = () => creerRegistre(process.env).odoo().fidelite;
const adresses = { livraison: { ligne1: "2 rue Livraison", codePostal: "69003", ville: "Lyon" }, facturation: { ligne1: "2 rue Livraison", codePostal: "69003", ville: "Lyon" } };

/** Client avec 120 € de bons et un panier de 4 cartes SD (100 € HT). */
async function clientAvecBons(statut: "valide" | "suspendu" = "valide") {
  const compte = await compteValide();
  await commandePayee(compte.partenaireRef, COMMANDE_1200);
  if (statut !== "valide") {
    const { dbSite } = await import("@/lib/db/site");
    await dbSite().compteClient.update({ where: { id: compte.compteId }, data: { statut } });
  }
  await remplirPanier(compte.compteId, [{ defaultCode: CARTE_SD, formule: "achat", quantite: 4 }]);
  return compte;
}

async function devis(compteId: string) {
  const panier = (await panierPour({ compteId }, false))!;
  return (await panierDetaille(panier.id, compteId)).devis!.achat!;
}

async function payer(compteId: string) {
  let c = await enregistrerAdresses(await ouvrirCommande(compteId), adresses);
  c = await choisirLivraison(c, "standard", {});
  c = await choisirPaiement(c, "carte", null);
  await lancerPaiement(c, true);
  return c;
}

describe("bons d'achat au panier", () => {
  it("montant choisi enregistré ; « maximum » par défaut, plafonné au montant éligible des achats", async () => {
    const compte = await clientAvecBons();
    await utiliserBons({ compteId: compte.compteId }, true, 5_000);
    expect((await devis(compte.compteId)).bonsHt).toBe(5_000);
    await utiliserBons({ compteId: compte.compteId }, true);
    expect((await devis(compte.compteId)).bonsHt).toBe(10_000); // 120 € disponibles, 100 € d'achats
    await utiliserBons({ compteId: compte.compteId }, false);
    expect((await devis(compte.compteId)).bonsHt).toBe(0);
  });

  it("paiement abandonné : aucun débit ; commande payée : utilisation dans l'historique, lot le plus ancien d'abord", async () => {
    const compte = await clientAvecBons();
    await commandePayee(compte.partenaireRef, COMMANDE_1200); // second lot de 120 €, plus tardif
    await utiliserBons({ compteId: compte.compteId }, true, 5_000);
    const commande = await payer(compte.compteId);
    expect((await fidelite().lireCagnotte(compte.partenaireRef)).soldeHt).toBe(24_000);

    await traiterEvenementPaiement(evenement("paiement_reussi", { commandeRef: commande.ref }));
    const cagnotte = await fidelite().lireCagnotte(compte.partenaireRef);
    expect(cagnotte.soldeHt).toBe(19_000);
    expect(cagnotte.mouvements.find((m) => m.type === "utilisation")).toMatchObject({ montantHt: -5_000 });
    const lots = [...cagnotte.lots].sort((a, b) => a.validiteFin.getTime() - b.validiteFin.getTime());
    expect(lots.map((l) => l.resteHt)).toEqual([7_000, 12_000]);
  });

  it("compte suspendu : bons inutilisables et aucune commande, donc aucune prolongation des droits (A6)", async () => {
    const compte = await clientAvecBons("suspendu");
    const fin = (await fidelite().lireDroitsAssistance(compte.partenaireRef)).fin;
    await utiliserBons({ compteId: compte.compteId }, true);
    expect((await devis(compte.compteId)).bonsHt).toBe(0);
    await expect(ouvrirCommande(compte.compteId)).rejects.toBeInstanceOf(TunnelRefuse);
    expect((await fidelite().lireDroitsAssistance(compte.partenaireRef)).fin).toEqual(fin);
    expect((await fidelite().lireCagnotte(compte.partenaireRef)).soldeHt).toBe(12_000);
  });
});
