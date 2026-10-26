// Adresses (F02, FR-005) : la livraison se fait en France métropolitaine, Corse comprise ;
// l'outre-mer (codes 97 et 98) est hors du périmètre du site. F16 (US8, FR-029) : un autre pays
// aussi ; le médecin est orienté vers l'équipe (« Nous contacter », formulaire prérempli).

/** Valeur du choix « Pays » pour une adresse hors de France. */
export const PAYS_AUTRE = "autre";

export const MOTIF_HORS_METROPOLE = "Commande hors métropole";

export const LIEN_CONTACT_HORS_METROPOLE = "/qui-sommes-nous?motif=hors-metropole#contact";

export function codePostalMetropole(saisie: string): boolean {
  const cp = saisie.trim();
  if (!/^\d{5}$/.test(cp)) return false;
  const departement = Number(cp.slice(0, 2));
  return departement >= 1 && departement <= 95;
}

export const MESSAGE_HORS_METROPOLE =
  "ExploCardio.fr livre uniquement en France métropolitaine (Corse comprise). Indiquez une adresse de livraison en métropole.";

/**
 * Erreur d'une adresse de livraison hors périmètre, ou null. Hors de France, le format du code
 * postal n'est pas vérifié : le refus porte sur le pays.
 */
export function refusLivraison(a: { codePostal: string; pays?: string }, prefixe: string): Record<string, string> | null {
  if (a.pays === PAYS_AUTRE) return { [`${prefixe}.pays`]: MESSAGE_HORS_METROPOLE };
  if (/^\d{5}$/.test(a.codePostal.trim()) && !codePostalMetropole(a.codePostal)) return { [`${prefixe}.codePostal`]: MESSAGE_HORS_METROPOLE };
  return null;
}
