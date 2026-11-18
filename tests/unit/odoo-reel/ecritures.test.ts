import { afterAll, describe, expect, it } from "vitest";
import { creerEcritures, stockageSite } from "@/connecteurs/odoo/real/ecritures";
import { dbSite } from "@/lib/db/site";

// F14 lots 2-3 (D1) : une écriture par clé et par base Odoo, gardée dans la base du site.

const cle = `test-ecriture-${Date.now()}`;

describe("trace des écritures Odoo", () => {
  afterAll(async () => {
    await dbSite().ecritureOdoo.deleteMany({ where: { cle } });
  });

  it("rejoue le résultat pour la même base, refait l'écriture pour une autre base", async () => {
    let n = 0;
    const faire = async () => ({ ref: `P${++n}` });
    const copie = creerEcritures("copie", stockageSite());
    expect(await copie.uneFois(cle, "test", faire)).toEqual({ resultat: { ref: "P1" }, deja: false });
    expect(await copie.uneFois(cle, "test", faire)).toEqual({ resultat: { ref: "P1" }, deja: true });
    expect(await creerEcritures("reelle", stockageSite()).uneFois(cle, "test", faire)).toEqual({ resultat: { ref: "P2" }, deja: false });
    expect(n).toBe(2);
  });
});
