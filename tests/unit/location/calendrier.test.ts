import { describe, expect, it } from "vitest";
import { datesProposees, estLendemain, premiereDateLivraison, type ReglesLivraison } from "@/domaine/location/calendrier";
import { joursFeries } from "@/lib/calendrier";

// T009 — calendrier de livraison d'une mise à disposition (F05, R3, SC-001).

const regles: ReglesLivraison = { heureLimite: "14:00", joursNonLivres: [], zonesSansLendemain: ["20"], delaiZonesJours: 2 };
/** Instant à Paris : « 2026-10-14T13:59 » en heure d'été (UTC+2) ou d'hiver (UTC+1). */
const paris = (local: string, decalage = "+02:00") => new Date(`${local}:00${decalage}`);

describe("première date de livraison", () => {
  it("un jour ouvré avant l'heure limite : le lendemain", () => {
    expect(premiereDateLivraison(paris("2026-10-14T13:59"), regles)).toBe("2026-10-15"); // mercredi → jeudi
  });
  it("une minute après l'heure limite : le surlendemain ouvré", () => {
    expect(premiereDateLivraison(paris("2026-10-14T14:00"), regles)).toBe("2026-10-16");
  });
  it("vendredi après l'heure limite : mardi ; vendredi avant : lundi", () => {
    expect(premiereDateLivraison(paris("2026-10-16T15:00"), regles)).toBe("2026-10-20");
    expect(premiereDateLivraison(paris("2026-10-16T09:00"), regles)).toBe("2026-10-19");
  });
  it("samedi et dimanche : mardi (préparation le lundi)", () => {
    expect(premiereDateLivraison(paris("2026-10-17T09:00"), regles)).toBe("2026-10-20");
    expect(premiereDateLivraison(paris("2026-10-18T09:00"), regles)).toBe("2026-10-20");
  });
  it("jours fériés : 1er mai, Ascension, lundi de Pâques calculés", () => {
    expect(joursFeries(2027)).toEqual(expect.arrayContaining(["2027-03-29", "2027-05-01", "2027-05-06", "2027-05-17"]));
    // Mercredi 5 mai 2027 avant l'heure limite : jeudi 6 (Ascension) exclu → vendredi 7.
    expect(premiereDateLivraison(paris("2027-05-05T10:00"), regles)).toBe("2027-05-07");
    // Jeudi 30 avril 2026 avant l'heure limite : vendredi 1er mai exclu → lundi 4.
    expect(premiereDateLivraison(paris("2026-04-30T10:00"), regles)).toBe("2026-05-04");
  });
  it("jours non livrés réglés au back-office", () => {
    expect(premiereDateLivraison(paris("2026-10-14T10:00"), { ...regles, joursNonLivres: ["2026-10-15"] })).toBe("2026-10-16");
  });
  it("Corse (code postal en 20) : +2 jours ouvrés, jamais le lendemain", () => {
    const d = premiereDateLivraison(paris("2026-10-14T10:00"), regles, "20000");
    expect(d).toBe("2026-10-19");
    expect(estLendemain(paris("2026-10-14T10:00"), d)).toBe(false);
  });
  it("aucun appareil avant une date : première date ouvrée à partir de celle du parc", () => {
    expect(premiereDateLivraison(paris("2026-10-14T10:00"), regles, null, "2026-10-24")).toBe("2026-10-26"); // samedi → lundi
  });
  it("heure de Paris en hiver", () => {
    expect(premiereDateLivraison(paris("2026-12-02T13:30", "+01:00"), regles)).toBe("2026-12-03");
    expect(premiereDateLivraison(paris("2026-12-02T14:30", "+01:00"), regles)).toBe("2026-12-04");
  });
});

describe("dates proposées", () => {
  it("jours ouvrés seulement, à partir de la première date", () => {
    const dates = datesProposees("2026-10-15", regles, 5);
    expect(dates).toEqual(["2026-10-15", "2026-10-16", "2026-10-19", "2026-10-20", "2026-10-21"]);
    expect(datesProposees("2026-10-31", regles, 2)).toEqual(["2026-11-02", "2026-11-03"]); // 1er novembre férié, dimanche
  });
  it("« le lendemain » : le jour civil suivant la commande", () => {
    expect(estLendemain(paris("2026-10-14T13:59"), "2026-10-15")).toBe(true);
    expect(estLendemain(paris("2026-10-16T09:00"), "2026-10-19")).toBe(false);
  });
});
