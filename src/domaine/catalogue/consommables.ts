import { lireCatalogue, type EntreeCatalogue } from "./lecture";

// Consommables par examen (F27, US3) : articles publiés dont le « Type d'article » d'Odoo est
// « Consommable », rangés selon leur rubrique. Le même article reste visible dans « Produits »,
// dans sa catégorie : il n'a pas besoin de deux catégories dans Odoo.

export type GroupeConsommables = { rubrique: string; titre: string; entrees: EntreeCatalogue[] };

export const EXAMENS: readonly { rubrique: string; titre: string }[] = [
  { rubrique: "holter-ecg", titre: "Pour le Holter ECG" },
  { rubrique: "mapa", titre: "Pour la MAPA" },
  { rubrique: "effort", titre: "Pour l'épreuve d'effort" },
  { rubrique: "ecg-repos", titre: "Pour l'ECG de repos" },
  { rubrique: "accessoires", titre: "Autres consommables" },
];

/** Groupes non vides, dans l'ordre des examens ; un article d'une autre rubrique va dans « Autres ». */
export function grouperConsommables(entrees: EntreeCatalogue[]): GroupeConsommables[] {
  const connues = new Set(EXAMENS.map((e) => e.rubrique));
  const consommables = entrees.filter((e) => e.article.type === "consommable");
  return EXAMENS.map((ex) => ({
    ...ex,
    entrees: consommables.filter((e) =>
      ex.rubrique === "accessoires" ? e.article.categorie === "accessoires" || !connues.has(e.article.categorie) : e.article.categorie === ex.rubrique,
    ),
  })).filter((g) => g.entrees.length > 0);
}

export async function lireConsommables(): Promise<{ groupes: GroupeConsommables[]; indisponible: boolean }> {
  const catalogue = await lireCatalogue();
  return { groupes: grouperConsommables(catalogue.entrees), indisponible: catalogue.indisponible };
}
