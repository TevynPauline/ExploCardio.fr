import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { creerRegistre } from "@/connecteurs/registre";
import { simulerCommandesRegulieres } from "@/connecteurs/odoo/demo/commandes-admin";
import { prochainCreneau, REGLES_PAR_DEFAUT } from "@/domaine/emailing/decision";
import { changerPreference } from "@/domaine/emailing/preferences";
import { estDue, objetValide, programmerReapprovisionnement, rythme } from "@/domaine/emailing/scenarios/reapprovisionnement";
import { dbDemo } from "@/lib/db/demo";
import { dbSite } from "@/lib/db/site";
import { compteValide, nettoyer } from "../commande/outils";

// T013 — relance de réapprovisionnement (F10, US2, SC-001, SC-005, D5).

const JOUR = 24 * 3600_000;
const REGLES = { avanceJours: 7, commandesMin: 3, ecartMaxPct: 50 };
const ELECTRODES = "EC-ELEC-HOLTER-500";
const ELECTRODES_50 = "EC-ELEC-HOLTER-50";
const BRASSARD = "EC-SUN-ORBIT-M";
// Un instant dans les plages d'envoi : la décision envoie aussitôt.
const T = prochainCreneau(new Date(Date.now() + JOUR), REGLES_PAR_DEFAUT);
const il = (jours: number) => new Date(T.getTime() - jours * JOUR);

describe("rythme de commande (fonction pure)", () => {
  it("moins de 3 commandes : aucun rythme", () => {
    expect(rythme([il(120), il(60)], REGLES)).toBeNull();
  });

  it("tous les 60 jours : prochaine commande 60 jours après la dernière", () => {
    const r = rythme([il(173), il(113), il(53)], REGLES)!;
    expect(r.intervalleJours).toBe(60);
    expect(r.prochaine.getTime()).toBe(il(53).getTime() + 60 * JOUR);
  });

  it("irrégulier (intervalles 20 et 90 jours) : aucun rythme", () => {
    expect(rythme([il(160), il(140), il(50)], REGLES)).toBeNull();
  });

  it("rythme qui change : recalculé à chaque commande", () => {
    expect(rythme([il(150), il(100), il(50), il(5)], REGLES)!.intervalleJours).toBe(48);
  });

  it("SC-001 : relance entre 5 et 9 jours avant l'échéance, pas avant", () => {
    const r = rythme([il(173), il(113), il(53)], REGLES)!; // échéance dans 7 jours
    expect(estDue(r, T, 7)).toBe(true);
    const tot = rythme([il(170), il(110), il(50)], REGLES)!; // échéance dans 10 jours
    expect(estDue(tot, T, 7)).toBe(false);
  });
});

