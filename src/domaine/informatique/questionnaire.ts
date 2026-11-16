// Questionnaire « Décrire mon besoin » de la page Informatique médicale (F27, FR-026 à FR-033,
// contracts/questionnaire.md). Validation par étape (navigateur) et complète (serveur), avec les
// mêmes règles. Aucune donnée de patient n'est demandée ; les champs libres sont courts.

export const INTERETS = {
  acces_distance: { libelle: "Accéder à mes examens à distance", aide: "PCA, cabinet synchronisé" },
  materiel: { libelle: "Du matériel informatique", aide: "Postes, écrans, imprimantes" },
  prestataire: { libelle: "Un prestataire informatique", aide: "Support, réseau, sauvegardes" },
  ne_sait_pas: { libelle: "Je ne sais pas encore", aide: "Je souhaite en parler" },
} as const;

export const LOGICIELS = {
  cardioscan: "CardioScan (DMS)",
  autre: "Un autre logiciel",
  aucun: "Pas d'appareil de ce type",
  ne_sait_pas: "Je ne sais pas",
} as const;

export const EXAMENS_LOGICIELS = { holter: "Holter ECG", mapa: "MAPA", effort: "Épreuve d'effort" } as const;

export const PRESTATAIRES = { oui_satisfait: "Oui, et j'en suis satisfait", oui_insatisfait: "Oui, mais je cherche mieux", non: "Non" } as const;
export const DELAIS = { vite: "Dès que possible", trois_mois: "Dans les 3 mois", information: "Je m'informe" } as const;
export const CRENEAUX = { matin: "Le matin", midi: "Entre midi et deux", apres_midi: "L'après-midi" } as const;

export const PRECISION_MAX = 60;

export type SaisieQuestionnaire = {
  interets: string[];
  medecins: string;
  postes: string;
  secretariat: string;
  logiciels: Record<keyof typeof EXAMENS_LOGICIELS, string>;
  precisions: Record<keyof typeof EXAMENS_LOGICIELS, string>;
  prestataireActuel: string;
  delai: string;
  nom: string;
  cabinet: string;
  codePostal: string;
  email: string;
  telephone: string;
  creneau: string;
  consentement: boolean;
};

export type ErreursQuestionnaire = Partial<Record<string, string>>;

export const SAISIE_VIDE: SaisieQuestionnaire = {
  interets: [],
  medecins: "",
  postes: "",
  secretariat: "",
  logiciels: { holter: "", mapa: "", effort: "" },
  precisions: { holter: "", mapa: "", effort: "" },
  prestataireActuel: "",
  delai: "",
  nom: "",
  cabinet: "",
  codePostal: "",
  email: "",
  telephone: "",
  creneau: "",
  consentement: false,
};

/** Champs de chaque étape, dans l'ordre d'affichage (pour placer le focus sur la première erreur). */
export const CHAMPS_ETAPES: readonly string[][] = [
  ["interets", "medecins", "postes", "secretariat"],
  ["logiciels.holter", "precisions.holter", "logiciels.mapa", "precisions.mapa", "logiciels.effort", "precisions.effort", "prestataireActuel"],
  ["delai", "nom", "cabinet", "codePostal", "email", "telephone", "creneau", "consentement"],
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEPHONE_FR = /^(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}$/;
const CODE_POSTAL = /^\d{5}$/;

const entier = (v: string, min: number, max: number) => /^\d{1,3}$/.test(v.trim()) && Number(v) >= min && Number(v) <= max;
const dans = (v: string, liste: object) => Object.prototype.hasOwnProperty.call(liste, v);

export function validerEtape(etape: 0 | 1 | 2, s: SaisieQuestionnaire): ErreursQuestionnaire {
  const e: ErreursQuestionnaire = {};
  if (etape === 0) {
    if (!s.interets.length || !s.interets.every((i) => dans(i, INTERETS))) e.interets = "Cochez au moins un sujet.";
    if (!entier(s.medecins, 1, 50)) e.medecins = "Indiquez un nombre entre 1 et 50.";
    if (!entier(s.postes, 1, 200)) e.postes = "Indiquez un nombre entre 1 et 200.";
    if (s.secretariat !== "oui" && s.secretariat !== "non") e.secretariat = "Indiquez si un secrétariat travaille sur place.";
  } else if (etape === 1) {
    for (const examen of Object.keys(EXAMENS_LOGICIELS) as (keyof typeof EXAMENS_LOGICIELS)[]) {
      const v = s.logiciels[examen];
      if (!dans(v, LOGICIELS)) e[`logiciels.${examen}`] = "Choisissez une réponse.";
      const precision = s.precisions[examen].trim();
      if (v === "autre" && !precision) e[`precisions.${examen}`] = "Précisez le logiciel.";
      if (precision.length > PRECISION_MAX) e[`precisions.${examen}`] = `${PRECISION_MAX} caractères au plus.`;
    }
    if (!dans(s.prestataireActuel, PRESTATAIRES)) e.prestataireActuel = "Choisissez une réponse.";
  } else {
    if (!dans(s.delai, DELAIS)) e.delai = "Choisissez votre délai.";
    if (s.nom.trim().length < 2 || s.nom.length > 80) e.nom = "Indiquez votre nom.";
    if (s.cabinet.trim().length < 2 || s.cabinet.length > 120) e.cabinet = "Indiquez le nom du cabinet.";
    if (!CODE_POSTAL.test(s.codePostal.trim())) e.codePostal = "Indiquez un code postal de 5 chiffres.";
    if (!EMAIL.test(s.email.trim()) || s.email.length > 120) e.email = "Indiquez une adresse e-mail valide, par exemple nom@cabinet.fr.";
    if (!TELEPHONE_FR.test(s.telephone.trim())) e.telephone = "Indiquez un numéro de téléphone français, par exemple 01 23 45 67 89.";
    if (!dans(s.creneau, CRENEAUX)) e.creneau = "Choisissez un créneau de rappel.";
    if (!s.consentement) e.consentement = "Cochez la case pour que nous puissions vous recontacter.";
  }
  return e;
}

/** Validation complète ; renvoie aussi la première étape en erreur. */
export function validerQuestionnaire(s: SaisieQuestionnaire): { erreurs: ErreursQuestionnaire; etape: 0 | 1 | 2 | null } {
  for (const etape of [0, 1, 2] as const) {
    const erreurs = validerEtape(etape, s);
    if (Object.keys(erreurs).length) return { erreurs, etape };
  }
  return { erreurs: {}, etape: null };
}

/** Données enregistrées (sans espaces superflus ; précision gardée seulement pour « autre »). */
export function normaliser(s: SaisieQuestionnaire) {
  const logiciels = Object.fromEntries(
    (Object.keys(EXAMENS_LOGICIELS) as (keyof typeof EXAMENS_LOGICIELS)[]).map((k) => [
      k,
      s.logiciels[k] === "autre" ? { choix: "autre", precision: s.precisions[k].trim() } : { choix: s.logiciels[k] },
    ]),
  );
  return {
    interets: [...new Set(s.interets)],
    medecins: Number(s.medecins),
    postes: Number(s.postes),
    secretariat: s.secretariat === "oui",
    logiciels,
    prestataireActuel: s.prestataireActuel,
    delai: s.delai,
    coordonnees: {
      nom: s.nom.trim(),
      cabinet: s.cabinet.trim(),
      codePostal: s.codePostal.trim(),
      email: s.email.trim().toLowerCase(),
      telephone: s.telephone.trim(),
    },
    creneau: s.creneau,
  };
}
