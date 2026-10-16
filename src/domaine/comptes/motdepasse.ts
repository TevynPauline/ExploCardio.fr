// Règles du mot de passe (F02, FR-008, décision D1 : recommandation de la CNIL).
// Partagées par le navigateur (règles cochées en direct) et le serveur (vérification).

export type RegleMotDePasse = { cle: string; libelle: string; test: (mdp: string) => boolean };

export const REGLES_MOT_DE_PASSE: RegleMotDePasse[] = [
  { cle: "longueur", libelle: "12 caractères au moins", test: (m) => m.length >= 12 },
  { cle: "majuscule", libelle: "une lettre majuscule", test: (m) => /\p{Lu}/u.test(m) },
  { cle: "minuscule", libelle: "une lettre minuscule", test: (m) => /\p{Ll}/u.test(m) },
  { cle: "chiffre", libelle: "un chiffre", test: (m) => /\d/.test(m) },
  { cle: "special", libelle: "un caractère spécial (par exemple ! ? # @ %)", test: (m) => /[^\p{L}\d\s]/u.test(m) },
];

export function motDePasseConforme(mdp: string): boolean {
  return mdp.length <= 128 && REGLES_MOT_DE_PASSE.every((r) => r.test(mdp));
}

export const MESSAGE_MOT_DE_PASSE =
  "Le mot de passe doit contenir 12 caractères au moins, avec une majuscule, une minuscule, un chiffre et un caractère spécial.";
