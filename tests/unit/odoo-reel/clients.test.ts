import { describe, expect, it } from "vitest";
import { creerOdooReel } from "@/connecteurs/odoo/real";
import { stockageMemoire } from "@/connecteurs/odoo/real/ecritures";
import { CLE_TEST, fauxOdoo } from "./faux-odoo";

// F14 lot 2 : fiches clients et opportunités en mode réel (plan-lots-2-3.md D2, D3).

const ENV = {
  CONNECTOR_ODOO: "real",
  ODOO_URL: "https://odoo.test",
  ODOO_DATABASE: "copie-test",
  ODOO_USER: "site@test",
  ODOO_API_KEY: CLE_TEST,
  ODOO_ENVIRONNEMENT: "recette",
};

type Ligne = Record<string, unknown> & { id: number };

function monter(partenaires: Ligne[] = [], neutralisee = true) {
  const donnees: Record<string, Ligne[]> = {
    "res.partner": partenaires,
    "res.country": [{ id: 75, code: "FR" }],
    "crm.team": [{ id: 1, name: "Sales" }],
    "ir.config_parameter": [{ id: 1, key: "database.is_neutralized", value: neutralisee ? "True" : "False" }],
  };
  const faux = fauxOdoo(donnees);
  const stockage = stockageMemoire();
  const odoo = creerOdooReel([], ENV, { fetch: faux.fetch, stockageEcritures: stockage });
  const ecritures = () => faux.appels.filter((a) => ["create", "write"].includes(String((a.args as unknown[])[4])));
  return { odoo, donnees, faux, stockage, ecritures };
}

const identite = {
  nom: "Dr Claire Martin",
  email: "claire.martin@cabinet-exemple.fr",
  telephone: "04 00 00 00 01",
  rpps: "10101010101",
  siret: "732 829 320 00074",
  cabinet: "Cabinet de cardiologie Exemple",
  adresses: [
    { type: "cabinet" as const, ligne1: "2 rue du Cœur", codePostal: "69001", ville: "Lyon" },
    { type: "livraison" as const, ligne1: "Bâtiment B", ligne2: "4 rue du Cœur", codePostal: "69001", ville: "Lyon" },
  ],
};

const societe = (id: number, siret: string | false, extra: Partial<Ligne> = {}): Ligne => ({
  id, name: `Cabinet ${id}`, is_company: true, email: `c${id}@exemple.fr`, phone: false, comment: false, l10n_fr_siret: siret,
  street: "1 rue", street2: false, zip: "75001", city: "Paris", active: true, type: "contact", parent_id: false, commercial_partner_id: [id, ""], ref: false, ...extra,
});

