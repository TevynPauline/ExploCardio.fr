// Adresses lisibles des fiches (F03, D3) : « SunTech Oscar 2 » → « suntech-oscar-2 ».

/** Marques génériques de la base fictive, absentes de l'adresse. */
const MARQUES_SANS_ADRESSE = new Set(["Consommables", "Environnement d'effort"]);

/** « SunTech Oscar 2 » → « suntech-oscar-2 ». */
export function versSlug(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugArticle(marque: string, nom: string): string {
  const mots = versSlug(nom).split("-");
  const premierMotMarque = versSlug(marque).split("-")[0]!;
  const nomContientMarque = versSlug(nom).startsWith(versSlug(marque)) || mots.includes(premierMotMarque);
  const avecMarque = MARQUES_SANS_ADRESSE.has(marque) || nomContientMarque ? nom : `${marque} ${nom}`;
  return versSlug(avecMarque);
}
