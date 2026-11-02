// Adresses (F02, FR-005) : la commande en ligne est livrée en France métropolitaine
// continentale. F16 (US8, FR-029) : l'outre-mer (codes 97 et 98) et les autres pays sont
// orientés vers l'équipe (« Nous contacter », formulaire prérempli) ; F18 (US1, FR-001) : la
// Corse (codes 20) aussi.

/** Valeur du choix « Pays » pour une adresse hors de France. */
export const PAYS_AUTRE = "autre";

export const MOTIF_HORS_METROPOLE = "Commande hors métropole";

export const LIEN_CONTACT_HORS_METROPOLE = "/qui-sommes-nous?motif=hors-metropole#contact";

/** Code postal livrable en ligne : départements 01 à 95, sauf la Corse (20). */
export function codePostalLivrable(saisie: string): boolean {
  const cp = saisie.trim();
  if (!/^\d{5}$/.test(cp)) return false;
  const departement = Number(cp.slice(0, 2));
  return departement >= 1 && departement <= 95 && departement !== 20;
}

export const MESSAGE_HORS_METROPOLE =
  "ExploCardio.fr livre en ligne en France métropolitaine continentale. Pour la Corse, l'outre-mer ou l'étranger, contactez-nous : nous vous adressons une offre.";

/** Aide sous le code postal des adresses de livraison. */
export const AIDE_CODE_POSTAL_LIVRAISON = "Livraison en France métropolitaine continentale (hors Corse).";

/**
 * Erreur d'une adresse de livraison hors périmètre, ou null. Hors de France, le format du code
 * postal n'est pas vérifié : le refus porte sur le pays.
 */
export function refusLivraison(a: { codePostal: string; pays?: string }, prefixe: string): Record<string, string> | null {
  if (a.pays === PAYS_AUTRE) return { [`${prefixe}.pays`]: MESSAGE_HORS_METROPOLE };
  if (/^\d{5}$/.test(a.codePostal.trim()) && !codePostalLivrable(a.codePostal)) return { [`${prefixe}.codePostal`]: MESSAGE_HORS_METROPOLE };
  return null;
}
