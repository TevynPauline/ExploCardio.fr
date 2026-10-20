import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prochainCreneau, REGLES_PAR_DEFAUT } from "@/domaine/emailing/decision";
import { objetValide, programmerPaniers } from "@/domaine/emailing/scenarios/panier";
import { dbSite } from "@/lib/db/site";
import { compteValide, nettoyer, remplirPanier } from "../commande/outils";

// T022 — panier en attente (F10, US6, FR-018, FR-019) : un rappel par état du panier, pour un
// client connecté, aux prix du moment ; rien si le panier est commandé, vidé ou d'un visiteur.

const HEURE = 3600_000;
const T = prochainCreneau(new Date(Date.now() + 24 * HEURE), REGLES_PAR_DEFAUT);
const comptes: string[] = [];

async function vieillir(compteId: string, heures: number) {
  await dbSite().$executeRaw`UPDATE panier SET "modifieLe" = ${new Date(T.getTime() - heures * HEURE)} WHERE "compteId" = ${compteId}`;
}
const envois = (compteId: string) => dbSite().envoi.findMany({ where: { compteId, scenario: "panier_abandonne" }, orderBy: { creeLe: "asc" } });

async function compteAvecPanier() {
  const c = await compteValide({ kitHolter: false });
  comptes.push(c.compteId);
  await remplirPanier(c.compteId, [{ defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 2 }]);
  return c;
}

beforeAll(async () => {
  await dbSite().parametre.deleteMany({ where: { cle: { startsWith: "emailing." } } });
});
afterAll(async () => {
  await dbSite().envoi.deleteMany({ where: { compteId: { in: comptes } } });
  await nettoyer();
});

describe("panier en attente", () => {
  it("24 h sans modification : un rappel avec les articles, leur prix HT et leur disponibilité", async () => {
    const c = await compteAvecPanier();
    await vieillir(c.compteId, 25);
    await programmerPaniers(T, { compteIds: [c.compteId] });
    const [e] = await envois(c.compteId);
    expect(e).toMatchObject({ famille: "service", etat: "envoye" });
    const m = await dbSite().messageDemonstration.findFirstOrThrow({ where: { cle: e!.cle } });
    expect(m.objet).toBe("Votre panier vous attend");
    expect(m.texte).toMatch(/2 × .*HT l’unité \(disponible|expédié sous/);
    expect(m.texte).toMatch(/Voir mon panier/);
    expect(m.texte).toMatch(/Gérer mes préférences/);
  });

  it("moins de 24 h : rien ; panier inchangé : un seul rappel ; modifié puis laissé : un nouveau rappel", async () => {
    const c = await compteAvecPanier();
    await vieillir(c.compteId, 10);
    await programmerPaniers(T, { compteIds: [c.compteId] });
    expect(await envois(c.compteId)).toHaveLength(0);
    await vieillir(c.compteId, 30);
    await programmerPaniers(T, { compteIds: [c.compteId] });
    await programmerPaniers(new Date(T.getTime() + HEURE), { compteIds: [c.compteId] });
    expect(await envois(c.compteId)).toHaveLength(1);
    await remplirPanier(c.compteId, [{ defaultCode: "EC-SUN-ORBIT-M", formule: "achat", quantite: 1 }]);
    await vieillir(c.compteId, 26);
    await programmerPaniers(T, { compteIds: [c.compteId] });
    expect(await envois(c.compteId)).toHaveLength(2);
  });

  it("commande commencée depuis : rien ; panier vidé avant l'envoi : sans objet", async () => {
    const c = await compteAvecPanier();
    await vieillir(c.compteId, 25);
    const commande = await dbSite().commandeSite.create({ data: { ref: `EC-TEST-${Date.now()}`, compteId: c.compteId } });
    // Commande commencée après la dernière modification du panier (à l'heure de référence T).
    await dbSite().$executeRaw`UPDATE commande_site SET "modifieLe" = ${new Date(T.getTime() - HEURE)} WHERE id = ${commande.id}`;
    await programmerPaniers(T, { compteIds: [c.compteId] });
    expect(await envois(c.compteId)).toHaveLength(0);
    await dbSite().commandeSite.deleteMany({ where: { compteId: c.compteId } });

    await vieillir(c.compteId, 25);
    await programmerPaniers(T, { compteIds: [c.compteId] });
    const [e] = await envois(c.compteId);
    expect(await objetValide(e!)).toBe(true);
    await dbSite().lignePanier.deleteMany({ where: { panier: { compteId: c.compteId } } });
    expect(await objetValide(e!)).toBe(false);
  });

  it("panier d'un visiteur : jamais de rappel", async () => {
    const p = await dbSite().panier.create({ data: { jetonEmpreinte: `test-${Date.now()}`, lignes: { create: [{ defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 1, prixHtConstate: 1000 }] } } });
    await dbSite().$executeRaw`UPDATE panier SET "modifieLe" = ${new Date(T.getTime() - 30 * HEURE)} WHERE id = ${p.id}`;
    await programmerPaniers(T);
    expect(await dbSite().envoi.count({ where: { cle: { startsWith: `panier:${p.id}:` } } })).toBe(0);
    await dbSite().panier.delete({ where: { id: p.id } });
  });
});
