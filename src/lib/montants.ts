// Saisie et affichage des montants en euros (HT sauf mention).

/** « 1 290,50 », « 1290.5 » ou « 1290 » → 129050 centimes ; null si la saisie est invalide. */
export function centimesDepuisSaisie(saisie: string): number | null {
  const propre = saisie.replace(/[\s  €]/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(propre)) return null;
  return Math.round(Number(propre) * 100);
}

export function euros(centimes: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(centimes / 100);
}

/** Valeur à placer dans un champ de saisie : « 1290,50 ». */
export function saisieDepuisCentimes(centimes: number): string {
  return (centimes / 100).toFixed(2).replace(".", ",");
}
