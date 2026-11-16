import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { demanderEnvoi, MOTIF_BLOQUE_RECETTE, notifierEquipe } from "@/domaine/emailing/envoi";
import { emailEssai } from "@/emails/modeles";
import { dbSite } from "@/lib/db/site";

// T015 (F25, US4, FR-016) : sur le site de recette, aucun email ne part hors des adresses
// autorisées ; il est conservé et consultable, sans alerte. Le connecteur reste celui de la
// démonstration (déjà construit) : seul le domaine lit la configuration de la recette.

const cle = (n: string) => `test-garde-recette:${n}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
const messages = (c: string) => dbSite().messageDemonstration.count({ where: { cle: { startsWith: c } } });
const AUTORISEE = "equipe@autorise.demo.explocardio.test";
const HORS_LISTE = "cardiologue@cabinet.demo.explocardio.test";
const sauvegarde = { ...process.env };

function recette() {
  process.env.CONNECTOR_EMAILING = "real";
  process.env.EMAILING_ENVIRONNEMENT = "recette";
  process.env.EMAILING_ADRESSES_AUTORISEES = "@autorise.demo.explocardio.test";
}

// Le connecteur de démonstration est construit avant de passer en recette, pour chaque test
// (sinon seul le premier test exécuté le construit, et les autres dépendent de l'ordre).
beforeAll(async () => {
  const { registre } = await import("@/connecteurs/registre");
  registre.emailing();
});
afterEach(() => {
  for (const k of ["CONNECTOR_EMAILING", "EMAILING_ENVIRONNEMENT", "EMAILING_ADRESSES_AUTORISEES"]) {
    if (sauvegarde[k] === undefined) delete process.env[k];
    else process.env[k] = sauvegarde[k];
  }
});
afterAll(async () => {
  await dbSite().envoi.deleteMany({ where: { cle: { startsWith: "test-garde-recette:" } } });
  await dbSite().messageDemonstration.deleteMany({ where: { cle: { startsWith: "test-garde-recette:" } } });
});

describe("garde de recette dans le point d'envoi", () => {
  it("hors liste : envoi annulé, motif exact, rendu conservé, rien d'envoyé, aucune alerte", async () => {
    recette();
    const c = cle("hors-liste");
    const rendu = await emailEssai();
    const avantAlertes = await dbSite().envoi.count({ where: { famille: "equipe" } });
    const { envoiId, etat } = await demanderEnvoi({ modele: "essai", destinataire: HORS_LISTE, rendu, cle: c, declencheur: "test" });
    expect(etat).toBe("annule");
    const e = await dbSite().envoi.findUniqueOrThrow({ where: { id: envoiId } });
    expect(e).toMatchObject({ etat: "annule", motif: MOTIF_BLOQUE_RECETTE, objet: rendu.objet, rendu: rendu.rendu, texte: rendu.texte });
    expect(await messages(c)).toBe(0);
    expect(await dbSite().envoi.count({ where: { famille: "equipe" } })).toBe(avantAlertes);
  });

  it("adresse autorisée : envoyé normalement", async () => {
    recette();
    const c = cle("autorisee");
    const { etat } = await demanderEnvoi({ modele: "essai", destinataire: AUTORISEE, rendu: await emailEssai(), cle: c, declencheur: "test" });
    expect(etat).toBe("envoye");
    expect(await messages(c)).toBe(1);
  });

  it("notification d'équipe : seuls les destinataires autorisés ; aucun → annulée", async () => {
    recette();
    const c1 = cle("equipe-mixte");
    await notifierEquipe({ canal: "email", destinataires: [HORS_LISTE, AUTORISEE], texte: "Essai", declencheur: "test" }, c1);
    const m = await dbSite().messageDemonstration.findFirstOrThrow({ where: { cle: c1 } });
    expect(m.destinataire).toBe(AUTORISEE);
    const c2 = cle("equipe-aucun");
    await notifierEquipe({ canal: "email", destinataires: [HORS_LISTE], texte: "Essai", declencheur: "test" }, c2);
    expect(await dbSite().envoi.findUniqueOrThrow({ where: { cle: c2 } })).toMatchObject({ etat: "annule", motif: MOTIF_BLOQUE_RECETTE });
    expect(await messages(c2)).toBe(0);
  });

  it("démonstration : garde inactive", async () => {
    const c = cle("demo");
    const { etat } = await demanderEnvoi({ modele: "essai", destinataire: HORS_LISTE, rendu: await emailEssai(), cle: c, declencheur: "test" });
    expect(etat).toBe("envoye");
  });
});
