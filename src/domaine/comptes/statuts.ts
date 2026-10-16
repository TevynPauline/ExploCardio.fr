// Statuts des comptes et blocage de la commande (F02, FR-010, FR-011, R4).
// Fonction partagée avec F04 et F05 : contracts/domaine.md.

export type Statut = "email_a_confirmer" | "en_attente" | "valide" | "refuse" | "suspendu" | "supprime";

const TRANSITIONS: Record<Statut, Statut[]> = {
  // email_a_confirmer → valide : validation automatique dès la confirmation (FR-013)
  email_a_confirmer: ["en_attente", "valide", "supprime"],
  en_attente: ["valide", "refuse", "supprime"],
  valide: ["suspendu", "supprime"],
  suspendu: ["valide", "supprime"],
  refuse: ["supprime"],
  supprime: [],
};

export function transitionAutorisee(de: Statut, vers: Statut): boolean {
  return TRANSITIONS[de].includes(vers);
}

export class TransitionInterdite extends Error {
  constructor(de: Statut, vers: Statut) {
    super(`Changement de statut impossible : de « ${de} » vers « ${vers} ».`);
  }
}

export function exigerTransition(de: Statut, vers: Statut) {
  if (!transitionAutorisee(de, vers)) throw new TransitionInterdite(de, vers);
}

const MESSAGES: Record<Exclude<Statut, "valide">, string> = {
  email_a_confirmer: "Confirmez d'abord votre adresse email : un lien vous a été envoyé.",
  en_attente: "Votre compte est en cours de vérification. Vous pourrez commander dès sa validation.",
  refuse: "Votre compte n'a pas été validé. Contactez-nous pour en savoir plus.",
  suspendu: "Votre compte est suspendu. Contactez-nous pour le rétablir.",
  supprime: "Ce compte n'existe plus.",
};

export type Autorisation = { autorise: true } | { autorise: false; raison: Statut; message: string };

/**
 * Seul un compte validé peut commander (SC-001). Exception : la mise à disposition express
 * (F05) pour un compte en attente, sans expédition avant la validation (FR-011).
 */
export function peutCommander(compte: { statut: Statut }, options: { miseADispositionExpress?: boolean } = {}): Autorisation {
  if (compte.statut === "valide") return { autorise: true };
  if (compte.statut === "en_attente" && options.miseADispositionExpress) return { autorise: true };
  return { autorise: false, raison: compte.statut, message: MESSAGES[compte.statut] };
}
