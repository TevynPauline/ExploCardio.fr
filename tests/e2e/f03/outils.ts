import { requete } from "../bases";

export { requete };

/** Pages catégorie de F03 et leur code de catégorie dans Odoo. */
export const CATEGORIES = [
  { chemin: "/holter-ecg", code: "holter-ecg" },
  { chemin: "/holter-ecg/ecg-de-repos", code: "ecg-repos" },
  { chemin: "/holter-tensionnel", code: "mapa" },
  { chemin: "/epreuve-effort", code: "effort" },
  { chemin: "/accessoires-consommables", code: "accessoires" },
] as const;

/** Adresses des fiches publiées (base du site ; tous les articles de départ existent dans Odoo). */
export async function slugsPublies(): Promise<string[]> {
  const lignes = await requete<{ slug: string }>("site", `SELECT slug FROM contenu_produit WHERE etat = 'publie' AND NOT orphelin`);
  return lignes.map((l) => l.slug);
}
