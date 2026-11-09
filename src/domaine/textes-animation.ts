// Textes de l'animation « Les trois temps » de l'accueil (F20, FR-017, FR-018, FR-022) : sans
// accès à la base, pour être partagés par le composant client, le back-office et les tests.
// Lecture en base : lireAnimation() dans ./vignettes.

/**
 * Arguments commerciaux (FR-022), rangés sous les trois mots : leurs titres apparaissent sous le
 * disque de leur mot pendant l'animation, puis sont rappelés dans l'image finale avec la pastille
 * de couleur du point (décisions de Pauline du 2026-11-09).
 */
export const ARGUMENTS_ANIMATION = [
  { cle: "argument-a", mot: 0 },
  { cle: "argument-b", mot: 0 },
  { cle: "argument-c", mot: 1 },
  { cle: "argument-d", mot: 2 },
  { cle: "argument-e", mot: 2 },
] as const;

export type CinqArguments = [string, string, string, string, string];

export type TextesAnimation = { accroche: string; mots: [string, string, string]; arguments: CinqArguments };

export const TEXTES_ANIMATION_DEFAUT: TextesAnimation = {
  accroche: "Une offre pensée pour la cardiologie libérale",
  mots: ["Liberté", "Expertise", "Fidélité"],
  arguments: [
    "Achetez, louez ou financez",
    "Dépannage express",
    "Des interlocuteurs experts",
    "L'assistance sans contrat",
    "Une fidélité récompensée",
  ],
};

/** Longueurs maximales (back-office et contrôle à l'enregistrement). */
export const LONGUEURS_ANIMATION = { accroche: 80, mot: 16, argument: 30 } as const;

export function textesAnimation(lignes: { cle: string | null; titre: string }[]): TextesAnimation {
  const texte = (cle: string, defaut: string) => lignes.find((l) => l.cle === cle)?.titre.trim() || defaut;
  const [m1, m2, m3] = TEXTES_ANIMATION_DEFAUT.mots;
  return {
    accroche: texte("accroche", TEXTES_ANIMATION_DEFAUT.accroche),
    mots: [texte("mot-1", m1), texte("mot-2", m2), texte("mot-3", m3)],
    arguments: ARGUMENTS_ANIMATION.map((a, i) => texte(a.cle, TEXTES_ANIMATION_DEFAUT.arguments[i]!)) as CinqArguments,
  };
}
