import { describe, expect, it } from "vitest";
import type { Article } from "@/connecteurs/odoo/interfaces";
import { estVisible, manquantsPublication } from "@/domaine/catalogue/publication";

// T009 — publication contrôlée (FR-037, US6-5) : seul un article présent dans Odoo et complet est visible.

const article = (modif: Partial<Article> = {}): Article => ({
  reference: "EC-TEST",
  nom: "Appareil de test",
  marque: "DMS",
  type: "equipement",
  categorie: "holter-ecg",
  description: null,
  formules: ["achat"],
  eligibleBonsAchat: false,
  suiviNumeroSerie: false,
  referenceFictive: false,
  compatibleAvec: [],
  estFictif: true,
  baremeFinancement: [],
  variantes: [
    {
      defaultCode: "EC-TEST",
      referenceFabricant: null,
      configuration: null,
      attributs: {},
      prixHt: 10000,
      tauxTva: 20,
      prixInvente: true,
      estFictif: true,
      offreMiseADisposition: null,
      quantiteParLot: 1,
      paliers: [],
      mensualitesForcees: [],
      composants: [],
    },
  ],
  ...modif,
});

const contenu = (modif: Record<string, unknown> = {}) => ({
  defaultCode: "EC-TEST",
  slug: "appareil-de-test",
  etat: "publie" as const,
  orphelin: false,
  textes: { descriptionCourte: "Un appareil simple." },
  photos: [],
  ...modif,
});

describe("manquantsPublication", () => {
  it("accepte un article complet, avec l'emplacement photo provisoire", () => {
    expect(manquantsPublication(contenu(), article())).toEqual([]);
  });

  it("refuse un article absent d'Odoo", () => {
    expect(manquantsPublication(contenu(), null)).toEqual(["L'article n'existe pas (ou plus) dans Odoo."]);
  });

  it("liste tout ce qui manque", () => {
    const manquants = manquantsPublication(
      contenu({ textes: { descriptionCourte: "  " }, slug: "" }),
      article({ nom: "", categorie: "", variantes: article().variantes.map((v) => ({ ...v, prixHt: 0 })) }),
    );
    expect(manquants).toEqual([
      "Le nom de l'article (dans Odoo).",
      "La catégorie de l'article (dans Odoo).",
      "Un prix HT (dans Odoo).",
      "La description courte.",
      "L'adresse de la fiche.",
    ]);
  });

  it("exige un texte de remplacement pour chaque photo (FR-043)", () => {
    expect(manquantsPublication(contenu({ photos: [{ chemin: "a.png", texteRemplacement: "" }] }), article())).toEqual([
      "Le texte de remplacement de chaque photo.",
    ]);
  });
});

describe("estVisible", () => {
  it("publié, présent dans Odoo et complet : visible", () => {
    expect(estVisible(contenu(), article())).toBe(true);
  });

  it("en préparation, orphelin, absent d'Odoo ou incomplet : invisible", () => {
    expect(estVisible(contenu({ etat: "preparation" }), article())).toBe(false);
    expect(estVisible(contenu({ orphelin: true }), article())).toBe(false);
    expect(estVisible(contenu(), null)).toBe(false);
    expect(estVisible(contenu({ textes: {} }), article())).toBe(false);
  });
});
