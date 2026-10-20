import { afterAll, describe, expect, it } from "vitest";
import { demanderEnvoi } from "@/domaine/emailing/envoi";
import { enregistrerRejet, leverSuspension, statistiques, suivreEnvois } from "@/domaine/emailing/suivi";
import { emailEssai } from "@/emails/modeles";
import { dbSite } from "@/lib/db/site";
import { compteValide, nettoyer } from "../commande/outils";

// T026 — suivi des envois (F10, US8, FR-033, FR-036, D9, D10) : remise, rejets, suspension
// d'adresse, alertes, ouvertures, commandes qui suivent un envoi.

const JOUR = 24 * 3600_000;
const cle = (n: string) => `test-suivi:${n}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
const adresses: string[] = [];
const envoyer = async (destinataire: string, nom: string) => {
  adresses.push(destinataire.toLowerCase());
  const { envoiId } = await demanderEnvoi({ modele: "essai", destinataire, rendu: await emailEssai(), cle: cle(nom), declencheur: "test" });
  return envoiId;
};

afterAll(async () => {
  await dbSite().envoi.deleteMany({ where: { cle: { startsWith: "test-suivi:" } } });
  await dbSite().adresseRejetee.deleteMany({ where: { email: { in: adresses } } });
  await nettoyer();
});

describe("remise et rejets", () => {
  it("remis puis ouvert (consultation de la boîte de démonstration)", async () => {
    const id = await envoyer(`suivi-${Date.now()}@demo.explocardio.test`, "remis");
    await suivreEnvois();
    expect((await dbSite().envoi.findUniqueOrThrow({ where: { id } })).etat).toBe("remis");
    const e = await dbSite().envoi.findUniqueOrThrow({ where: { id } });
    await dbSite().messageDemonstration.update({ where: { id: e.connecteurEnvoiId! }, data: { ouvertLe: new Date() } });
    await suivreEnvois();
    expect((await dbSite().envoi.findUniqueOrThrow({ where: { id } })).ouvertLe).not.toBeNull();
  });

  it("rejet définitif d'un transactionnel : adresse suspendue, équipe alertée deux fois (rejet, suspension)", async () => {
    const adresse = `inconnu-${Date.now()}@rejet.demo.explocardio.test`;
    const id = await envoyer(adresse, "definitif");
    await suivreEnvois();
    expect((await dbSite().envoi.findUniqueOrThrow({ where: { id } })).etat).toBe("rejete");
    expect((await dbSite().adresseRejetee.findUniqueOrThrow({ where: { email: adresse } })).suspendueLe).not.toBeNull();
    expect(await dbSite().envoi.count({ where: { cle: `alerte-rejet:${id}` } })).toBe(1);
    expect(await dbSite().envoi.count({ where: { cle: { startsWith: `alerte-suspension:${adresse}:` } } })).toBe(1);
  });

  it("trois rejets temporaires : suspendue ; une remise remet le compteur à zéro ; levée par l'administrateur", async () => {
    const adresse = `pleine-${Date.now()}@temporaire.demo.explocardio.test`;
    expect(await enregistrerRejet(adresse, false, "boîte pleine")).toBe(false);
    expect(await enregistrerRejet(adresse, false, "boîte pleine")).toBe(false);
    expect(await enregistrerRejet(adresse, false, "boîte pleine")).toBe(true);
    adresses.push(adresse);
    await leverSuspension(adresse, "Test (admin)");
    const r = await dbSite().adresseRejetee.findUniqueOrThrow({ where: { email: adresse } });
    expect(r).toMatchObject({ rejetsTemporaires: 0, leveePar: "Test (admin)" });
    expect(r.leveeLe).not.toBeNull();
  });
});

describe("résultats", () => {
  it("compte les envois, remis, ouverts, et les commandes passées dans les 14 jours", async () => {
    const c = await compteValide({ kitHolter: false });
    const debut = new Date(Date.now() - 1000);
    const { envoiId } = await demanderEnvoi({ modele: "essai", compteId: c.compteId, rendu: await emailEssai(), cle: cle("stats"), declencheur: "test" });
    const campagneId = `test-stats-${Date.now()}`;
    await dbSite().envoi.update({ where: { id: envoiId }, data: { campagneId, etat: "remis", ouvertLe: new Date() } });
    await dbSite().commandeSite.create({ data: { ref: `EC-STATS-${Date.now()}`, compteId: c.compteId, etape: "terminee" } });
    const s = await statistiques({ campagneId }, debut);
    expect(s).toMatchObject({ envoyes: 1, remis: 1, ouverts: 1, commandes: 1 });
    // Au-delà de 14 jours, la commande ne compte plus.
    await dbSite().envoi.update({ where: { id: envoiId }, data: { envoyeLe: new Date(Date.now() - 20 * JOUR) } });
    expect((await statistiques({ campagneId }, new Date(Date.now() - 30 * JOUR))).commandes).toBe(0);
  });
});
