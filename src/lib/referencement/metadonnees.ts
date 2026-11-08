// Titre et description de référencement d'une page (F21, R5).
// Le texte saisi dans le back-office l'emporte et n'est jamais coupé ; à défaut, le texte
// automatique est coupé au mot pour tenir dans les limites affichées par les moteurs.

export const SUFFIXE_TITRE = " — ExploCardio.fr";
export const LIMITE_TITRE = 60; // suffixe compris
export const LIMITE_DESCRIPTION = 160;

export type Origine = "saisi" | "automatique";
export type Reglage = { titre?: string | null; description?: string | null } | null;
export type MetadonneesPage = { titre: string; description: string; origineTitre: Origine; origineDescription: Origine };

/** Coupe au dernier espace avant la limite, avec « … » si le texte est raccourci. */
export function couperAuMot(texte: string, limite: number): string {
  const propre = texte.replace(/\s+/g, " ").trim();
  if (propre.length <= limite) return propre;
  const coupe = propre.slice(0, limite - 1);
  const espace = coupe.lastIndexOf(" ");
  return `${(espace > limite / 2 ? coupe.slice(0, espace) : coupe).replace(/[\s,;:.–—-]+$/, "")}…`;
}

/**
 * Titre et description en vigueur. Le titre renvoyé n'inclut pas le suffixe (ajouté par le
 * modèle de titre du site) ; la limite automatique en tient compte.
 */
export function resoudreMetadonnees(reglage: Reglage, auto: { titre: string; description: string }): MetadonneesPage {
  const titreSaisi = reglage?.titre?.trim();
  const descriptionSaisie = reglage?.description?.trim();
  const titreAuto = couperAuMot(auto.titre, LIMITE_TITRE - SUFFIXE_TITRE.length) || "ExploCardio.fr";
  return {
    titre: titreSaisi || titreAuto,
    description: descriptionSaisie || couperAuMot(auto.description, LIMITE_DESCRIPTION),
    origineTitre: titreSaisi ? "saisi" : "automatique",
    origineDescription: descriptionSaisie ? "saisi" : "automatique",
  };
}

/** Lecture injectable des réglages saisis (base du site en production, aucun en test). */
export type LectureReglage = (cible: string) => Promise<Reglage>;

export async function metadonneesReferencement(cible: string, auto: { titre: string; description: string }, lire: LectureReglage = async () => null): Promise<MetadonneesPage> {
  let reglage: Reglage = null;
  try {
    reglage = await lire(cible);
  } catch {
    reglage = null; // base injoignable : textes automatiques
  }
  return resoudreMetadonnees(reglage, auto);
}
