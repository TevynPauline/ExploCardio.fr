import type { Palier } from "../interfaces";
import { idDe } from "./client";

// Règles de liste de prix d'Odoo pour l'affichage (F14, R5). Odoo n'expose pas de calcul de
// prix à distance : on applique le sous-ensemble standard (prix fixe, remise en % sur le prix de
// vente ; variante, modèle, catégorie ou global ; quantité minimale ; dates). Toute autre règle
// est ignorée et signalée. Le montant d'une commande reste calculé par Odoo.

export type RegleOdoo = {
  id: number;
  pricelist_id: unknown;
  applied_on: string;
  categ_id: unknown;
  product_tmpl_id: unknown;
  product_id: unknown;
  min_quantity: number;
  date_start: string | false;
  date_end: string | false;
  compute_price: string;
  base: string;
  fixed_price: number;
  price_discount: number;
  price_surcharge: number;
  price_round: number;
  price_min_margin: number;
  price_max_margin: number;
};

export const CHAMPS_REGLE = [
  "pricelist_id", "applied_on", "categ_id", "product_tmpl_id", "product_id", "min_quantity", "date_start", "date_end",
  "compute_price", "base", "fixed_price", "price_discount", "price_surcharge", "price_round", "price_min_margin", "price_max_margin",
];

/** Produit visé : variante, modèle et chaîne de catégories (de la plus précise à la racine). */
export type Cible = { varianteId: number; modeleId: number; categories: number[]; prixVente: number };

/** Pourquoi une règle n'est pas prise en charge ; null si elle l'est. */
export function regleNonGeree(r: RegleOdoo): string | null {
  if (r.compute_price === "fixed") return null;
  if (r.compute_price === "discount") {
    if (r.base !== "list_price") return r.base === "pricelist" ? "remise calculée sur une autre liste de prix" : "remise calculée sur le coût";
    if (r.price_surcharge || r.price_round || r.price_min_margin || r.price_max_margin) return "supplément, arrondi ou marge";
    return null;
  }
  return r.compute_price === "markup" ? "majoration sur le coût" : `calcul « ${r.compute_price} »`;
}

function couvre(r: RegleOdoo, c: Cible): number | null {
  switch (r.applied_on) {
    case "0_product_variant":
      return idDe(r.product_id) === c.varianteId ? 0 : null;
    case "1_product":
      return idDe(r.product_tmpl_id) === c.modeleId ? 1 : null;
    case "2_product_category": {
      const i = c.categories.indexOf(idDe(r.categ_id) ?? -1);
      return i >= 0 ? 2 + i / 100 : null;
    }
    case "3_global":
      return 3;
    default:
      return null;
  }
}

function valide(r: RegleOdoo, maintenant: Date): boolean {
  const jour = maintenant.toISOString().slice(0, 19).replace("T", " ");
  return (!r.date_start || r.date_start <= jour) && (!r.date_end || r.date_end >= jour);
}

/** Règles candidates dans l'ordre d'Odoo : portée la plus précise, puis quantité la plus grande. */
function candidates(regles: RegleOdoo[], listeId: number, c: Cible, maintenant: Date) {
  return regles
    .filter((r) => idDe(r.pricelist_id) === listeId && valide(r, maintenant))
    .map((r) => ({ r, portee: couvre(r, c) }))
    .filter((x): x is { r: RegleOdoo; portee: number } => x.portee !== null)
    .sort((a, b) => a.portee - b.portee || b.r.min_quantity - a.r.min_quantity || a.r.id - b.r.id);
}

function appliquer(r: RegleOdoo, prixVente: number): number {
  return r.compute_price === "fixed" ? r.fixed_price : prixVente * (1 - r.price_discount / 100);
}

export type PrixCalcule = { prixHt: number; regle: RegleOdoo | null; nonGeree: RegleOdoo | null };

/** Prix HT en centimes pour une quantité, d'après une liste de prix. */
export function prixPour(regles: RegleOdoo[], listeId: number, c: Cible, quantite = 1, maintenant = new Date()): PrixCalcule {
  const r = candidates(regles, listeId, c, maintenant).find((x) => x.r.min_quantity <= quantite)?.r ?? null;
  const base = Math.round(c.prixVente * 100);
  if (!r) return { prixHt: base, regle: null, nonGeree: null };
  if (regleNonGeree(r)) return { prixHt: base, regle: null, nonGeree: r };
  return { prixHt: Math.round(appliquer(r, c.prixVente) * 100), regle: r, nonGeree: null };
}

/** Paliers dégressifs : règles gérées de la liste à quantité minimale > 1, triées. */
export function paliersPour(regles: RegleOdoo[], listeId: number, c: Cible, maintenant = new Date()): Palier[] {
  const quantites = [
    ...new Set(
      candidates(regles, listeId, c, maintenant)
        .filter((x) => x.r.min_quantity > 1 && !regleNonGeree(x.r))
        .map((x) => x.r.min_quantity),
    ),
  ].sort((a, b) => a - b);
  return quantites.map((q) => ({ quantiteMin: q, prixHt: prixPour(regles, listeId, c, q, maintenant).prixHt }));
}

/** Remise affichée : celle de la règle si c'est une remise, sinon calculée ; null sans remise. */
export function remisePourcent(calcul: PrixCalcule, prixCatalogueHt: number): number | null {
  if (calcul.regle?.compute_price === "discount") return calcul.regle.price_discount;
  if (prixCatalogueHt > 0 && calcul.prixHt < prixCatalogueHt) return Math.round((1 - calcul.prixHt / prixCatalogueHt) * 1000) / 10;
  return null;
}
