import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { definirPanne } from "@/connecteurs/panne-simulee";
import { demanderEnvoi, notifierEquipe, releverEnvois } from "@/domaine/emailing/envoi";
import { changerPreference } from "@/domaine/emailing/preferences";
import { emailEssai } from "@/emails/modeles";
import { dbSite } from "@/lib/db/site";
import { compteValide, nettoyer } from "../commande/outils";

// T007 — point d'envoi unique (F10, R1, R2) : idempotence, envoi immédiat des transactionnels,
// reprise après panne sans doublon (SC-012), alerte unique, variable manquante, désinscription
// prise en compte au moment d'envoyer (SC-004), adresse confirmée.

const MINUTE = 60_000;
let compte: Awaited<ReturnType<typeof compteValide>>;
const cle = (n: string) => `test-envoi:${n}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
const messages = (c: string) => dbSite().messageDemonstration.count({ where: { cle: c } });

beforeAll(async () => {
  compte = await compteValide({ kitHolter: false });
});
afterEach(async () => {
  await definirPanne("emailing", false);
});
afterAll(async () => {
  await dbSite().envoi.deleteMany({ where: { cle: { startsWith: "test-envoi:" } } });
  await dbSite().preferencesEmail.deleteMany({ where: { email: compte.email } });
  await nettoyer();
});

describe("point d'envoi unique", () => {
  it("un même événement signalé deux fois ne donne qu'un envoi et un message", async () => {
    const c = cle("double");
    const rendu = await emailEssai();
    const a = await demanderEnvoi({ modele: "essai", destinataire: compte.email, rendu, cle: c, declencheur: "test" });
    const b = await demanderEnvoi({ modele: "essai", destinataire: compte.email, rendu, cle: c, declencheur: "test" });
    expect(b.envoiId).toBe(a.envoiId);
    expect(await dbSite().envoi.count({ where: { cle: c } })).toBe(1);
    expect(await messages(c)).toBe(1);
  });

  it("un transactionnel part aussitôt ; son rendu n'est pas conservé ; le compte est rattaché", async () => {
    const c = cle("immediat");
    const { envoiId } = await demanderEnvoi({ modele: "essai", destinataire: compte.email, rendu: await emailEssai(), cle: c, declencheur: "test" });
    const e = await dbSite().envoi.findUniqueOrThrow({ where: { id: envoiId } });
    expect(e).toMatchObject({ etat: "envoye", famille: "transactionnel", rendu: null, texte: null, compteId: compte.compteId });
    expect(e.envoyeLe).not.toBeNull();
  });

  it("par le compte : l'adresse confirmée du compte", async () => {
    const { envoiId } = await demanderEnvoi({ modele: "essai", compteId: compte.compteId, rendu: await emailEssai(), cle: cle("compte"), declencheur: "test" });
    expect((await dbSite().envoi.findUniqueOrThrow({ where: { id: envoiId } })).destinataire).toBe(compte.email);
  });

  it("panne de l'outil : conservé puis envoyé une seule fois à son retour (SC-012)", async () => {
    await definirPanne("emailing", true);
    const c = cle("panne");
    const { envoiId } = await demanderEnvoi({ modele: "essai", destinataire: compte.email, rendu: await emailEssai(), cle: c, declencheur: "test" });
    let e = await dbSite().envoi.findUniqueOrThrow({ where: { id: envoiId } });
    expect(e).toMatchObject({ etat: "programme", essais: 1 });
    expect(e.rendu).not.toBeNull();
    await definirPanne("emailing", false);
    await releverEnvois(new Date(Date.now() + 60 * MINUTE));
    await releverEnvois(new Date(Date.now() + 120 * MINUTE));
    e = await dbSite().envoi.findUniqueOrThrow({ where: { id: envoiId } });
    expect(e.etat).toBe("envoye");
    expect(await messages(c)).toBe(1);
  });

  it("panne prolongée : une seule alerte à l'équipe", async () => {
    await definirPanne("emailing", true);
    const { envoiId } = await demanderEnvoi({ modele: "essai", destinataire: compte.email, rendu: await emailEssai(), cle: cle("alerte"), declencheur: "test" });
    await dbSite().envoi.update({ where: { id: envoiId }, data: { creeLe: new Date(Date.now() - 45 * MINUTE) } });
    await releverEnvois(new Date(Date.now() + 10 * MINUTE));
    await releverEnvois(new Date(Date.now() + 20 * MINUTE));
    expect(await dbSite().envoi.count({ where: { cle: `alerte-panne-emailing:${envoiId}` } })).toBe(1);
    await definirPanne("emailing", false);
    await dbSite().envoi.deleteMany({ where: { cle: `alerte-panne-emailing:${envoiId}` } });
  });

  it("variable obligatoire manquante : rien n'est envoyé, envoi bloqué, équipe alertée", async () => {
    const c = cle("variable");
    const { envoiId, etat } = await demanderEnvoi({ modele: "relance_impaye", compteId: compte.compteId, variables: { objet: "commande FICT-SO-1" }, cle: c, declencheur: "test" });
    expect(etat).toBe("bloque");
    const e = await dbSite().envoi.findUniqueOrThrow({ where: { id: envoiId } });
    expect(e.motif).toMatch(/variable manquante/);
    expect(await messages(c)).toBe(0);
    expect(await dbSite().envoi.count({ where: { cle: `alerte-bloque:${envoiId}` } })).toBe(1);
    await dbSite().envoi.deleteMany({ where: { cle: `alerte-bloque:${envoiId}` } });
  });

  it("désactivation entre la programmation et l'envoi : annulé (SC-004)", async () => {
    const demain = new Date(Date.now() + 24 * 60 * MINUTE);
    const { envoiId } = await demanderEnvoi({
      modele: "relance_reapprovisionnement",
      compteId: compte.compteId,
      variables: { articles: [] },
      cle: cle("desinscription"),
      declencheur: "test",
      programmeLe: demain,
    });
    expect((await dbSite().envoi.findUniqueOrThrow({ where: { id: envoiId } })).etat).toBe("programme");
    await changerPreference(compte.email, "reapprovisionnement", false, "mon_compte");
    await releverEnvois(new Date(demain.getTime() + MINUTE));
    expect(await dbSite().envoi.findUniqueOrThrow({ where: { id: envoiId } })).toMatchObject({ etat: "annule", motif: "préférence du client" });
    await changerPreference(compte.email, "reapprovisionnement", true, "mon_compte");
  });

  it("les notifications d'équipe sont tracées et jamais filtrées", async () => {
    const c = cle("equipe");
    await notifierEquipe({ canal: "sms", destinataires: ["equipe@demo.explocardio.test"], texte: "Test", declencheur: "test" }, c);
    expect(await dbSite().envoi.findUniqueOrThrow({ where: { cle: c } })).toMatchObject({ famille: "equipe", etat: "envoye" });
  });
});
