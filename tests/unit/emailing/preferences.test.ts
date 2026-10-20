import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { annulerCampagne, creerCampagne, envoyerTestCampagne, programmerCampagne } from "@/domaine/emailing/campagnes";
import { prochainCreneau, REGLES_PAR_DEFAUT } from "@/domaine/emailing/decision";
import { executerDesinscription } from "@/domaine/emailing/desinscription";
import { releverEnvois } from "@/domaine/emailing/envoi";
import { signerJeton } from "@/domaine/emailing/jetons";
import { abonnesNewsletter, changerPreference, estAbonne, lirePreferences } from "@/domaine/emailing/preferences";
import { dbSite } from "@/lib/db/site";
import { compteValide, nettoyer } from "../commande/outils";

// T018 (unitaire), T016 — préférences et consentement (F10, US3, US4, FR-011 à FR-014, SC-002,
// SC-004) : preuve datée de chaque choix, désinscription sans connexion, campagnes réservées aux
// abonnés confirmés, désinscription prise en compte avant l'envoi programmé.

const auteur = { id: "test-admin", libelle: "Test (admin)", email: "admin@demo.explocardio.test" };
const consentements = (email: string) => dbSite().consentement.findMany({ where: { email }, orderBy: { date: "asc" } });
let abonne: Awaited<ReturnType<typeof compteValide>>;
let nonAbonne: Awaited<ReturnType<typeof compteValide>>;
const campagnes: string[] = [];

async function abonner(c: { compteId: string; email: string }) {
  await dbSite().consentement.create({ data: { compteId: c.compteId, email: c.email, objet: "newsletter", etat: true, origine: "inscription", textePresente: "test" } });
}

beforeAll(async () => {
  abonne = await compteValide({ kitHolter: false });
  nonAbonne = await compteValide({ kitHolter: false });
  await abonner(abonne);
});
afterAll(async () => {
  await dbSite().envoi.deleteMany({ where: { OR: [{ campagneId: { in: campagnes } }, { destinataire: { in: [abonne.email, nonAbonne.email] } }] } });
  await dbSite().campagne.deleteMany({ where: { id: { in: campagnes } } });
  await dbSite().preferencesEmail.deleteMany({ where: { email: { in: [abonne.email, nonAbonne.email] } } });
  await nettoyer();
});

describe("préférences", () => {
  it("tout est actif par défaut ; chaque changement est prouvé, daté, avec son origine (FR-014)", async () => {
    expect(await lirePreferences(nonAbonne.email)).toEqual({ reapprovisionnement: true, panierAbandonne: true, alerteBons: true, alerteDroits: true });
    await changerPreference(nonAbonne.email, "panierAbandonne", false, "mon_compte");
    await changerPreference(nonAbonne.email, "panierAbandonne", false, "mon_compte"); // sans effet : déjà désactivé
    await changerPreference(nonAbonne.email, "panierAbandonne", true, "lien_email");
    const preuves = (await consentements(nonAbonne.email)).filter((c) => c.objet === "email:panierAbandonne");
    expect(preuves.map((p) => [p.etat, p.origine, p.compteId])).toEqual([
      [false, "mon_compte", nonAbonne.compteId],
      [true, "lien_email", nonAbonne.compteId],
    ]);
  });

  it("désinscription par lien signé ; un jeton falsifié est refusé", async () => {
    expect(await executerDesinscription(signerJeton(nonAbonne.email), "alerteBons", "desinscription_un_clic")).toBe(true);
    expect((await lirePreferences(nonAbonne.email)).alerteBons).toBe(false);
    expect(await executerDesinscription(`${signerJeton(nonAbonne.email)}x`, "alerteDroits", "desinscription_un_clic")).toBe(false);
    expect(await executerDesinscription(signerJeton(nonAbonne.email), "inconnu", "desinscription_un_clic")).toBe(false);
    await changerPreference(nonAbonne.email, "alerteBons", true, "mon_compte");
  });
});

