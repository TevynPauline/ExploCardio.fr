import { afterAll, describe, expect, it } from "vitest";
import { dbSite } from "@/lib/db/site";
import { csvOuverture, inscrireOuverture, supprimerInscriptionOuverture, TEXTE_CONSENTEMENT_OUVERTURE, validerOuverture } from "@/domaine/ouverture";
import { estHotePageAttente, estRessourcePageAttente } from "@/lib/page-attente";

// T006 — page d'attente (F17) : validation, doublon, commentaires, consentement, CSV,
// suppression, adresses.

describe("inscriptions à l'ouverture", () => {
  const email = `ouverture-${Date.now()}@demo.explocardio.test`;
  afterAll(async () => {
    await dbSite().inscriptionOuverture.deleteMany({ where: { email } });
    await dbSite().consentement.deleteMany({ where: { email } });
    await dbSite().journalAction.deleteMany({ where: { objet: email } });
  });

  it("refuse un nom vide ou trop long, une adresse ou un téléphone invalides, un commentaire trop long et l'absence de consentement", () => {
    expect(validerOuverture({ nom: " ", email: "pas-une-adresse", telephone: "abc", commentaire: "x".repeat(2001), consentement: false })).toEqual({
      nom: "Indiquez votre nom.",
      email: expect.stringContaining("adresse email valide"),
      telephone: "Ce numéro de téléphone n’est pas valide.",
      commentaire: expect.stringContaining("2 000"),
      consentement: expect.stringContaining("Cochez la case"),
    });
    expect(validerOuverture({ nom: "x".repeat(121), email: "a@b.fr", telephone: "", commentaire: "", consentement: true }).nom).toContain("120");
    expect(validerOuverture({ nom: "Dr Martin", email: "martin@cabinet.fr", telephone: "+33 6 12 34 56 78", commentaire: "", consentement: true })).toEqual({});
  });

  it("n'inscrit une adresse qu'une fois, garde chaque commentaire et le texte du consentement, supprime avec journal", async () => {
    await inscrireOuverture({ nom: "Dr Premier", email: email.toUpperCase(), telephone: "06 00 00 00 01", commentaire: "Premier message.", consentement: true });
    await inscrireOuverture({ nom: " Dr Second ", email, telephone: "", commentaire: " Second message. ", consentement: true }, new Date("2026-10-28T09:05:00Z"));
    const lignes = await dbSite().inscriptionOuverture.findMany({ where: { email } });
    expect(lignes).toHaveLength(1);
    // Nom remplacé, téléphone gardé (non redonné), commentaires mis bout à bout et datés.
    expect(lignes[0]).toMatchObject({
      nom: "Dr Second",
      telephone: "06 00 00 00 01",
      commentaire: "Premier message.\n\n[28/10/2026 10:05] Second message.",
      textePresente: TEXTE_CONSENTEMENT_OUVERTURE,
    });
    expect(await dbSite().consentement.count({ where: { email, objet: "ouverture", etat: true } })).toBe(2);

    expect(await supprimerInscriptionOuverture(lignes[0]!.id, { id: "essai", libelle: "essai" })).toBe(true);
    expect(await dbSite().inscriptionOuverture.count({ where: { email } })).toBe(0);
    expect(await dbSite().consentement.count({ where: { email, objet: "ouverture", etat: false } })).toBe(1);
    expect(await dbSite().journalAction.count({ where: { objet: email, action: "demandes.ouverture.suppression" } })).toBe(1);
    expect(await supprimerInscriptionOuverture(lignes[0]!.id, { id: "essai", libelle: "essai" })).toBe(false);
  });

  it("exporte un CSV lisible par Excel (BOM, point-virgule, guillemets si besoin)", () => {
    const csv = csvOuverture([{ nom: 'Dr "Doc"; Martin', email: "martin@cabinet.fr", telephone: null, commentaire: "Ligne 1\nLigne 2", creeLe: new Date("2026-10-28T09:05:00Z") }]);
    expect(csv.startsWith("﻿Date d'inscription;Nom;Email;Téléphone;Commentaires\r\n")).toBe(true);
    expect(csv).toContain('28/10/2026 10:05:00;"Dr ""Doc""; Martin";martin@cabinet.fr;;"Ligne 1\nLigne 2"\r\n');
  });
});

describe("adresses de la page d'attente", () => {
  const env = { DOMAINES_PAGE_ATTENTE: " www.explocardio.fr, 127.0.0.1 " };
  it("reconnaît les adresses déclarées, sans tenir compte du port ni de la casse", () => {
    expect(estHotePageAttente("WWW.explocardio.fr", env)).toBe(true);
    expect(estHotePageAttente("127.0.0.1:3000", env)).toBe(true);
    expect(estHotePageAttente("explocardio.osc-fr1.scalingo.io", env)).toBe(false);
    expect(estHotePageAttente("localhost:3000", env)).toBe(false);
    expect(estHotePageAttente(null, env)).toBe(false);
    expect(estHotePageAttente("www.explocardio.fr", {})).toBe(false);
  });

  it("ne laisse passer que les polices, les logos et robots.txt", () => {
    expect(estRessourcePageAttente("/fonts/inter/inter-latin-400-normal.woff2")).toBe(true);
    expect(estRessourcePageAttente("/robots.txt")).toBe(true);
    expect(estRessourcePageAttente("/admin")).toBe(false);
    expect(estRessourcePageAttente("/stockage/produits/0123456789abcdef01234567.png")).toBe(false);
  });
});
