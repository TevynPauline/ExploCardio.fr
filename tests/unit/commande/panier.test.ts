import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import {
  ajouterAuPanier,
  appliquerCodePromo,
  fusionnerPaniers,
  lignesPanier,
  modifierLigne,
  panierPour,
  supprimerLigne,
} from "@/domaine/catalogue/panier";
import { dbSite } from "@/lib/db/site";

// T010 — édition du panier et fusion à la connexion (F04, US1, FR-004, FR-005).

const jetons: string[] = [];
const comptes: string[] = [];
function visiteur() {
  const jeton = randomBytes(24).toString("base64url");
  jetons.push(jeton);
  return { jeton };
}

async function compteDeTest() {
  const id = `test-${randomBytes(6).toString("hex")}`;
  const u = await dbSite().utilisateur.create({ data: { id, name: "Test Panier", email: `${id}@demo.explocardio.test`, emailVerified: true, role: "client" } });
  const c = await dbSite().compteClient.create({ data: { utilisateurId: u.id, type: "medecin", statut: "valide" } });
  comptes.push(u.id);
  return c.id;
}

afterAll(async () => {
  for (const j of jetons) {
    const p = await panierPour({ jeton: j }, false);
    if (p) await dbSite().panier.delete({ where: { id: p.id } });
  }
  for (const id of comptes) await dbSite().utilisateur.delete({ where: { id } }).catch(() => undefined);
});

describe("édition du panier", () => {
  it("modifie une quantité (1 à 999) et supprime une ligne, seulement dans son panier", async () => {
    const a = visiteur();
    const b = visiteur();
    await ajouterAuPanier(a, { defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 1 });
    await ajouterAuPanier(b, { defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 1 });
    const [ligne] = await lignesPanier((await panierPour(a, false))!.id);
    expect(await modifierLigne(a, ligne!.id, 7)).toBe(true);
    expect((await lignesPanier((await panierPour(a, false))!.id))[0]!.quantite).toBe(7);
    expect(await modifierLigne(a, ligne!.id, 0)).toBe(false);
    expect(await modifierLigne(a, ligne!.id, 1000)).toBe(false);
    expect(await modifierLigne(b, ligne!.id, 2)).toBe(false); // pas la ligne de b
    expect(await supprimerLigne(b, ligne!.id)).toBe(false);
    expect(await supprimerLigne(a, ligne!.id)).toBe(true);
    expect(await lignesPanier((await panierPour(a, false))!.id)).toHaveLength(0);
  });

  it("enregistre et retire le code promo (en majuscules)", async () => {
    const a = visiteur();
    await ajouterAuPanier(a, { defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 1 });
    await appliquerCodePromo(a, " demo10 ");
    expect((await panierPour(a, false))!.codePromo).toBe("DEMO10");
    await appliquerCodePromo(a, "");
    expect((await panierPour(a, false))!.codePromo).toBeNull();
  });
});

describe("fusionnerPaniers", () => {
  it("verse le panier du visiteur dans celui du compte, sans doublon, puis le supprime", async () => {
    const compteId = await compteDeTest();
    const v = visiteur();
    await ajouterAuPanier({ compteId }, { defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 2 });
    await ajouterAuPanier(v, { defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 3 });
    await ajouterAuPanier(v, { defaultCode: "EC-SUN-OSCAR2", formule: "achat", quantite: 1 });
    await appliquerCodePromo(v, "DEMO10");
    await fusionnerPaniers(v.jeton, compteId);
    const panier = (await panierPour({ compteId }, false))!;
    const lignes = await lignesPanier(panier.id);
    expect(lignes.map((l) => [l.defaultCode, l.quantite]).sort()).toEqual([["EC-ELEC-HOLTER-50", 5], ["EC-SUN-OSCAR2", 1]]);
    expect(panier.codePromo).toBe("DEMO10");
    expect(await panierPour(v, false)).toBeNull();
    // Rejouer la fusion ne change rien.
    await fusionnerPaniers(v.jeton, compteId);
    expect((await lignesPanier(panier.id)).find((l) => l.defaultCode === "EC-ELEC-HOLTER-50")!.quantite).toBe(5);
  });
});