describe("programmation des relances", () => {
  const comptes: Awaited<ReturnType<typeof compteValide>>[] = [];
  const nouveau = async () => {
    const c = await compteValide({ kitHolter: false });
    comptes.push(c);
    return c;
  };
  const regulier = (partenaireRef: string, defaultCode: string, derniereIlYaJours: number, intervalleJours = 60) =>
    simulerCommandesRegulieres({ partenaireRef, defaultCode, quantite: 2, intervalleJours, nombre: 3, derniereIlYaJours: derniereIlYaJours + (Date.now() - T.getTime()) / JOUR }, new Date());
  const envois = (compteId: string) => dbSite().envoi.findMany({ where: { compteId, scenario: "reapprovisionnement" } });

  beforeAll(async () => {
    await dbSite().parametre.deleteMany({ where: { cle: { startsWith: "emailing." } } });
  });
  afterAll(async () => {
    for (const c of comptes) {
      await dbSite().envoi.deleteMany({ where: { compteId: c.compteId } });
      await dbSite().preferencesEmail.deleteMany({ where: { email: c.email } });
    }
    await nettoyer();
  });

  it("commande tous les 60 jours, dernière il y a 53 jours : une relance, avec prix HT, gains et lien", async () => {
    const c = await nouveau();
    await regulier(c.partenaireRef, ELECTRODES, 53);
    expect(await programmerReapprovisionnement(T, { compteIds: [c.compteId] })).toEqual({ relances: 1 });
    const [e] = await envois(c.compteId);
    expect(e).toMatchObject({ famille: "service", etat: "envoye" });
    const m = await dbSite().messageDemonstration.findFirstOrThrow({ where: { cle: e!.cle } });
    expect(m.texte).toMatch(/Électrodes|électrodes/);
    expect(m.texte).toMatch(/\d\s?€ HT/);
    // Gains en bons et droits, s'il y a lieu (FR-017).
    const gains = await creerRegistre(process.env).odoo().fidelite.estimerGains(c.partenaireRef, [{ defaultCode: ELECTRODES, quantite: 2 }]);
    if (gains.bonsAchatHt > 0) expect(m.texte).toMatch(/vous rapporterait .* HT de bons d'achat/);
    if (gains.droitsJusquAu) expect(m.texte).toMatch(/assistance gratuite jusqu'au/);
    expect(m.rendu).toContain(`/panier/recommander?ref=${ELECTRODES}&amp;quantite=2`);
    expect(m.texte).toMatch(/Vous recevez cet email parce que vous commandez régulièrement/);
    expect(m.texte).toMatch(/Gérer mes préférences/);
  });

  it("une seule relance par échéance ; plus rien après une nouvelle commande (SC-005)", async () => {
    const c = await nouveau();
    await regulier(c.partenaireRef, ELECTRODES, 53);
    await programmerReapprovisionnement(T, { compteIds: [c.compteId] });
    await programmerReapprovisionnement(new Date(T.getTime() + JOUR), { compteIds: [c.compteId] });
    expect(await envois(c.compteId)).toHaveLength(1);
    await simulerCommandesRegulieres({ partenaireRef: c.partenaireRef, defaultCode: ELECTRODES, quantite: 2, intervalleJours: 60, nombre: 1, derniereIlYaJours: 0 });
    await programmerReapprovisionnement(new Date(T.getTime() + 2 * JOUR), { compteIds: [c.compteId] });
    expect(await envois(c.compteId)).toHaveLength(1);
  });

  it("recommandé entre la programmation et l'envoi : la relance n'a plus d'objet (annulée à l'envoi)", async () => {
    const c = await nouveau();
    await regulier(c.partenaireRef, ELECTRODES, 53);
    await programmerReapprovisionnement(T, { compteIds: [c.compteId] });
    const [e] = await envois(c.compteId);
    expect(await objetValide(e!, T)).toBe(true);
    await simulerCommandesRegulieres({ partenaireRef: c.partenaireRef, defaultCode: ELECTRODES, quantite: 2, intervalleJours: 60, nombre: 1, derniereIlYaJours: 0 });
    expect(await objetValide(e!, new Date(Math.max(T.getTime(), Date.now()) + 60_000))).toBe(false);
  });

  it("historique irrégulier ou insuffisant : rien", async () => {
    const c = await nouveau();
    await simulerCommandesRegulieres({ partenaireRef: c.partenaireRef, defaultCode: ELECTRODES, quantite: 2, intervalleJours: 60, nombre: 2, derniereIlYaJours: 53 });
    await programmerReapprovisionnement(T, { compteIds: [c.compteId] });
    expect(await envois(c.compteId)).toHaveLength(0);
  });

  it("deux consommables dus dans la même fenêtre : un seul email regroupé", async () => {
    const c = await nouveau();
    await regulier(c.partenaireRef, ELECTRODES, 53);
    await regulier(c.partenaireRef, BRASSARD, 55);
    await programmerReapprovisionnement(T, { compteIds: [c.compteId] });
    const liste = await envois(c.compteId);
    expect(liste).toHaveLength(1);
    expect(liste[0]!.references).toHaveLength(2);
  });

  it("article indisponible : aucune relance", async () => {
    const c = await nouveau();
    await regulier(c.partenaireRef, ELECTRODES_50, 53);
    const stock = await dbDemo().stock.findFirstOrThrow({ where: { variante: { defaultCode: ELECTRODES_50 } } });
    await dbDemo().stock.update({ where: { id: stock.id }, data: { quantite: 0, etatHorsStock: "indisponible" } });
    try {
      await programmerReapprovisionnement(T, { compteIds: [c.compteId] });
      expect(await envois(c.compteId)).toHaveLength(0);
    } finally {
      await dbDemo().stock.update({ where: { id: stock.id }, data: { quantite: stock.quantite, etatHorsStock: stock.etatHorsStock } });
    }
  });

  it("relances désactivées par le client : envoi annulé", async () => {
    const c = await nouveau();
    await regulier(c.partenaireRef, ELECTRODES, 53);
    await changerPreference(c.email, "reapprovisionnement", false, "mon_compte");
    await programmerReapprovisionnement(T, { compteIds: [c.compteId] });
    expect(await envois(c.compteId)).toMatchObject([{ etat: "annule", motif: "préférence du client" }]);
  });

  it("scénario désactivé par l'administrateur : rien", async () => {
    const c = await nouveau();
    await regulier(c.partenaireRef, ELECTRODES, 53);
    await dbSite().parametre.create({ data: { cle: "emailing.reappro.actif", valeur: "false" } });
    try {
      expect(await programmerReapprovisionnement(T, { compteIds: [c.compteId] })).toEqual({ relances: 0 });
    } finally {
      await dbSite().parametre.delete({ where: { cle: "emailing.reappro.actif" } });
    }
  });
});
