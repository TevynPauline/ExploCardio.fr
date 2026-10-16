import type { Centimes, MarqueFictive } from "../../types";
import type { EtatDisponibilite } from "./stock";

// Domaine « Catalogue » du connecteur Odoo (contracts/odoo.md §1).

export type TypeArticle = "equipement" | "consommable" | "accessoire" | "logiciel" | "service";
export type Formule = "achat" | "mise_a_disposition" | "financement";

export type Categorie = MarqueFictive & {
  code: string;
  nom: string;
  ordre: number;
  parentCode: string | null;
};

export type FiltresArticles = {
  marque?: string;
  type?: TypeArticle;
  disponibilite?: EtatDisponibilite["etat"];
};

export type ResumeArticle = MarqueFictive & {
  /** Référence de l'article : default_code de sa première variante. */
  reference: string;
  nom: string;
  marque: string;
  type: TypeArticle;
  categorie: string;
  prixAPartirDeHt: Centimes;
  formules: Formule[];
  disponibilite: EtatDisponibilite;
  referenceFictive: boolean;
  prixInvente: boolean;
};

export type OffreMiseADisposition = {
  premierMoisHt: Centimes;
  moisSuivantsHt: Centimes;
  kitRequis: string | null;
  valeurRemplacementHt: Centimes;
};

export type VarianteArticle = MarqueFictive & {
  defaultCode: string;
  referenceFabricant: string | null;
  configuration: string | null;
  attributs: Record<string, string>;
  prixHt: Centimes;
  tauxTva: number;
  prixInvente: boolean;
  offreMiseADisposition: OffreMiseADisposition | null;
};

export type BaremeFinancement = { dureeMois: number; coefficientPourcent: number };

export type Article = MarqueFictive & {
  reference: string;
  nom: string;
  marque: string;
  type: TypeArticle;
  categorie: string;
  description: string | null;
  formules: Formule[];
  eligibleBonsAchat: boolean;
  suiviNumeroSerie: boolean;
  referenceFictive: boolean;
  compatibleAvec: string[];
  variantes: VarianteArticle[];
  baremeFinancement: BaremeFinancement[];
};

export type PrixClient = {
  defaultCode: string;
  prixCatalogueHt: Centimes;
  prixHt: Centimes;
  remisePourcent: number | null;
  /** Mensualité de mise à disposition imposée pour ce client (F03). */
  mensualiteForceeHt: Centimes | null;
};

/** Une ligne par variante, pour l'index de recherche du site (F01, R4). */
export type ReferenceArticle = MarqueFictive & {
  defaultCode: string;
  referenceFabricant: string | null;
  /** Référence de l'article (default_code de sa première variante). */
  referenceArticle: string;
  nom: string;
  marque: string;
  type: TypeArticle;
  categorie: string;
  configuration: string | null;
  prixHt: Centimes;
  disponibilite: EtatDisponibilite;
};

export interface CatalogueOdoo {
  listerCategories(): Promise<Categorie[]>;
  listerArticles(categorie: string, filtres?: FiltresArticles): Promise<ResumeArticle[]>;
  lireArticle(reference: string): Promise<Article>;
  lirePrixClient(partenaireRef: string, references: string[]): Promise<PrixClient[]>;
  rechercher(texte: string): Promise<ResumeArticle[]>;
  listerReferences(): Promise<ReferenceArticle[]>;
}
