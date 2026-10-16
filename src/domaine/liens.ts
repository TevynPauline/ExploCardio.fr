// Liens autorisés dans les contenus (F01, T008, FR-046) : un lien de tuile, de bandeau,
// d'actualité ou de menu mène toujours à une page existante, jamais à une erreur.

/** Pages publiques existantes (contracts/pages-et-liens.md). */
export const PAGES_INTERNES = [
  "/",
  "/catalogue",
  "/holter-ecg",
  "/holter-ecg/ecg-de-repos",
  "/holter-tensionnel",
  "/epreuve-effort",
  "/accessoires-consommables",
  "/services",
  "/services/hebergement-donnees-sante",
  "/services/assistance",
  "/financement",
  "/mise-a-disposition",
  "/qui-sommes-nous",
  "/recherche",
  "/panier",
  "/connexion",
  "/mentions-legales",
  "/cgv",
  "/cgu",
  "/confidentialite",
  "/cookies",
] as const;

export type ResultatLien = { ok: true; lien: string } | { ok: false; raison: string };

export function verifierLien(saisie: string): ResultatLien {
  const lien = saisie.trim();
  if (!lien) return { ok: false, raison: "Le lien est vide." };
  if (lien.startsWith("/")) {
    if (lien.startsWith("//")) return { ok: false, raison: "Lien interne invalide." };
    const chemin = lien.split(/[?#]/)[0]!.replace(/\/$/, "") || "/";
    if (!(PAGES_INTERNES as readonly string[]).includes(chemin)) {
      return { ok: false, raison: `La page « ${chemin} » n'existe pas sur le site.` };
    }
    return { ok: true, lien };
  }
  try {
    const url = new URL(lien);
    if (url.protocol !== "https:") return { ok: false, raison: "Seules les adresses https:// sont acceptées." };
    return { ok: true, lien: url.toString() };
  } catch {
    return { ok: false, raison: "Le lien n'est ni une page du site (/…) ni une adresse https://." };
  }
}

export function lienValide(saisie: string): boolean {
  return verifierLien(saisie).ok;
}
