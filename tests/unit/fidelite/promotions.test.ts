import { randomInt } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { creerRegistre } from "@/connecteurs/registre";
import { creerPromotion, terminerPromotion } from "@/connecteurs/odoo/demo/fidelite-admin";
import { dbDemo } from "@/lib/db/demo";
import { CARTE_SD, compteValide, nettoyer, reapprovisionner } from "./outils";

// T027 — promotions (F06, US8, FR-030 à FR-034, D6) : annoncées entre leurs dates, arrêtées à la
// minute de leur fin (SC-010) ; code promo annoncé seulement s'il est « à annoncer » ; limites
// d'usage des codes.

afterAll(nettoyer);
const odoo = () => creerRegistre(process.env).odoo();
const MINUTE = 60_000;
const nom = (prefixe: string) => `${prefixe} ${randomInt(1e6)}`;
const code = () => `T${randomInt(1e8)}`;

async function devis(partenaireRef: string | null, codePromo: string, quantite = 4) {
  return odoo().commandes.calculerDevis({ partenaireRef, lignes: [{ defaultCode: CARTE_SD, formule: "achat", quantite }], codePromo, modeLivraison: "standard" });
}

describe("promotions", () => {
  it("vente flash annoncée entre ses dates, arrêtée à la minute de sa fin (SC-010)", async () => {
    const debut = new Date(Date.now() + 10 * MINUTE);
    const fin = new Date(debut.getTime() + 60 * MINUTE);
    const p = await creerPromotion({ nom: nom("Flash test"), type: "vente_flash", remisePourcent: 20, defaultCodes: [CARTE_SD], debut, fin });
    try {
      const annoncee = async (date: Date) => (await odoo().fidelite.promotionsEnCours(date)).find((x) => x.nom === p.nom);
      expect(await annoncee(new Date(debut.getTime() - MINUTE))).toBeUndefined();
      const pendant = await annoncee(new Date(debut.getTime() + MINUTE));
      expect(pendant).toMatchObject({ type: "vente_flash", remisePourcent: 20, fin });
      expect(pendant!.articles).toEqual([{ defaultCode: CARTE_SD, prixHt: 2_500, prixRemiseHt: 2_000 }]);
      expect(await annoncee(new Date(fin.getTime() - 1_000))).toBeDefined();
      expect(await annoncee(fin)).toBeUndefined();
    } finally {
      await terminerPromotion(p.id);
    }
  });

  it("vente flash terminée : plus appliquée au devis", async () => {
    const p = await creerPromotion({ nom: nom("Flash courte"), type: "vente_flash", remisePourcent: 20, defaultCodes: [CARTE_SD], debut: new Date(Date.now() - MINUTE), fin: new Date(Date.now() + 60 * MINUTE) });
    const pendant = await odoo().commandes.calculerDevis({ partenaireRef: null, lignes: [{ defaultCode: CARTE_SD, formule: "achat", quantite: 1 }], modeLivraison: "standard" });
    expect(pendant.lignes[0]!.prixUnitaireHt - pendant.lignes[0]!.remiseHt).toBeLessThan(2_500);
    await terminerPromotion(p.id);
    const apres = await odoo().commandes.calculerDevis({ partenaireRef: null, lignes: [{ defaultCode: CARTE_SD, formule: "achat", quantite: 1 }], modeLivraison: "standard" });
    expect(apres.lignes[0]!.remiseHt).toBe(0);
  });

  it("code promo : annoncé seulement s'il est « à annoncer » (D6)", async () => {
    const discret = await creerPromotion({ nom: nom("Code discret"), type: "code_promo", code: code(), remisePourcent: 5, defaultCodes: [], debut: new Date(Date.now() - MINUTE), fin: new Date(Date.now() + 60 * MINUTE) });
    const annonce = await creerPromotion({ nom: nom("Code annoncé"), type: "code_promo", code: code(), remisePourcent: 5, defaultCodes: [], debut: new Date(Date.now() - MINUTE), fin: new Date(Date.now() + 60 * MINUTE), annoncee: true });
    try {
      const noms = (await odoo().fidelite.promotionsEnCours(new Date())).map((p) => p.nom);
      expect(noms).not.toContain(discret.nom);
      expect(noms).toContain(annonce.nom);
    } finally {
      await terminerPromotion(discret.id);
      await terminerPromotion(annonce.id);
    }
  });

  it("limites d'usage : montant minimum, une fois par client, nombre total, clients nouveaux", async () => {
    const c = code();
    const p = await creerPromotion({ nom: nom("Code limité"), type: "code_promo", code: c, remisePourcent: 5, defaultCodes: [], debut: new Date(Date.now() - MINUTE), fin: new Date(Date.now() + 60 * MINUTE) });
    await dbDemo().promotion.update({ where: { id: p.id }, data: { limites: { montantMinimumCentimes: 20_000, parClient: 1, usagesMax: 2 } } });
    try {
      const client = await compteValide();
      expect((await devis(client.partenaireRef, c, 4)).codePromo).toMatchObject({ applique: false, motif: expect.stringContaining("200") });
      expect((await devis(client.partenaireRef, c, 10)).codePromo).toMatchObject({ applique: true });
      await commandePayeeAvecCode(client.partenaireRef, c);
      expect((await devis(client.partenaireRef, c, 10)).codePromo).toMatchObject({ applique: false });

      const autre = await compteValide();
      await commandePayeeAvecCode(autre.partenaireRef, c);
      const troisieme = await compteValide();
      expect((await devis(troisieme.partenaireRef, c, 10)).codePromo).toMatchObject({ applique: false, motif: expect.stringContaining("nombre d'utilisations") });

      await dbDemo().promotion.update({ where: { id: p.id }, data: { limites: { nouveauxClients: true } } });
      expect((await devis(client.partenaireRef, c, 10)).codePromo).toMatchObject({ applique: false });
      expect((await devis(troisieme.partenaireRef, c, 10)).codePromo).toMatchObject({ applique: true });
    } finally {
      await terminerPromotion(p.id);
    }
  });
});

async function commandePayeeAvecCode(partenaireRef: string, codePromo: string) {
  const { randomUUID } = await import("node:crypto");
  await reapprovisionner([CARTE_SD]);
  await odoo().commandes.creerCommandePayee(
    { partenaireRef, lignes: [{ defaultCode: CARTE_SD, quantite: 10 }], livraison: { adresse: "1 rue du Test", codePostal: "69003", ville: "Lyon", fraisPortHt: 0 }, paiement: { mode: "carte", reference: `FICT-pi-${randomUUID()}` }, codePromo },
    `test-promo:${randomUUID()}`,
  );
}