describe("campagnes (SC-002, SC-004)", () => {
  it("réservées aux abonnés confirmés ; un test est exigé avant de programmer", async () => {
    expect(await estAbonne(abonne.email)).toBe(true);
    expect(await estAbonne(nonAbonne.email)).toBe(false);
    const liste = (await abonnesNewsletter()).map((a) => a.email);
    expect(liste).toContain(abonne.email);
    expect(liste).not.toContain(nonAbonne.email);

    const c = await creerCampagne({ type: "promotion", objet: "Test de campagne F10", titre: "Électrodes : −10 %", texte: "Une offre de test sur les électrodes, pour vérifier la campagne.", lien: "/accessoires-consommables", libelleLien: "Voir" }, auteur);
    campagnes.push(c.id);
    await expect(programmerCampagne(c.id, null, auteur)).rejects.toThrow(/email de test/);
    await envoyerTestCampagne(c.id, auteur);
    const quand = prochainCreneau(new Date(Date.now() + 24 * 3600_000), REGLES_PAR_DEFAUT);
    await programmerCampagne(c.id, quand, auteur);
    const envois = await dbSite().envoi.findMany({ where: { campagneId: c.id } });
    expect(envois.some((e) => e.destinataire === abonne.email)).toBe(true);
    expect(envois.some((e) => e.destinataire === nonAbonne.email)).toBe(false);

    // Désinscription avant l'envoi : l'envoi programmé n'est pas fait.
    expect(await executerDesinscription(signerJeton(abonne.email), "newsletter", "lien_email")).toBe(true);
    await releverEnvois(new Date(quand.getTime() + 60_000));
    const e = await dbSite().envoi.findFirstOrThrow({ where: { campagneId: c.id, destinataire: abonne.email } });
    expect(e).toMatchObject({ etat: "annule", motif: "non abonné" });
    expect(await dbSite().messageDemonstration.count({ where: { cle: e.cle } })).toBe(0);
    const preuve = (await consentements(abonne.email)).at(-1)!;
    expect(preuve).toMatchObject({ objet: "newsletter", etat: false, origine: "lien_email" });
    await abonner(abonne);
  });

  it("un abonné reçoit la campagne, avec le lien de désinscription ; une campagne annulée ne part pas", async () => {
    const c = await creerCampagne({ type: "nouveaute", objet: "Nouveauté de test F10", titre: "Un nouveau Holter", texte: "Une nouveauté de test, pour vérifier l'envoi aux abonnés.", lien: null, libelleLien: null }, auteur);
    campagnes.push(c.id);
    await envoyerTestCampagne(c.id, auteur);
    const quand = prochainCreneau(new Date(Date.now() + 24 * 3600_000), REGLES_PAR_DEFAUT);
    await programmerCampagne(c.id, quand, auteur);
    await releverEnvois(new Date(quand.getTime() + 60_000));
    const e = await dbSite().envoi.findFirstOrThrow({ where: { campagneId: c.id, destinataire: abonne.email } });
    expect(e.etat).toBe("envoye");
    const m = await dbSite().messageDemonstration.findFirstOrThrow({ where: { cle: e.cle } });
    expect(m.texte).toMatch(/Se désinscrire/);
    expect(m.texte).toMatch(/parce que vous êtes abonné à la newsletter/);

    const d = await creerCampagne({ type: "vente_flash", objet: "Annulée F10", titre: "Annulée", texte: "Cette campagne de test sera annulée avant son envoi.", lien: null, libelleLien: null }, auteur);
    campagnes.push(d.id);
    await envoyerTestCampagne(d.id, auteur);
    await programmerCampagne(d.id, new Date(quand.getTime() + 24 * 3600_000), auteur);
    await annulerCampagne(d.id, auteur);
    expect(await dbSite().envoi.count({ where: { campagneId: d.id, etat: { not: "annule" } } })).toBe(0);
  });

  it("refuse un lien vers un autre site", async () => {
    await expect(creerCampagne({ type: "promotion", objet: "x", titre: "x", texte: "Un texte assez long pour être accepté.", lien: "https://exemple.com", libelleLien: null }, auteur)).rejects.toThrow(/page du site/);
  });
});
