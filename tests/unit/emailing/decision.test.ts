import { describe, expect, it } from "vitest";
import { decider, prochainCreneau, REGLES_PAR_DEFAUT, type ContexteDecision } from "@/domaine/emailing/decision";

// T005 — décision d'envoi selon la famille (F10, research R3, D6, D10) : fonction pure.

const t = (iso: string) => new Date(iso); // instants UTC ; Paris = UTC+2 jusqu'au 25 octobre 2026
const MARDI_10H = t("2026-10-20T08:00:00Z");

function ctx(c: Partial<ContexteDecision> = {}): ContexteDecision {
  return {
    famille: "service",
    scenario: "reapprovisionnement",
    statutCompte: "valide",
    preferences: { reapprovisionnement: true, panierAbandonne: true, alerteBons: true, alerteDroits: true },
    abonne: false,
    adresseSuspendue: false,
    scenarioActif: true,
    objetValide: true,
    envoisRecents: [],
    creeLe: MARDI_10H,
    ...c,
  };
}

describe("emails transactionnels et d'équipe", () => {
  it("toujours envoyés, quelles que soient les préférences, l'abonnement ou le compte", () => {
    const tout = ctx({
      famille: "transactionnel",
      scenario: null,
      statutCompte: "suspendu",
      preferences: { reapprovisionnement: false, panierAbandonne: false, alerteBons: false, alerteDroits: false },
      abonne: false,
      adresseSuspendue: true,
      envoisRecents: [MARDI_10H, MARDI_10H, MARDI_10H],
    });
    expect(decider(tout, REGLES_PAR_DEFAUT, t("2026-10-24T22:00:00Z"))).toEqual({ action: "envoyer" });
    expect(decider({ ...tout, famille: "equipe" }, REGLES_PAR_DEFAUT, MARDI_10H)).toEqual({ action: "envoyer" });
  });

  it("relance d'impayé (transactionnelle) : annulée seulement si l'objet a disparu", () => {
    expect(decider(ctx({ famille: "transactionnel", scenario: "impaye", objetValide: false }), REGLES_PAR_DEFAUT, MARDI_10H)).toMatchObject({ action: "annuler" });
  });
});

