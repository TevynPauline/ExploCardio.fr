import type { Article } from "@/connecteurs/odoo/interfaces";

// Publication des articles du catalogue (F03, FR-037, US6-5) : un article n'est visible que
// s'il est publié, présent dans Odoo et complet. Les données de gestion restent dans Odoo ;
// le site ne contrôle que ce qui est nécessaire pour présenter l'article.

export type TextesProduit = {
  descriptionCourte?: string;
  caracteristiques?: { libelle: string; valeur: string }[];
  contenuCoffret?: string;
  contenuPackMad?: string;
  logicielAssocie?: string;
  garantie?: string;
};

export type PhotoProduit = { chemin: string; texteRemplacement: string };
export type DocumentProduit = { chemin: string; titre: string; type: "notice" | "fiche_technique"; octets: number };

/** Ce que le contrôle de publication lit d'un contenu produit. */
export type ContenuAControler = {
  slug: string;
  etat: "preparation" | "publie" | "retire";
  orphelin: boolean;
  textes: unknown;
  photos: unknown;
};

export function textesDe(c: { textes: unknown }): TextesProduit {
  return (c.textes ?? {}) as TextesProduit;
}

export function photosDe(c: { photos: unknown }): PhotoProduit[] {
  return Array.isArray(c.photos) ? (c.photos as PhotoProduit[]) : [];
}

/** Liste de ce qui empêche la publication ; vide si l'article peut être publié. */
export function manquantsPublication(contenu: ContenuAControler, article: Article | null): string[] {
  if (!article) return ["L'article n'existe pas (ou plus) dans Odoo."];
  const manquants: string[] = [];
  if (!article.nom.trim()) manquants.push("Le nom de l'article (dans Odoo).");
  if (!article.categorie) manquants.push("La catégorie de l'article (dans Odoo).");
  if (!article.variantes.some((v) => v.prixHt > 0)) manquants.push("Un prix HT (dans Odoo).");
  if (!textesDe(contenu).descriptionCourte?.trim()) manquants.push("La description courte.");
  if (!contenu.slug.trim()) manquants.push("L'adresse de la fiche.");
  // Sans photo, l'emplacement provisoire de la charte est affiché (accepté) ; une photo
  // ajoutée doit avoir son texte de remplacement (FR-043).
  if (photosDe(contenu).some((p) => !p.texteRemplacement?.trim())) manquants.push("Le texte de remplacement de chaque photo.");
  return manquants;
}

export function estVisible(contenu: ContenuAControler, article: Article | null): boolean {
  return contenu.etat === "publie" && !contenu.orphelin && manquantsPublication(contenu, article).length === 0;
}
