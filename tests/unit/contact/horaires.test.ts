import { describe, expect, it } from "vitest";
import { etatReponse, HORAIRES_PAR_DEFAUT, lireHorairesJson, resumeHoraires } from "@/domaine/contact/horaires";

// T002 — horaires de réponse (F09, FR-006, D1) : ouvert ou prochaine réponse, à l'heure de Paris,
// jours fériés calculés, fermetures exceptionnelles, plusieurs plages.

const paris = (iso: string) => new Date(iso); // instants donnés en UTC (+02:00 l'été, +01:00 l'hiver)

describe("horaires de réponse", () => {
  it("ouvert un mardi à 10 h ; fermé un mardi à 19 h → demain à 9 h", () => {
    expect(etatReponse(HORAIRES_PAR_DEFAUT, [], paris("2026-10-20T08:00:00Z"))).toMatchObject({ ouvert: true });
    const soir = etatReponse(HORAIRES_PAR_DEFAUT, [], paris("2026-10-20T17:30:00Z"));
    expect(soir).toMatchObject({ ouvert: false, prochaine: { jour: "2026-10-21", heure: "09:00" } });
    expect(soir.libelle).toBe("Nous vous répondrons demain à 9 h.");
  });

  it("vendredi soir → lundi à 9 h ; avant l'ouverture → aujourd'hui", () => {
    expect(etatReponse(HORAIRES_PAR_DEFAUT, [], paris("2026-10-23T18:00:00Z")).libelle).toBe("Nous vous répondrons lundi à 9 h.");
    expect(etatReponse(HORAIRES_PAR_DEFAUT, [], paris("2026-10-20T05:00:00Z")).libelle).toBe("Nous vous répondrons aujourd’hui à 9 h.");
  });

  it("jour férié (11 novembre, mercredi) → jeudi à 9 h", () => {
    const e = etatReponse(HORAIRES_PAR_DEFAUT, [], paris("2026-11-11T10:00:00Z"));
    expect(e).toMatchObject({ ouvert: false, prochaine: { jour: "2026-11-12", heure: "09:00" } });
  });

  it("fermeture exceptionnelle sur plusieurs jours : réponse le jour ouvré suivant, avec une date", () => {
    const e = etatReponse(HORAIRES_PAR_DEFAUT, [{ du: "2026-12-24", au: "2027-01-03", motif: "Congés" }], paris("2026-12-23T18:00:00Z"));
    expect(e.prochaine).toEqual({ jour: "2027-01-04", heure: "09:00" });
    expect(e.libelle).toBe("Nous vous répondrons le lundi 4 janvier à 9 h.");
  });

  it("plusieurs plages : fermé à 12 h 30 → aujourd'hui à 14 h", () => {
    const h = { ...HORAIRES_PAR_DEFAUT, "2": [["09:00", "12:00"], ["14:00", "18:30"]] as [string, string][] };
    const e = etatReponse(h, [], paris("2026-10-20T10:30:00Z"));
    expect(e.libelle).toBe("Nous vous répondrons aujourd’hui à 14 h.");
    expect(etatReponse(h, [], paris("2026-10-20T16:15:00Z")).ouvert).toBe(true); // 18 h 15
  });

  it("JSON invalide → horaires par défaut ; résumé lisible", () => {
    expect(lireHorairesJson("pas du json")).toEqual(HORAIRES_PAR_DEFAUT);
    expect(resumeHoraires(HORAIRES_PAR_DEFAUT)).toBe("Du lundi au vendredi, de 9 h à 18 h, hors jours fériés");
  });
});
