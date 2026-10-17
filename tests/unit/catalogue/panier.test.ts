import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { ajouterAuPanier, lignesPanier, panierPour, purgerPaniersAnonymes } from "@/domaine/catalogue/panier";
import { dbSite } from "@/lib/db/site";
import { dbDemo } from "@/lib/db/demo";

// T018 — ajout au panier (D1, US2-9, FR-033, cas limite « prix modifié »).

const jetons: string[] = [];
function visiteur() {
  const jeton = randomBytes(24).toString("base64url");
  jetons.push(jeton);
  return { jeton };
}

afterAll(async () => {
  for (const j of jetons) {
    const p = await panierPour({ jeton: j }, false);
    if (p) await dbSite().panier.delete({ where: { id: p.id } });
  }
});

describe("ajouterAuPanier", () => {
  it("crée le panier à la demande et enregistre la ligne avec le prix en vigueur", async () => {
    const id = visiteur();
    expect(await panierPour(id, false)).toBeNull();
    const r = await ajouterAuPanier(id, { defaultCode: "EC-SUN-OSCAR2", formule: "achat", quantite: 1 });
    expect(r).toMatchObject({ ok: true, prixHt: expect.any(Number), prixAChange: false });
    const lignes = await lignesPanier((await panierPour(id, false))!.id);
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatchObject({ defaultCode: "EC-SUN-OSCAR2", formule: "achat", quantite: 1 });
  });

  it("cumule les quantités d'une même référence et formule", async () => {
    const id = visiteur();
    await ajouterAuPanier(id, { defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 2 });
    await ajouterAuPanier(id, { defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 3 });
    const lignes = await lignesPanier((await panierPour(id, false))!.id);
    expect(lignes.map((l) => l.quantite)).toEqual([5]);
  });

  it("refuse un article indisponible, accepte un article en délai avec son délai", async () => {
    const id = visiteur();
    expect(await ajouterAuPanier(id, { defaultCode: "EC-IEM-MOBILOGRAPH", formule: "achat", quantite: 1 })).toMatchObject({ ok: false, motif: "indisponible" });
    expect(await ajouterAuPanier(id, { defaultCode: "EC-KOCH-ULTRA", formule: "achat", quantite: 1 })).toMatchObject({ ok: true, delaiJours: expect.any(Number) });
  });

  it("signale un prix différent de celui affiché", async () => {
    const r = await ajouterAuPanier(visiteur(), { defaultCode: "EC-SUN-OSCAR2", formule: "achat", quantite: 1, prixAffiche: 1 });
    expect(r).toMatchObject({ ok: true, prixAChange: true });
  });

  it("refuse une formule non proposée, une quantité invalide, une référence inconnue", async () => {
    const id = visiteur();
    expect(await ajouterAuPanier(id, { defaultCode: "EC-ENV-DAE", formule: "mise_a_disposition", quantite: 1 })).toMatchObject({ ok: false, motif: "formule" });
    expect(await ajouterAuPanier(id, { defaultCode: "EC-SUN-OSCAR2", formule: "achat", quantite: 0 })).toMatchObject({ ok: false, motif: "quantite" });
    expect(await ajouterAuPanier(id, { defaultCode: "EC-INCONNUE", formule: "achat", quantite: 1 })).toMatchObject({ ok: false, motif: "introuvable" });
  });

  it("mise à disposition : prix du premier mois", async () => {
    const r = await ajouterAuPanier(visiteur(), { defaultCode: "EC-DMS-3004L-CLOUD", formule: "mise_a_disposition", quantite: 1 });
    const offre = await dbDemo().offreMiseADisposition.findFirstOrThrow({ where: { variante: { defaultCode: "EC-DMS-3004L-CLOUD" } } });
    expect(r).toMatchObject({ ok: true, prixHt: offre.premierMoisCentimes });
  });

  it("connecteur Odoo injoignable : refus motivé", async () => {
    await dbSite().panneSimulee.upsert({ where: { connecteur: "odoo" }, create: { connecteur: "odoo", active: true }, update: { active: true } });
    try {
      expect(await ajouterAuPanier(visiteur(), { defaultCode: "EC-SUN-OSCAR2", formule: "achat", quantite: 1 })).toMatchObject({ ok: false, motif: "service" });
    } finally {
      await dbSite().panneSimulee.update({ where: { connecteur: "odoo" }, data: { active: false } });
    }
  });
});

describe("purgerPaniersAnonymes", () => {
  it("supprime les paniers anonymes inactifs depuis 30 jours, pas les autres", async () => {
    const vieux = visiteur();
    const recent = visiteur();
    await ajouterAuPanier(vieux, { defaultCode: "EC-SUN-OSCAR2", formule: "achat", quantite: 1 });
    await ajouterAuPanier(recent, { defaultCode: "EC-SUN-OSCAR2", formule: "achat", quantite: 1 });
    const p = (await panierPour(vieux, false))!;
    await dbSite().$executeRaw`UPDATE panier SET "modifieLe" = now() - interval '31 days' WHERE id = ${p.id}`;
    await purgerPaniersAnonymes();
    expect(await panierPour(vieux, false)).toBeNull();
    expect(await panierPour(recent, false)).not.toBeNull();
  });
});