describe("emails de service", () => {
  it("envoyé en plage, préférence active, compte valide", () => {
    expect(decider(ctx(), REGLES_PAR_DEFAUT, MARDI_10H)).toEqual({ action: "envoyer" });
  });

  it("annulé si le client a désactivé ce type, ou si le scénario est désactivé", () => {
    const p = { reapprovisionnement: false, panierAbandonne: true, alerteBons: true, alerteDroits: true };
    expect(decider(ctx({ preferences: p }), REGLES_PAR_DEFAUT, MARDI_10H)).toEqual({ action: "annuler", motif: "préférence du client" });
    expect(decider(ctx({ preferences: p, scenario: "panier_abandonne" }), REGLES_PAR_DEFAUT, MARDI_10H)).toEqual({ action: "envoyer" });
    expect(decider(ctx({ scenarioActif: false }), REGLES_PAR_DEFAUT, MARDI_10H)).toMatchObject({ action: "annuler" });
  });

  it("envoyé à un client non abonné à la newsletter", () => {
    expect(decider(ctx({ abonne: false }), REGLES_PAR_DEFAUT, MARDI_10H)).toEqual({ action: "envoyer" });
  });

  it("annulé pour un compte suspendu, refusé ou supprimé", () => {
    for (const statutCompte of ["suspendu", "refuse", "supprime"] as const) {
      expect(decider(ctx({ statutCompte }), REGLES_PAR_DEFAUT, MARDI_10H)).toMatchObject({ action: "annuler" });
    }
  });

  it("annulé si l'adresse est suspendue ou si l'objet a disparu", () => {
    expect(decider(ctx({ adresseSuspendue: true }), REGLES_PAR_DEFAUT, MARDI_10H)).toEqual({ action: "annuler", motif: "adresse suspendue" });
    expect(decider(ctx({ objetValide: false }), REGLES_PAR_DEFAUT, MARDI_10H)).toEqual({ action: "annuler", motif: "objet disparu" });
  });

  it("hors plage : reporté au prochain créneau (soir, week-end, jour férié)", () => {
    expect(decider(ctx(), REGLES_PAR_DEFAUT, t("2026-10-20T18:00:00Z"))).toEqual({ action: "reporter", date: t("2026-10-21T06:00:00Z") });
    expect(decider(ctx(), REGLES_PAR_DEFAUT, t("2026-10-24T10:00:00Z"))).toEqual({ action: "reporter", date: t("2026-10-26T07:00:00Z") });
    expect(decider(ctx({ creeLe: t("2026-11-11T10:00:00Z") }), REGLES_PAR_DEFAUT, t("2026-11-11T10:00:00Z"))).toEqual({ action: "reporter", date: t("2026-11-12T07:00:00Z") });
  });

  it("fréquence : au-delà de 2 envois en 7 jours, reporté quand la fenêtre se libère", () => {
    const recents = [t("2026-10-15T08:00:00Z"), t("2026-10-19T08:00:00Z")];
    expect(decider(ctx({ envoisRecents: recents }), REGLES_PAR_DEFAUT, MARDI_10H)).toEqual({ action: "reporter", date: t("2026-10-22T08:00:00Z") });
    expect(decider(ctx({ envoisRecents: [recents[1]!] }), REGLES_PAR_DEFAUT, MARDI_10H)).toEqual({ action: "envoyer" });
  });

  it("reporté depuis plus de 7 jours : annulé (motif fréquence)", () => {
    const recents = [t("2026-10-27T08:00:00Z"), t("2026-10-28T08:00:00Z")];
    expect(decider(ctx({ envoisRecents: recents, creeLe: t("2026-10-20T08:00:00Z") }), REGLES_PAR_DEFAUT, t("2026-10-28T09:00:00Z"))).toEqual({ action: "annuler", motif: "fréquence" });
  });
});

describe("emails commerciaux", () => {
  it("réservés aux abonnés confirmés", () => {
    expect(decider(ctx({ famille: "commercial", scenario: "campagne", abonne: false }), REGLES_PAR_DEFAUT, MARDI_10H)).toEqual({ action: "annuler", motif: "non abonné" });
    expect(decider(ctx({ famille: "commercial", scenario: "campagne", abonne: true }), REGLES_PAR_DEFAUT, MARDI_10H)).toEqual({ action: "envoyer" });
  });

  it("abonné sans compte : envoyé ; compte suspendu : annulé", () => {
    expect(decider(ctx({ famille: "commercial", scenario: "campagne", abonne: true, statutCompte: null }), REGLES_PAR_DEFAUT, MARDI_10H)).toEqual({ action: "envoyer" });
    expect(decider(ctx({ famille: "commercial", scenario: "campagne", abonne: true, statutCompte: "suspendu" }), REGLES_PAR_DEFAUT, MARDI_10H)).toMatchObject({ action: "annuler" });
  });
});

describe("prochain créneau", () => {
  it("dans la plage : inchangé ; avant 8 h : le jour même à 8 h", () => {
    expect(prochainCreneau(MARDI_10H, REGLES_PAR_DEFAUT)).toEqual(MARDI_10H);
    expect(prochainCreneau(t("2026-10-20T04:00:00Z"), REGLES_PAR_DEFAUT)).toEqual(t("2026-10-20T06:00:00Z"));
  });

  it("change d'heure (heure d'hiver le 25 octobre) : 8 h de Paris = 7 h UTC", () => {
    expect(prochainCreneau(t("2026-10-23T18:00:00Z"), REGLES_PAR_DEFAUT)).toEqual(t("2026-10-26T07:00:00Z"));
  });
});