describe("clients en mode réel (lot 2)", () => {
  it("crée la fiche du cabinet, son contact et l'adresse de livraison, avec SIRET et RPPS ; même clé → même fiche, sans nouvelle écriture", async () => {
    const { odoo, donnees, ecritures } = monter();
    const a = await odoo.clients.creerOuRetrouverPartenaire(identite, "compte:1");
    expect(a.cree).toBe(true);
    expect(a.ref).toMatch(/^P\d+$/);
    const fiches = donnees["res.partner"]!;
    const cabinet = fiches.find((f) => `P${f.id}` === a.ref)!;
    expect(cabinet).toMatchObject({ name: "Cabinet de cardiologie Exemple", l10n_fr_siret: "73282932000074", street: "2 rue du Cœur", lang: "fr_FR", customer_rank: 1 });
    expect(String(cabinet.comment)).toContain("RPPS 10101010101");
    expect(fiches.find((f) => f.type === "contact" && f.name === "Dr Claire Martin")).toBeTruthy();
    expect(fiches.find((f) => f.type === "delivery")).toMatchObject({ street: "Bâtiment B", street2: "4 rue du Cœur" });

    const nb = ecritures().length;
    expect(await odoo.clients.creerOuRetrouverPartenaire(identite, "compte:1")).toEqual({ ref: a.ref, cree: false });
    expect(ecritures().length).toBe(nb);
  });

  it("retrouve un client existant par SIRET (espaces ignorés), sans rien créer ni modifier", async () => {
    const { odoo, ecritures } = monter([societe(23, "73282932000074", { ref: "CLI-0042" })]);
    expect(await odoo.clients.creerOuRetrouverPartenaire(identite, "compte:2")).toEqual({ ref: "P23", cree: false });
    expect(ecritures()).toHaveLength(0);
  });

  it("retrouve par email (contact rattaché → sa société) quand il n'y a pas de SIRET", async () => {
    const { odoo } = monter([
      societe(30, false),
      { ...societe(31, false), is_company: false, name: "Dr X", email: "Claire.Martin@cabinet-exemple.fr", parent_id: [30, ""], commercial_partner_id: [30, ""] },
    ]);
    const r = await odoo.clients.creerOuRetrouverPartenaire({ ...identite, siret: undefined }, "compte:3");
    expect(r).toEqual({ ref: "P30", cree: false });
  });

  it("réactive une fiche archivée retrouvée", async () => {
    const { odoo, donnees } = monter([societe(40, "73282932000074", { active: false })]);
    expect(await odoo.clients.creerOuRetrouverPartenaire(identite, "compte:4")).toEqual({ ref: "P40", cree: false });
    expect(donnees["res.partner"]!.find((f) => f.id === 40)!.active).toBe(true);
  });

  it("deux fiches actives avec le même SIRET : refus explicite, aucune écriture", async () => {
    const { odoo, ecritures } = monter([societe(50, "73282932000074"), societe(51, "732 829 320 00074")]);
    await expect(odoo.clients.creerOuRetrouverPartenaire(identite, "compte:5")).rejects.toMatchObject({
      code: "OPERATION_REFUSED",
      details: { cause: "siret_en_double", fiches: ["P50", "P51"] },
    });
    expect(ecritures()).toHaveLength(0);
  });

  it("met à jour coordonnées et adresses ; lit la situation (lot 2 : sans commandes, factures ni droits)", async () => {
    const { odoo } = monter();
    const { ref } = await odoo.clients.creerOuRetrouverPartenaire(identite, "compte:6");
    await odoo.clients.mettreAJourCoordonnees(ref, {
      telephone: "04 00 00 00 99",
      adresses: [
        { type: "livraison", ligne1: "10 avenue Neuve", codePostal: "69002", ville: "Lyon" },
        { type: "facturation", ligne1: "BP 12", codePostal: "69003", ville: "Lyon" },
      ],
    });
    const s = await odoo.clients.lireSituation(ref);
    expect(s.partenaire).toMatchObject({ ref, telephone: "04 00 00 00 99", rpps: "10101010101", siret: "73282932000074", estFictif: false });
    expect(s.partenaire.adresses).toEqual([
      { type: "cabinet", ligne1: "2 rue du Cœur", codePostal: "69001", ville: "Lyon" },
      { type: "livraison", ligne1: "10 avenue Neuve", codePostal: "69002", ville: "Lyon" },
      { type: "facturation", ligne1: "BP 12", codePostal: "69003", ville: "Lyon" },
    ]);
    expect(s).toMatchObject({ commandesRecentes: [], factures: [], locations: [], droitsAssistance: { statut: "inactif" } });
  });

  it("archive une fiche, une seule fois ; référence inconnue → NotFound", async () => {
    const { odoo, donnees, ecritures } = monter([societe(60, "73282932000074")]);
    await odoo.clients.archiverPartenaire("P60", "archivage:c1");
    await odoo.clients.archiverPartenaire("P60", "archivage:c1");
    expect(donnees["res.partner"]![0]!.active).toBe(false);
    expect(ecritures()).toHaveLength(1);
    await expect(odoo.clients.lireSituation("P999")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("base de recette non neutralisée : création refusée", async () => {
    const { odoo, donnees } = monter([], false);
    await expect(odoo.clients.creerOuRetrouverPartenaire(identite, "compte:7")).rejects.toMatchObject({ code: "OPERATION_REFUSED" });
    expect(donnees["res.partner"]).toHaveLength(0);
  });
});

describe("opportunités en mode réel (lot 2)", () => {
  it("copie une demande de devis d'un visiteur, étiquetée « Site », une seule fois par clé", async () => {
    const { odoo, donnees } = monter();
    const demande = {
      type: "devis" as const,
      referenceDemande: "d1",
      contenu: { objet: "Holter ECG", nom: "Dr Paul Durand", email: "paul@exemple.fr", telephone: "06 00 00 00 00", cabinet: "Cabinet Durand", besoin: "Deux holters <urgent>", message: null },
    };
    const a = await odoo.opportunites.copierDemande(demande, "devis:d1");
    const b = await odoo.opportunites.copierDemande(demande, "devis:d1");
    expect(b).toEqual(a);
    expect(donnees["crm.lead"]).toHaveLength(1);
    const lead = donnees["crm.lead"]![0]!;
    expect(lead).toMatchObject({ type: "opportunity", name: "Demande de devis — Cabinet Durand", contact_name: "Dr Paul Durand", email_from: "paul@exemple.fr", team_id: [1, ""] });
    expect(String(lead.description)).toContain("Deux holters &lt;urgent&gt;");
    expect(donnees["crm.tag"]).toEqual([expect.objectContaining({ name: "Site" })]);
  });

  it("relie une demande de financement à la fiche du client", async () => {
    const { odoo, donnees } = monter([societe(70, "73282932000074")]);
    await odoo.opportunites.copierDemande(
      { type: "financement", referenceDemande: "f1", partenaireRef: "P70", contenu: { equipements: [{ nom: "Holter", quantite: 2 }], dureeMois: 36, cabinet: { nom: "Cabinet 70" } } },
      "financement:f1",
    );
    expect(donnees["crm.lead"]![0]).toMatchObject({ name: "Demande de financement — Cabinet 70", partner_id: [70, ""] });
    expect(String(donnees["crm.lead"]![0]!.description)).toContain("Durée (mois)</strong> : 36");
  });
});
