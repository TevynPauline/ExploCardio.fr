import { lireParametre } from "@/lib/parametres";

// Lien sortant vers le site de PCA (F27, US6, FR-038) : adresse complète réglable au back-office,
// où Régis colle le lien suivi fourni par 2i (code d'affiliation compris, quel que soit son format).

export const LIEN_PCA_DEFAUT = "https://patient-care-anywhere.com/";

/** Adresse https valide, sinon le site public de PCA. */
export function lienPcaValide(valeur: string | null | undefined): string {
  const v = valeur?.trim();
  if (!v) return LIEN_PCA_DEFAUT;
  try {
    return new URL(v).protocol === "https:" ? v : LIEN_PCA_DEFAUT;
  } catch {
    return LIEN_PCA_DEFAUT;
  }
}

export async function lienPca(): Promise<string> {
  return lienPcaValide(await lireParametre("partenaire.pca.lien", LIEN_PCA_DEFAUT));
}
