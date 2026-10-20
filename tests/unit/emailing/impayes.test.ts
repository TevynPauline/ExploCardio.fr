import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { creerRegistre } from "@/connecteurs/registre";
import { niveauAtteint, objetValide, programmerImpayes, rendre } from "@/domaine/emailing/scenarios/impayes";
import { dbDemo } from "@/lib/db/demo";
import { dbSite } from "@/lib/db/site";
import { compteValide, nettoyer } from "../commande/outils";
import { rendreParcDesTests } from "../location/outils";

// T024 — relances d'impayés (F10, US7, FR-020, FR-021, D4) : niveaux lus dans Odoo, le plus élevé
// atteint envoyé une fois, aucun rattrapage, dernière relance annonçant la conséquence et sa date,
// arrêt dès la régularisation ; toujours envoyées (transactionnelles).

const JOUR = 24 * 3600_000;
const NIVEAUX = [
  { niveau: 1, libelle: "1", joursAvantConsequence: 5, annonceConsequence: false },
  { niveau: 2, libelle: "2", joursAvantConsequence: 2, annonceConsequence: false },
  { niveau: 3, libelle: "3", joursAvantConsequence: 1, annonceConsequence: true },
];
const odoo = () => creerRegistre(process.env).odoo();
const comptes: string[] = [];

afterAll(async () => {
  await dbSite().envoi.deleteMany({ where: { compteId: { in: comptes } } });
  await dbSite().suiviLocation.deleteMany({ where: { abonnementRef: { startsWith: "FICT-" }, partenaireRef: { startsWith: "FICT-P-" } , impayeDepuis: { not: null } } });
  await rendreParcDesTests();
  await nettoyer();
});

describe("niveau atteint (fonction pure)", () => {
  const c = new Date("2026-11-10T10:00:00Z");
  const avant = (jours: number) => niveauAtteint(NIVEAUX, c, new Date(c.getTime() - jours * JOUR))?.niveau ?? null;
  it("trop tôt, J-5, J-2, la veille, après la conséquence", () => {
    expect(avant(6)).toBeNull();
    expect(avant(4)).toBe(1);
    expect(avant(1.5)).toBe(2);
    expect(avant(0.5)).toBe(3);
    expect(avant(-1)).toBeNull();
  });

  it("les niveaux sont lus dans Odoo (base fictive : J-5, J-2, J-1)", async () => {
    expect((await odoo().factures.lireNiveauxRelance()).map((n) => [n.niveau, n.joursAvantConsequence, n.annonceConsequence])).toEqual([
      [1, 5, false],
      [2, 2, false],
      [3, 1, true],
    ]);
  });
});

describe("prélèvement refusé d'une mise à disposition", () => {
  it("relances jusqu'à la suspension annoncée ; reçues malgré les préférences ; arrêt à la régularisation", async () => {
    await rendreParcDesTests();
    const c = await compteValide({ kitHolter: false });
    comptes.push(c.compteId);
    const { ref } = await odoo().location.creerAbonnement({ partenaireRef: c.partenaireRef, objet: "mise_a_disposition", defaultCode: "EC-SUN-OSCAR2", debut: new Date() }, `test-impaye:${randomUUID()}`);
    const debut = new Date(Date.now() - 2 * JOUR);
    await odoo().location.signalerImpaye(ref, debut);
    await dbSite().suiviLocation.upsert({
      where: { abonnementRef: ref },
      create: { abonnementRef: ref, partenaireRef: c.partenaireRef, dernierEtat: "en_cours", impayeNotifie: true, impayeDepuis: debut },
      update: { impayeNotifie: true, impayeDepuis: debut },
    });
    const { delaiRegularisationJours } = await odoo().location.lireRegles();
    const suspension = new Date(debut.getTime() + delaiRegularisationJours * JOUR);
    await dbSite().preferencesEmail.create({ data: { email: c.email, reapprovisionnement: false, panierAbandonne: false, alerteBons: false, alerteDroits: false } });

    // Veille de la suspension : dernière relance, qui annonce la conséquence et sa date.
    const veille = new Date(suspension.getTime() - 0.5 * JOUR);
    await programmerImpayes(veille, { compteIds: [c.compteId] });
    await programmerImpayes(veille, { compteIds: [c.compteId] });
    const envois = await dbSite().envoi.findMany({ where: { compteId: c.compteId, modele: "relance_impaye" } });
    expect(envois).toHaveLength(1);
    expect(envois[0]).toMatchObject({ famille: "transactionnel" });
    expect(["programme", "envoye"]).toContain(envois[0]!.etat);
    const email = await rendre(envois[0]!);
    expect(email.objet).toMatch(/^Dernier rappel/);
    expect(email.texte).toMatch(/Sans règlement avant le .* seront suspendus/);
    expect(email.texte).toMatch(/TTC/);
    expect(await objetValide(envois[0]!, veille)).toBe(true);
    await dbSite().preferencesEmail.delete({ where: { email: c.email } });
  });

  it("aucune relance le jour même du prélèvement refusé (l'email immédiat de F05 suffit)", async () => {
    await rendreParcDesTests();
    const c = await compteValide({ kitHolter: false });
    comptes.push(c.compteId);
    const { ref } = await odoo().location.creerAbonnement({ partenaireRef: c.partenaireRef, objet: "mise_a_disposition", defaultCode: "EC-SUN-OSCAR2", debut: new Date() }, `test-impaye:${randomUUID()}`);
    const debut = new Date();
    await odoo().location.signalerImpaye(ref, debut);
    await dbSite().suiviLocation.create({ data: { abonnementRef: ref, partenaireRef: c.partenaireRef, dernierEtat: "en_cours", impayeNotifie: true, impayeDepuis: debut } });
    // Délai de régularisation de 3 jours : le niveau 1 (J-5) serait atteint dès aujourd'hui.
    const regles = await dbDemo().reglesLocation.create({ data: { delaiRegularisationJours: 3 } });
    try {
      await programmerImpayes(new Date(debut.getTime() + 60_000), { compteIds: [c.compteId] });
      expect(await dbSite().envoi.count({ where: { compteId: c.compteId, modele: "relance_impaye" } })).toBe(0);
      // Le lendemain : la relance part.
      await programmerImpayes(new Date(debut.getTime() + JOUR), { compteIds: [c.compteId] });
      expect(await dbSite().envoi.count({ where: { compteId: c.compteId, modele: "relance_impaye" } })).toBe(1);
    } finally {
      await dbDemo().reglesLocation.delete({ where: { id: regles.id } });
    }
  });
});
