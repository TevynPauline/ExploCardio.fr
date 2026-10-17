// Familles de produits du site et leur rattachement aux catégories du catalogue d'Odoo (F01).
// L'ECG de repos est une sous-famille de « Holter ECG » (FR-009).

export type CleFamille = "holter-ecg" | "ecg-de-repos" | "holter-tensionnel" | "epreuve-effort" | "accessoires-consommables";

export type Famille = {
  cle: CleFamille;
  libelle: string;
  chemin: string;
  /** Code de la catégorie dans le catalogue (connecteur Odoo). */
  categorie: string;
  /** Nom du fichier de contenus/ pour le texte de présentation. */
  texte: string;
};

export const FAMILLES: Record<CleFamille, Famille> = {
  "holter-ecg": { cle: "holter-ecg", libelle: "Holter ECG", chemin: "/holter-ecg", categorie: "holter-ecg", texte: "holter-ecg" },
  "ecg-de-repos": { cle: "ecg-de-repos", libelle: "ECG de repos", chemin: "/holter-ecg/ecg-de-repos", categorie: "ecg-repos", texte: "ecg-de-repos" },
  "holter-tensionnel": { cle: "holter-tensionnel", libelle: "Holter tensionnel / MAPA", chemin: "/holter-tensionnel", categorie: "mapa", texte: "holter-tensionnel" },
  "epreuve-effort": { cle: "epreuve-effort", libelle: "Épreuve & écho d'effort", chemin: "/epreuve-effort", categorie: "effort", texte: "epreuve-effort" },
  "accessoires-consommables": { cle: "accessoires-consommables", libelle: "Accessoires & consommables", chemin: "/accessoires-consommables", categorie: "accessoires", texte: "accessoires-consommables" },
};

/** Chemin de la page de famille d'une catégorie du catalogue. */
export function cheminDeCategorie(categorie: string): string {
  return Object.values(FAMILLES).find((f) => f.categorie === categorie)?.chemin ?? "/catalogue";
}
