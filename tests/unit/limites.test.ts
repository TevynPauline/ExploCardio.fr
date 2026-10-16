import { afterAll, describe, expect, it } from "vitest";
import { dbSite } from "@/lib/db/site";
import { LIMITE_PAR_HEURE, adresseVisiteur, autoriserEnvoi, empreinte } from "@/domaine/limites";

// T053 (FR-032) : 5 envois par heure, empreinte de l'adresse jamais en clair.
describe("limites d'envoi", () => {
  const adresse = `203.0.113.${Math.floor(Math.random() * 200)}`;
  afterAll(async () => {
    await dbSite().limiteEnvoi.deleteMany({ where: { cle: { contains: empreinte(adresse) } } });
  });

  it("autorise 5 envois dans l'heure, refuse le sixième, rouvre après une heure", async () => {
    const t0 = new Date();
    for (let i = 0; i < LIMITE_PAR_HEURE; i++) expect(await autoriserEnvoi("essai", adresse, "s", t0)).toBe(true);
    expect(await autoriserEnvoi("essai", adresse, "s", t0)).toBe(false);
    expect(await autoriserEnvoi("essai", adresse, "s", new Date(t0.getTime() + 61 * 60_000))).toBe(true);
  });

  it("ne conserve jamais l'adresse en clair", async () => {
    const lignes = await dbSite().limiteEnvoi.findMany({ where: { cle: { contains: adresse } } });
    expect(lignes).toHaveLength(0);
  });

  it("ne fait confiance à X-Forwarded-For que derrière le proxy déclaré", () => {
    const entetes = new Headers({ "x-forwarded-for": "198.51.100.7, 203.0.113.9" });
    expect(adresseVisiteur(entetes, { TRUSTED_PROXY: "0" })).toBeNull();
    expect(adresseVisiteur(entetes, { TRUSTED_PROXY: "1" })).toBe("203.0.113.9");
  });
});
