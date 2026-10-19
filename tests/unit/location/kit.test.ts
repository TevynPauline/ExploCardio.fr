import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import * as admin from "@/connecteurs/odoo/demo/locations-admin";
import { ajouterAuPanier, lignesPanier, panierPour, supprimerLigne } from "@/domaine/catalogue/panier";
import { kitsObligatoires } from "@/domaine/location/kit";
import { verifierAvantPaiement, enregistrerAdresses, ouvrirCommande, choisirLivraison, choisirPaiement } from "@/domaine/commande/tunnel";
import { premiereDatePour } from "@/domaine/location/offre";
import { creerRegistre } from "@/connecteurs/registre";
import { dbDemo } from "@/lib/db/demo";
import { dbSite } from "@/lib/db/site";
import { adresses, compteValide, nettoyer, rendreParcDesTests } from "./outils";

// T027 — kit d'accessoires : ajouté d'office une seule fois, jamais facturé deux fois d'office
// au même client pour un même type d'appareil (F05, US5, FR-013 à FR-016, SC-003).

const HOLTER = "EC-DMS-3004L-CLOUD";
const HOLTER_2 = "EC-DMS-3002E-CLOUD"; // même type d'appareil, même kit
const KIT = "EC-KIT-HOLTER-MAD";
const MAPA = "EC-DMS-ABP-KIT";
const KIT_MAPA = "EC-DMS-SD-8GO"; // kit d'un autre type, posé le temps du test

afterAll(async () => {
  await rendreParcDesTests();
  await nettoyer();
});
afterEach(async () => {
  await dbDemo().offreMiseADisposition.updateMany({ where: { variante: { defaultCode: MAPA } }, data: { kitRequis: null } });
});

async function panier(compteId: string) {
  const p = (await panierPour({ compteId }, false))!;
  return { p, lignes: await lignesPanier(p.id) };
}
const mad = (defaultCode: string) => ({ defaultCode, formule: "mise_a_disposition" as const, quantite: 1 });

describe("kit d'accessoires", () => {
  it("absent : ajouté d'office, obligatoire, non supprimable tant que la location est au panier", async () => {
    const c = await compteValide({ kitHolter: false });
    const r = await ajouterAuPanier({ compteId: c.compteId }, mad(HOLTER));
    expect(r).toMatchObject({ ok: true, kit: { ajoute: true, possede: false } });
    const { p, lignes } = await panier(c.compteId);
    const kit = lignes.find((l) => l.defaultCode === KIT && l.formule === "achat")!;
    expect(kit.quantite).toBe(1);
    expect((await kitsObligatoires(p.id, c.compteId)).has(KIT)).toBe(true);
    expect(await supprimerLigne({ compteId: c.compteId }, kit.id)).toBe(false);
    // La location retirée, le kit devient un achat ordinaire.
    await supprimerLigne({ compteId: c.compteId }, lignes.find((l) => l.formule === "mise_a_disposition")!.id);
    expect(await supprimerLigne({ compteId: c.compteId }, kit.id)).toBe(true);
  });

  it("deux locations du même type dans le panier : un seul kit", async () => {
    const c = await compteValide({ kitHolter: false });
    await ajouterAuPanier({ compteId: c.compteId }, mad(HOLTER));
    const r = await ajouterAuPanier({ compteId: c.compteId }, mad(HOLTER_2));
    expect(r).toMatchObject({ ok: true, kit: { ajoute: false } });
    expect((await panier(c.compteId)).lignes.filter((l) => l.defaultCode === KIT)).toHaveLength(1);
  });

  it("kit possédé (achat payé ou enregistré par l'équipe) : ni ajouté ni facturé, le site le dit", async () => {
    const achete = await compteValide({ kitHolter: false });
    await creerRegistre(process.env).odoo().commandes.creerCommandePayee(
      {
        partenaireRef: achete.partenaireRef,
        lignes: [{ defaultCode: KIT, quantite: 1 }],
        livraison: { adresse: "1 rue du Test", codePostal: "69003", ville: "Lyon", fraisPortHt: 0 },
        paiement: { mode: "carte", reference: `FICT-pi-${randomUUID()}` },
      },
      `test-kit:${randomUUID()}`,
    );
    expect(await ajouterAuPanier({ compteId: achete.compteId }, mad(HOLTER))).toMatchObject({ ok: true, kit: { ajoute: false, possede: true } });
    expect((await panier(achete.compteId)).lignes.some((l) => l.defaultCode === KIT)).toBe(false);

    const enregistre = await compteValide({ kitHolter: false });
    await admin.enregistrerKit(enregistre.partenaireRef, KIT, "test");
    expect(await ajouterAuPanier({ compteId: enregistre.compteId }, mad(HOLTER))).toMatchObject({ ok: true, kit: { possede: true } });
  });

  it("autre type d'appareil : son propre kit est demandé ; rachat volontaire accepté", async () => {
    await dbDemo().offreMiseADisposition.updateMany({ where: { variante: { defaultCode: MAPA } }, data: { kitRequis: KIT_MAPA } });
    const c = await compteValide({ kitHolter: false });
    await admin.enregistrerKit(c.partenaireRef, KIT, "test");
    expect(await ajouterAuPanier({ compteId: c.compteId }, mad(MAPA))).toMatchObject({ ok: true, kit: { ajoute: true } });
    expect((await panier(c.compteId)).lignes.some((l) => l.defaultCode === KIT_MAPA)).toBe(true);
    // Rachat volontaire du kit Holter déjà possédé.
    expect(await ajouterAuPanier({ compteId: c.compteId }, { defaultCode: KIT, formule: "achat", quantite: 1 })).toMatchObject({ ok: true });
  });

  it("kit retiré du panier par un autre moyen : revérifié et rajouté avant le paiement", async () => {
    const c = await compteValide({ kitHolter: false });
    await ajouterAuPanier({ compteId: c.compteId }, mad(HOLTER));
    const { lignes } = await panier(c.compteId);
    await dbSite().lignePanier.delete({ where: { id: lignes.find((l) => l.defaultCode === KIT)!.id } });
    let commande = await enregistrerAdresses(await ouvrirCommande(c.compteId), adresses);
    commande = await choisirLivraison(commande, null, { [HOLTER]: await premiereDatePour(HOLTER, "69003") });
    commande = await choisirPaiement(commande, null, "sepa");
    const v = await verifierAvantPaiement(commande);
    expect(v).toMatchObject({ ok: false, redirection: "/panier" });
    expect((await panier(c.compteId)).lignes.some((l) => l.defaultCode === KIT)).toBe(true);
  });
});
