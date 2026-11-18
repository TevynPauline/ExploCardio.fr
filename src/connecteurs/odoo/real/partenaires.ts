// Référence d'une fiche client d'Odoo côté site (F14 lot 2) : « P » + identifiant Odoo. Le champ
// « Référence » (`ref`) d'Odoo reste à Régis ; une référence qui n'a pas cette forme est
// cherchée dans ce champ (fiches reliées à la main par l'équipe).

export function refPartenaire(id: number): string {
  return `P${id}`;
}

export function idDeRefPartenaire(ref: string): number | null {
  const m = /^P(\d+)$/.exec(ref);
  return m ? Number(m[1]) : null;
}

/** Condition de recherche Odoo pour une référence de partenaire du site. */
export function conditionPartenaire(ref: string): [string, string, unknown] {
  const id = idDeRefPartenaire(ref);
  return id === null ? ["ref", "=", ref] : ["id", "=", id];
}
