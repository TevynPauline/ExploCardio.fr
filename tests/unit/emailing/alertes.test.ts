import { afterAll, describe, expect, it } from "vitest";
import { creerRegistre } from "@/connecteurs/registre";
import { ajusterDroits } from "@/connecteurs/odoo/demo/fidelite-admin";
import { prochainCreneau, REGLES_PAR_DEFAUT } from "@/domaine/emailing/decision";
import { releverEnvois } from "@/domaine/emailing/envoi";
import { changerPreference } from "@/domaine/emailing/preferences";
import { envoyerRappelsFidelite } from "@/domaine/fidelite/rappels";
import { dbSite } from "@/lib/db/site";
import { commandePayee, compteValide, ELECTRODES, nettoyer } from "../fidelite/outils";

// T020 — alertes de fin des droits et d'expiration des bons (F10, US5, D3) : emails de service,
// avec le pied de préférences ; une par échéance ; désactivables ; annulées à l'envoi si les
// droits ont été prolongés entre-temps.

const JOUR = 24 * 3600_000;
const fidelite = () => creerRegistre(process.env).odoo().fidelite;
const comptes: string[] = [];

afterAll(async () => {
  await dbSite().envoi.deleteMany({ where: { compteId: { in: comptes } } });
  await nettoyer();
});

async function compteAvecDroits() {
  const c = await compteValide({ kitHolter: false });
  comptes.push(c.compteId);
  await commandePayee(c.partenaireRef, [{ defaultCode: ELECTRODES, quantite: 5 }]);
  const { fin } = await fidelite().lireDroitsAssistance(c.partenaireRef);
  return { ...c, fin: fin! };
}

describe("alerte de fin des droits", () => {
  it("email de service avec la date, comment prolonger, et le pied de préférences", async () => {
    const c = await compteAvecDroits();
    await envoyerRappelsFidelite(prochainCreneau(new Date(c.fin.getTime() - 3 * JOUR), REGLES_PAR_DEFAUT));
    const [e] = await dbSite().envoi.findMany({ where: { compteId: c.compteId, modele: "droits_rappel_fin" } });
    expect(e).toMatchObject({ famille: "service", scenario: "alerte_droits", etat: "envoye" });
    const m = await dbSite().messageDemonstration.findFirstOrThrow({ where: { cle: e!.cle } });
    expect(m.texte).toMatch(/Commandez avant le/);
    expect(m.texte).toMatch(/Vous recevez cet email parce que vos droits d’assistance/);
    expect(m.texte).toMatch(/Gérer mes préférences/);
  });

  it("désactivée par le client : non envoyée", async () => {
    const c = await compteAvecDroits();
    await changerPreference(c.email, "alerteDroits", false, "mon_compte");
    await envoyerRappelsFidelite(prochainCreneau(new Date(c.fin.getTime() - 3 * JOUR), REGLES_PAR_DEFAUT));
    expect(await dbSite().envoi.findMany({ where: { compteId: c.compteId, modele: "droits_rappel_fin" } })).toMatchObject([{ etat: "annule", motif: "préférence du client" }]);
    await dbSite().preferencesEmail.delete({ where: { email: c.email } });
  });

  it("droits prolongés entre la programmation et l'envoi : sans objet, non envoyée", async () => {
    const c = await compteAvecDroits();
    // Programmée un samedi : reportée au lundi matin.
    let samedi = new Date(c.fin.getTime() - 7 * JOUR);
    while (samedi.getUTCDay() !== 6) samedi = new Date(samedi.getTime() + JOUR);
    samedi.setUTCHours(10);
    await envoyerRappelsFidelite(samedi);
    const [e] = await dbSite().envoi.findMany({ where: { compteId: c.compteId, modele: "droits_rappel_fin" } });
    expect(e!.etat).toBe("programme");
    await ajusterDroits(c.partenaireRef, new Date(c.fin.getTime() + 200 * JOUR), "Prolongation de test", "tests");
    await releverEnvois(new Date(e!.programmeLe.getTime() + 60_000));
    expect(await dbSite().envoi.findUniqueOrThrow({ where: { id: e!.id } })).toMatchObject({ etat: "annule", motif: "objet disparu" });
  });
});
