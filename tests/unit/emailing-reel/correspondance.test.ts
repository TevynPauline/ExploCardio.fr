import { describe, expect, it } from "vitest";
import { etiquetteCle, suiviDepuisEvenements, type EvenementBrevo } from "@/connecteurs/emailing/real/correspondance";

// T006 (F25, research R6) : événements Brevo → suivi du contrat.

const ev = (event: string, minute: number, reason?: string): EvenementBrevo => ({ event, date: `2026-11-16T10:${String(minute).padStart(2, "0")}:00.000+01:00`, reason });

describe("suivi depuis les événements Brevo", () => {
  it("aucun événement : null", () => {
    expect(suiviDepuisEvenements([])).toBeNull();
  });

  it("requête ou report : envoyé", () => {
    expect(suiviDepuisEvenements([ev("requests", 0), ev("deferred", 1)])).toMatchObject({ etat: "envoye", plainte: false });
  });

  it("remis puis ouvert : remis, avec la première date d'ouverture", () => {
    const s = suiviDepuisEvenements([ev("opened", 9), ev("requests", 0), ev("delivered", 1), ev("uniqueOpened", 5)]);
    expect(s).toMatchObject({ etat: "remis", motifRejet: null, rejetDefinitif: false });
    expect(s!.ouvertLe!.toISOString()).toBe(new Date("2026-11-16T10:05:00.000+01:00").toISOString());
  });

  it("rejet définitif (hardBounce, invalid, blocked, error), même après une remise", () => {
    for (const nom of ["hardBounce", "hardBounces", "invalid", "blocked", "error"]) {
      const s = suiviDepuisEvenements([ev("requests", 0), ev("delivered", 1), ev(nom, 2, "550 user unknown")]);
      expect(s).toMatchObject({ etat: "rejete", rejetDefinitif: true });
      expect(s!.motifRejet).toContain("550 user unknown");
    }
  });

  it("rejet temporaire : rejeté non définitif ; remis ensuite : remis", () => {
    expect(suiviDepuisEvenements([ev("requests", 0), ev("softBounce", 1)])).toMatchObject({ etat: "rejete", rejetDefinitif: false });
    expect(suiviDepuisEvenements([ev("softBounces", 1), ev("delivered", 3)])).toMatchObject({ etat: "remis" });
  });

  it("spam ou désinscription chez l'outil : plainte", () => {
    expect(suiviDepuisEvenements([ev("delivered", 1), ev("spam", 4)])).toMatchObject({ etat: "remis", plainte: true });
    expect(suiviDepuisEvenements([ev("delivered", 1), ev("unsubscribed", 4)])).toMatchObject({ plainte: true });
  });
});

describe("étiquette d'idempotence", () => {
  it("stable, préfixée, sans la clé en clair", () => {
    const e = etiquetteCle("commande:C202611-0001:confirmation");
    expect(e).toMatch(/^cle:[0-9a-f]{32}$/);
    expect(etiquetteCle("commande:C202611-0001:confirmation")).toBe(e);
    expect(e).not.toContain("C202611");
  });
});
