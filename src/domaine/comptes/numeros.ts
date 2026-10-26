// Contrôle des numéros RPPS, SIRET et SIREN (F02, FR-003, R2 ; F16 : SIRET ou SIREN seulement). Le format ne prouve pas l'identité :
// la vérification réelle reste celle de l'équipe.

export function normaliserNumero(saisie: string): string {
  return saisie.replace(/[\s.\-]/g, "");
}

/** RPPS : 11 chiffres. */
export function rppsValide(saisie: string): boolean {
  return /^\d{11}$/.test(normaliserNumero(saisie));
}

function luhn(chiffres: string): boolean {
  let somme = 0;
  for (let i = 0; i < chiffres.length; i++) {
    let n = Number(chiffres[chiffres.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    somme += n;
  }
  return somme % 10 === 0;
}

/** SIRET : 14 chiffres, clé de Luhn ; La Poste (SIREN 356000000) : somme des chiffres multiple de 5. */
export function siretValide(saisie: string): boolean {
  const n = normaliserNumero(saisie);
  // 14 chiffres, et un SIREN (9 premiers chiffres) qui ne soit pas que des zéros.
  if (!/^\d{14}$/.test(n) || /^0{9}/.test(n)) return false;
  if (n.startsWith("356000000")) {
    return [...n].reduce((s, c) => s + Number(c), 0) % 5 === 0;
  }
  return luhn(n);
}

/** SIREN : 9 chiffres, clé de Luhn (F16). */
export function sirenValide(saisie: string): boolean {
  const n = normaliserNumero(saisie);
  return /^\d{9}$/.test(n) && !/^0{9}$/.test(n) && (n === "356000000" || luhn(n));
}

/** Numéro d'entreprise accepté depuis F16 : SIRET (14 chiffres) ou SIREN (9 chiffres). */
export function siretOuSirenValide(saisie: string): boolean {
  const n = normaliserNumero(saisie);
  return n.length === 9 ? sirenValide(n) : siretValide(n);
}
