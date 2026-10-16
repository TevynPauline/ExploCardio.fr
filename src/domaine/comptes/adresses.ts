// Adresses (F02, FR-005) : la livraison se fait en France métropolitaine, Corse comprise ;
// l'outre-mer (codes 97 et 98) est hors du périmètre du site.

export function codePostalMetropole(saisie: string): boolean {
  const cp = saisie.trim();
  if (!/^\d{5}$/.test(cp)) return false;
  const departement = Number(cp.slice(0, 2));
  return departement >= 1 && departement <= 95;
}

export const MESSAGE_HORS_METROPOLE =
  "ExploCardio.fr livre uniquement en France métropolitaine (Corse comprise). Indiquez une adresse de livraison en métropole.";
