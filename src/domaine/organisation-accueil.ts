// Organisation de l'accueil (F23, FR-001, FR-002, FR-014 à FR-016) : ordre et affichage des blocs
// déplaçables, enregistrés dans le paramètre `accueil.organisation`. Module sans accès à la base,
// partagé par la page publique, le back-office et les tests.

export const CLE_ORGANISATION = "accueil.organisation";

export const BLOCS_ACCUEIL = {
  animation: { nom: "Animation d’ouverture", ancre: "trois-temps" },
  gammes: { nom: "Nos gammes phares", ancre: "acces-rapide" },
  pourquoi: { nom: "Pourquoi choisir ExploCardio.fr ?", ancre: "pourquoi-choisir" },
  "offre-digitale": { nom: "Offre digitale", ancre: "offre-digitale" },
  offres: { nom: "Nos offres du moment (carrousel)", ancre: "offres-du-moment" },
} as const;

export type BlocAccueil = keyof typeof BLOCS_ACCUEIL;
export type PlaceBloc = { bloc: BlocAccueil; affiche: boolean };

const IDENTIFIANTS = Object.keys(BLOCS_ACCUEIL) as BlocAccueil[];

export const ORGANISATION_DEFAUT: readonly PlaceBloc[] = [
  { bloc: "animation", affiche: true },
  { bloc: "gammes", affiche: true },
  { bloc: "pourquoi", affiche: true },
  { bloc: "offre-digitale", affiche: false },
  { bloc: "offres", affiche: true },
];

export const MESSAGE_AUCUN_BLOC = "Gardez au moins un bloc affiché sur l’accueil.";

const estBloc = (b: unknown): b is BlocAccueil => typeof b === "string" && (IDENTIFIANTS as string[]).includes(b);

const copieDefaut = () => ORGANISATION_DEFAUT.map((p) => ({ ...p }));

/**
 * Lecture tolérante : valeur illisible → ordre de départ ; blocs inconnus et doublons ignorés ;
 * blocs absents ajoutés en fin, masqués ; aucun bloc affiché → ordre de départ.
 */
export function normaliserOrganisation(valeur: string | null | undefined): PlaceBloc[] {
  if (!valeur) return copieDefaut();
  let brut: unknown;
  try {
    brut = JSON.parse(valeur);
  } catch {
    return copieDefaut();
  }
  if (!Array.isArray(brut)) return copieDefaut();
  const places: PlaceBloc[] = [];
  for (const p of brut) {
    const bloc = (p as { bloc?: unknown })?.bloc;
    if (!estBloc(bloc) || places.some((x) => x.bloc === bloc)) continue;
    places.push({ bloc, affiche: (p as { affiche?: unknown }).affiche === true });
  }
  for (const bloc of IDENTIFIANTS) if (!places.some((x) => x.bloc === bloc)) places.push({ bloc, affiche: false });
  return places.some((p) => p.affiche) ? places : copieDefaut();
}

/** Contrôle strict à l'enregistrement : tous les blocs, une fois chacun, au moins un affiché. */
export function validerOrganisation(places: { bloc: string; affiche: boolean }[]): { ok: true; places: PlaceBloc[] } | { ok: false; message: string } {
  if (places.length !== IDENTIFIANTS.length || !places.every((p) => estBloc(p.bloc)) || new Set(places.map((p) => p.bloc)).size !== places.length) {
    return { ok: false, message: "Organisation incomplète : rechargez la page." };
  }
  if (!places.some((p) => p.affiche)) return { ok: false, message: MESSAGE_AUCUN_BLOC };
  return { ok: true, places: places.map((p) => ({ bloc: p.bloc as BlocAccueil, affiche: p.affiche })) };
}

/** Blocs à rendre, dans l'ordre ; `disponible` écarte un bloc sans contenu (carrousel vide). */
export function blocsAffiches(places: PlaceBloc[], disponible: (b: BlocAccueil) => boolean = () => true): BlocAccueil[] {
  return places.filter((p) => p.affiche && disponible(p.bloc)).map((p) => p.bloc);
}

/** Cible du bouton « Voir l'offre » (FR-018) : premier bloc rendu après l'animation, sinon le contact. */
export function cibleApresAnimation(blocs: BlocAccueil[]): string {
  const i = blocs.indexOf("animation");
  const suivant = i >= 0 ? blocs[i + 1] : undefined;
  return `#${suivant ? BLOCS_ACCUEIL[suivant].ancre : "contact"}`;
}
