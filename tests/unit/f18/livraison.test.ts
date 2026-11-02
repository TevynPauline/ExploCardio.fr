import { afterAll, describe, expect, it } from "vitest";
import { codePostalLivrable, MESSAGE_HORS_METROPOLE, PAYS_AUTRE, refusLivraison } from "@/domaine/comptes/adresses";
import { commanderDevis, demanderDevis } from "@/domaine/commande/devis-client";
import { dbSite } from "@/lib/db/site";
import { compteValide, nettoyer, remplirPanier } from "../commande/outils";

// T004 — F18 (US1, FR-001 à FR-005) : la commande en ligne est livrée en France métropolitaine
// continentale ; la Corse, l'outre-mer et l'étranger sont orientés vers l'équipe.

afterAll(nettoyer);

describe("codePostalLivrable", () => {
  it.each(["75008", "69003", "06000", "95100", "01000"])("accepte %s (continent)", (cp) => {
    expect(codePostalLivrable(cp)).toBe(true);
  });
  it.each(["20000", "20090", "20200", "20620", "97411", "98000", "2A000", ""])("refuse « %s »", (cp) => {
    expect(codePostalLivrable(cp)).toBe(false);
  });
});

describe("refusLivraison", () => {
  it("renvoie le message unique pour la Corse, l'outre-mer et un autre pays", () => {
    expect(refusLivraison({ codePostal: "20000" }, "livraison")).toEqual({ "livraison.codePostal": MESSAGE_HORS_METROPOLE });
    expect(refusLivraison({ codePostal: "97411" }, "livraison")).toEqual({ "livraison.codePostal": MESSAGE_HORS_METROPOLE });
    expect(refusLivraison({ codePostal: "1000", pays: PAYS_AUTRE }, "livraison")).toEqual({ "livraison.pays": MESSAGE_HORS_METROPOLE });
    expect(MESSAGE_HORS_METROPOLE).toContain("France métropolitaine continentale");
    expect(MESSAGE_HORS_METROPOLE).toContain("Corse");
  });
  it("ne refuse rien sur le continent", () => {
    expect(refusLivraison({ codePostal: "69003" }, "livraison")).toBeNull();
  });
});

describe("devis vers la Corse", () => {
  it("une demande de devis est refusée avec le message unique", async () => {
    const { compteId } = await compteValide({ adresse: "20000" });
    await remplirPanier(compteId, [{ defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 1 }]);
    expect(await demanderDevis(compteId)).toEqual({ ok: false, motif: "hors_metropole", message: MESSAGE_HORS_METROPOLE });
  });

  it("un devis émis avant que l'adresse ne devienne corse n'est plus commandé en ligne, et le panier n'est pas recomposé", async () => {
    const { compteId } = await compteValide();
    await remplirPanier(compteId, [{ defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 2 }]);
    const devis = await demanderDevis(compteId);
    expect(devis.ok).toBe(true);
    if (!devis.ok) return;
    await dbSite().adresse.updateMany({ where: { compteId }, data: { codePostal: "20000", ville: "Ajaccio" } });
    const panierAvant = await dbSite().lignePanier.findMany({ where: { panier: { compteId } }, orderBy: { id: "asc" } });
    expect(await commanderDevis(compteId, devis.ref)).toEqual({ ok: false, code: "hors_metropole" });
    const panierApres = await dbSite().lignePanier.findMany({ where: { panier: { compteId } }, orderBy: { id: "asc" } });
    expect(panierApres).toEqual(panierAvant);
  });
});
