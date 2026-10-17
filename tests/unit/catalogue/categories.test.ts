import { describe, expect, it } from "vitest";
import type { Article, Disponibilite } from "@/connecteurs/odoo/interfaces";
import { cartesDeCategorie, type FiltresCategorie } from "@/domaine/catalogue/categories";
import type { EntreeCatalogue } from "@/domaine/catalogue/lecture";

// T013 — page catégorie (FR-005 à FR-007, US1) : cartes, filtres combinables, tri.

let n = 0;
function entree(o: {
  nom: string;
  marque: string;
  categorie?: string;
  prix: number[];
  formules?: Article["formules"];
  dispo?: Disponibilite["achat"];
  sousCategorie?: string;
  ordre?: number;
  mad?: number;
}): EntreeCatalogue {
  n++;
  const codes = o.prix.map((_, i) => `EC-T${n}-${i}`);
  const article: Article = {
    reference: codes[0]!,
    nom: o.nom,
    marque: o.marque,
    type: "equipement",
    categorie: o.categorie ?? "mapa",
    description: null,
    formules: o.formules ?? ["achat"],
    eligibleBonsAchat: false,
    suiviNumeroSerie: false,
    referenceFictive: false,
    compatibleAvec: [],
    estFictif: true,
    baremeFinancement: [],
    variantes: o.prix.map((p, i) => ({
      defaultCode: codes[i]!,
      referenceFabricant: null,
      configuration: null,
      attributs: {},
      prixHt: p,
      tauxTva: 20,
      prixInvente: true,
      estFictif: true,
      offreMiseADisposition: o.mad ? { premierMoisHt: 4900, moisSuivantsHt: o.mad, kitRequis: null, valeurRemplacementHt: 100000 } : null,
      quantiteParLot: 1,
      paliers: [],
      mensualitesForcees: [],
      composants: [],
    })),
  };
  return {
    article,
    chemin: `/holter-tensionnel/${o.nom.toLowerCase()}`,
    disponibilites: new Map(codes.map((c) => [c, { defaultCode: c, achat: o.dispo ?? { etat: "disponible" }, miseADisposition: o.mad ? { etat: "disponible" } : null, quantiteDisponible: 5, delaiReassortJours: 15 }])),
    contenu: {
      defaultCode: codes[0]!,
      slug: o.nom.toLowerCase(),
      ordre: o.ordre ?? n,
      photos: [],
      sousCategorie: o.sousCategorie ? { id: o.sousCategorie, categorie: "mapa", libelle: o.sousCategorie, slug: o.sousCategorie, ordre: 1 } : null,
    } as unknown as EntreeCatalogue["contenu"],
  };
}

const oscar = entree({ nom: "Oscar", marque: "SunTech", prix: [189000, 229000], formules: ["achat", "mise_a_disposition", "financement"], mad: 8900, sousCategorie: "enregistreurs", ordre: 2 });
const bravo = entree({ nom: "Bravo", marque: "SunTech", prix: [129000], dispo: { etat: "delai", delaiJours: 10 }, sousCategorie: "enregistreurs", ordre: 3 });
const watch = entree({ nom: "Watch", marque: "Microlife", prix: [99000], dispo: { etat: "indisponible" }, sousCategorie: "autres", ordre: 1 });
const location = entree({ nom: "Loc", marque: "DMS", prix: [150000], formules: ["mise_a_disposition"], mad: 7900, ordre: 4 });
const ailleurs = entree({ nom: "Holter", marque: "DMS", categorie: "holter-ecg", prix: [100000] });
const toutes = [oscar, bravo, watch, location, ailleurs];

const lister = (f: FiltresCategorie = {}) => cartesDeCategorie(toutes, "mapa", f);

describe("cartesDeCategorie", () => {
  it("ne garde que la catégorie, dans l'ordre de l'administrateur", () => {
    expect(lister().cartes.map((c) => c.nom)).toEqual(["Watch", "Oscar", "Bravo", "Loc"]);
    expect(lister().total).toBe(4);
  });

  it("carte : prix « à partir de », location, disponibilité", () => {
    const c = lister().cartes.find((x) => x.nom === "Oscar")!;
    expect(c).toMatchObject({ prixHt: 189000, aPartirDe: true, mensuel: false, location: true, disponibilite: { etat: "disponible" } });
    expect(lister().cartes.find((x) => x.nom === "Bravo")!).toMatchObject({ aPartirDe: false, disponibilite: { etat: "delai", delaiJours: 10 } });
  });

  it("article proposé seulement en mise à disposition : prix mensuel « à partir de »", () => {
    expect(lister().cartes.find((x) => x.nom === "Loc")!).toMatchObject({ prixHt: 7900, mensuel: true, aPartirDe: true, location: true });
  });

  it("logiciel proposé seulement en abonnement (sans offre détaillée) : prix mensuel, disponibilité de l'article", () => {
    const logiciel = entree({ nom: "Logiciel", marque: "DMS", prix: [4900], formules: ["mise_a_disposition"] });
    const [carte] = cartesDeCategorie([logiciel], "mapa", {}).cartes;
    expect(carte).toMatchObject({ prixHt: 4900, mensuel: true, aPartirDe: false, location: false, disponibilite: { etat: "disponible" } });
  });

  it("filtres marque, type et disponibilité, combinables", () => {
    expect(lister({ marque: "SunTech" }).cartes.map((c) => c.nom)).toEqual(["Oscar", "Bravo"]);
    expect(lister({ type: "autres" }).cartes.map((c) => c.nom)).toEqual(["Watch"]);
    expect(lister({ dispo: "delai" }).cartes.map((c) => c.nom)).toEqual(["Bravo"]);
    expect(lister({ marque: "SunTech", dispo: "disponible" }).cartes.map((c) => c.nom)).toEqual(["Oscar"]);
    expect(lister({ marque: "SunTech", type: "autres" }).total).toBe(0);
  });

  it("filtres disponibles : marques, types et disponibilités présents dans la catégorie", () => {
    const { filtresDisponibles } = lister({ marque: "SunTech" });
    expect(filtresDisponibles.marques).toEqual(["DMS", "Microlife", "SunTech"]);
    expect(filtresDisponibles.types.map((t) => t.slug)).toEqual(["autres", "enregistreurs"]);
    expect(filtresDisponibles.dispos).toEqual(["disponible", "delai", "indisponible"]);
  });

  it("tri par prix croissant", () => {
    expect(lister({ tri: "prix" }).cartes.map((c) => c.nom)).toEqual(["Loc", "Watch", "Bravo", "Oscar"]);
  });

  it("ignore une valeur de filtre inconnue", () => {
    expect(lister({ dispo: "nimporte" as never }).total).toBe(4);
  });
});
