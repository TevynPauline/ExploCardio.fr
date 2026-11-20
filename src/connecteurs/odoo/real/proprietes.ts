import type { OffreMiseADisposition, TypeArticle } from "../interfaces";
import { normaliser, versCentimes } from "./normaliser";

// Propriétés produit d'Odoo (F14, R2) : définies sur chaque catégorie, saisies dans la fiche
// produit. Reconnues par leur libellé, sans tenir compte de la casse, des accents ni de la
// ponctuation. Marque et Type d'article peuvent aussi être de vrais champs de la fiche produit
// (créés avec Studio, décision du 2026-11-20) : le champ l'emporte alors sur la propriété.

export type ProprieteOdoo = {
  name?: string;
  string?: string;
  type?: string;
  value?: unknown;
  selection?: [string, string][];
};

export const LIBELLES = {
  marque: "Marque",
  type: "Type d'article",
  quantiteParLot: "Quantité par lot",
  premierMois: "Mise à disposition – premier mois HT",
  moisSuivants: "Mise à disposition – mois suivants HT",
  valeurRemplacement: "Valeur de remplacement HT",
  kitRequis: "Kit requis",
  logiciel: "Logiciel Cloud",
  eligibleBons: "Éligible aux bons d'achat",
  fraisLivraison: "Frais de livraison HT",
  fraisInstallation: "Frais d'installation HT",
  /** Libellés acceptés aussi (saisis par Régis sur la catégorie ERGOS). */
  fraisLivraisonAutre: "Livraison spéciale",
  fraisInstallationAutre: "Frais d'installation",
  seuilFranco: "Seuil de franco HT",
} as const;

const TYPES: Record<string, TypeArticle> = {
  equipement: "equipement",
  consommable: "consommable",
  accessoire: "accessoire",
  logiciel: "logiciel",
  service: "service",
};

/** Type d'article d'après son libellé (« Équipement », « Accessoires »…) ; null si inconnu. */
export function typeArticle(libelle: string | null): TypeArticle | null {
  if (!libelle) return null;
  const n = normaliser(libelle);
  return TYPES[n] ?? TYPES[n.replace(/s$/, "")] ?? null;
}

/** Valeurs lues dans les champs de la fiche produit, prioritaires sur les propriétés. */
export type ChampsArticle = { marque?: string | null; type?: string | null };

export type ProprietesArticle = {
  marque: string | null;
  type: TypeArticle | null;
  quantiteParLot: number;
  eligibleBonsAchat: boolean;
  /** Offre complète (les trois montants), sinon null. */
  offre: OffreMiseADisposition | null;
  /** Au moins un montant de mise à disposition renseigné, mais pas les trois. */
  offreIncomplete: boolean;
  /** Produits volumineux (lot 3) : frais par unité, en plus du forfait de port. */
  fraisLivraisonHt: number;
  fraisInstallationHt: number;
  /** Produit « Livraison » (lot 3) : seuil de franco ; null si non renseigné. */
  seuilFrancoHt: number | null;
};

/** Valeur lisible d'une propriété (le libellé pour une sélection). */
function valeur(p: ProprieteOdoo): unknown {
  if (p.value === false || p.value === undefined || p.value === null || p.value === "") return null;
  if (p.type === "selection" && Array.isArray(p.selection)) {
    return p.selection.find(([cle]) => cle === p.value)?.[1] ?? p.value;
  }
  if (Array.isArray(p.value) && p.value.length === 2 && typeof p.value[1] === "string") return p.value[1];
  return p.value;
}

export function lireProprietes(brutes: unknown, champs: ChampsArticle = {}): ProprietesArticle {
  const parLibelle = new Map<string, unknown>();
  for (const p of Array.isArray(brutes) ? (brutes as ProprieteOdoo[]) : []) {
    if (p?.string) parLibelle.set(normaliser(p.string), valeur(p));
  }
  const lire = (libelle: string) => parLibelle.get(normaliser(libelle)) ?? null;
  const texte = (libelle: string) => {
    const v = lire(libelle);
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };

  const typeBrut = champs.type?.trim() || texte(LIBELLES.type);
  const quantite = Number(lire(LIBELLES.quantiteParLot));
  const premierMoisHt = versCentimes(lire(LIBELLES.premierMois));
  const moisSuivantsHt = versCentimes(lire(LIBELLES.moisSuivants));
  const valeurRemplacementHt = versCentimes(lire(LIBELLES.valeurRemplacement));
  const montants = [premierMoisHt, moisSuivantsHt, valeurRemplacementHt];
  const complete = montants.every((m) => m !== null);

  return {
    marque: champs.marque?.trim() || texte(LIBELLES.marque),
    type: typeArticle(typeBrut),
    quantiteParLot: Number.isInteger(quantite) && quantite > 0 ? quantite : 1,
    eligibleBonsAchat: lire(LIBELLES.eligibleBons) === true,
    offre: complete
      ? {
          premierMoisHt: premierMoisHt!,
          moisSuivantsHt: moisSuivantsHt!,
          valeurRemplacementHt: valeurRemplacementHt!,
          kitRequis: texte(LIBELLES.kitRequis),
          logiciel: texte(LIBELLES.logiciel),
          contenuPack: [],
        }
      : null,
    offreIncomplete: !complete && montants.some((m) => m !== null),
    fraisLivraisonHt: versCentimes(lire(LIBELLES.fraisLivraison) ?? lire(LIBELLES.fraisLivraisonAutre)) ?? 0,
    fraisInstallationHt: versCentimes(lire(LIBELLES.fraisInstallation) ?? lire(LIBELLES.fraisInstallationAutre)) ?? 0,
    seuilFrancoHt: versCentimes(lire(LIBELLES.seuilFranco)),
  };
}
