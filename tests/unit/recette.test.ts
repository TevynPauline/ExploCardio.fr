import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { modeDuSite } from "@/lib/config";
import { dbSite } from "@/lib/db/site";
import { PARAM_MOT_DE_PASSE, PARAM_VERSION, verifier } from "@/lib/demo/mot-de-passe-site";
import { politiqueIndexation } from "@/lib/referencement/politique";
import {
  ConfigurationRecetteInvalide,
  creerEquipeRecette,
  lireEquipeRecette,
  preparerMotDePasseSite,
  variablesRecetteManquantes,
} from "../../prisma/site/seed/recette";

// Site de recette (F14, « Recette ») : réglage SITE_MODE=recette, premiers comptes de l'équipe,
// mot de passe d'accès au site.

const ENV_COMPLET = {
  SITE_MODE: "recette",
  CONNECTOR_ODOO: "real",
  AUTH_SECRET: "x".repeat(48),
  RECETTE_SITE_PASSWORD: "acces-recette-2026",
  RECETTE_EQUIPE: "Pauline Test <pauline@recette.test>",
  RECETTE_EQUIPE_PASSWORD: "provisoire-2026-ok",
};

describe("réglage du site", () => {
  it("SITE_MODE=recette donne le mode recette, fermé aux moteurs de recherche", () => {
    expect(modeDuSite({ SITE_MODE: "recette" })).toBe("recette");
    expect(modeDuSite({ SITE_MODE: "prod" })).toBe("prod");
    expect(modeDuSite({ SITE_MODE: "autre" })).toBe("demo");
    expect(politiqueIndexation("explocardio-recette.osc-fr1.scalingo.io", { SITE_MODE: "recette" })).toBe("ferme");
  });

  it("variables exigées : toutes présentes, mots de passe de 12 caractères, Odoo en mode réel", () => {
    expect(variablesRecetteManquantes(ENV_COMPLET)).toEqual([]);
    expect(variablesRecetteManquantes({})).toEqual(["AUTH_SECRET", "RECETTE_SITE_PASSWORD", "RECETTE_EQUIPE", "RECETTE_EQUIPE_PASSWORD", "CONNECTOR_ODOO=real"]);
    expect(variablesRecetteManquantes({ ...ENV_COMPLET, RECETTE_EQUIPE_PASSWORD: "court" })).toEqual([
      "RECETTE_EQUIPE_PASSWORD (12 caractères au moins)",
    ]);
  });
});

describe("RECETTE_EQUIPE", () => {
  it("lit « Nom <adresse> » séparés par des points-virgules", () => {
    expect(lireEquipeRecette(" Pauline Martin <Pauline@Exemple.fr> ; Régis Durand <regis@exemple.fr>;")).toEqual([
      { nom: "Pauline Martin", email: "pauline@exemple.fr" },
      { nom: "Régis Durand", email: "regis@exemple.fr" },
    ]);
  });

  it.each([[""], ["pauline@exemple.fr"], ["P <pauline@exemple.fr>"], ["Pauline <pas-une-adresse>"]])("refuse « %s »", (valeur) => {
    expect(() => lireEquipeRecette(valeur)).toThrow(ConfigurationRecetteInvalide);
  });
});

describe("préparation de la base du site", () => {
  const EMAILS = ["pauline@recette.test", "regis@recette.test"];
  let sauvegarde: { cle: string; valeur: string; type: string }[] = [];

  beforeAll(async () => {
    sauvegarde = await dbSite().parametre.findMany({ where: { cle: { in: [PARAM_MOT_DE_PASSE, PARAM_VERSION] } }, select: { cle: true, valeur: true, type: true } });
    await dbSite().utilisateur.deleteMany({ where: { email: { in: EMAILS } } });
  });

  afterAll(async () => {
    await dbSite().journalAction.deleteMany({ where: { action: "equipe.creation_recette", objet: { in: EMAILS } } });
    await dbSite().utilisateur.deleteMany({ where: { email: { in: EMAILS } } });
    await dbSite().parametre.deleteMany({ where: { cle: { in: [PARAM_MOT_DE_PASSE, PARAM_VERSION] } } });
    for (const s of sauvegarde) await dbSite().parametre.create({ data: s });
  });

  it("mot de passe d'accès : inchangé s'il est identique, remplacé sinon (les accès ouverts sont refermés)", async () => {
    await dbSite().parametre.deleteMany({ where: { cle: { in: [PARAM_MOT_DE_PASSE, PARAM_VERSION] } } });
    expect(await preparerMotDePasseSite(dbSite(), "premier-mot-de-passe")).toBe("cree");
    expect(await preparerMotDePasseSite(dbSite(), "premier-mot-de-passe")).toBe("inchange");
    expect(await preparerMotDePasseSite(dbSite(), "second-mot-de-passe")).toBe("remplace");
    const stocke = await dbSite().parametre.findUniqueOrThrow({ where: { cle: PARAM_MOT_DE_PASSE } });
    expect(stocke.valeur).not.toContain("second");
    expect(await verifier("second-mot-de-passe", stocke.valeur)).toBe(true);
    expect((await dbSite().parametre.findUniqueOrThrow({ where: { cle: PARAM_VERSION } })).valeur).toBe("2");
  });

  it("crée les comptes absents en administrateurs, double authentification à activer, sans toucher aux existants", async () => {
    const membres = [{ nom: "Pauline Test", email: EMAILS[0]! }];
    expect(await creerEquipeRecette(dbSite(), membres, "provisoire-2026-ok")).toEqual([EMAILS[0]]);
    const compte = await dbSite().utilisateur.findUniqueOrThrow({ where: { email: EMAILS[0] }, include: { comptes: true } });
    expect(compte).toMatchObject({ role: "admin", twoFactorEnabled: false, emailVerified: true });
    expect(compte.comptes[0]!.password).not.toContain("provisoire");
    // Second déploiement, une personne ajoutée : seule la nouvelle est créée.
    const crees = await creerEquipeRecette(dbSite(), [...membres, { nom: "Régis Test", email: EMAILS[1]! }], "autre-mot-de-passe");
    expect(crees).toEqual([EMAILS[1]]);
    const inchange = await dbSite().utilisateur.findUniqueOrThrow({ where: { email: EMAILS[0] }, include: { comptes: true } });
    expect(inchange.comptes[0]!.password).toBe(compte.comptes[0]!.password);
  });
});
