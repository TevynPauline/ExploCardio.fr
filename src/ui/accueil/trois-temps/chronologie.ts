// Animation « Les trois temps » de l'accueil (F20, FR-001 à FR-011 ; plan, D1 à D4).
//
// Toutes les formes partagent un même cycle : 0,4 s de fondu de l'image finale (utile seulement si
// l'on rejouait plusieurs boucles), 10,4 s de séquence, 3 s de maintien sur l'image finale. Le cycle
// est joué une fois (FR-010) avec un départ décalé de −0,4 s : la lecture commence directement par
// l'arrivée des points et s'arrête sur l'image finale (fill-mode both), puis la scène se réduit en
// bandeau compact.
// Les temps ci-dessous sont en secondes depuis le début de la séquence.

import { ARGUMENTS_ANIMATION } from "@/domaine/textes-animation";

export const FONDU_INITIAL = 0.4;
export const DUREE_SEQUENCE = 10.4;
export const MAINTIEN = 3;
export const DUREE_CYCLE = FONDU_INITIAL + DUREE_SEQUENCE + MAINTIEN;
export const BOUCLES = 1;

/** Cercles du logo officiel (docs/brand/assets/explocardio-fr-logo.svg), vérifiés par les tests. */
export const LOGO = {
  largeur: 369,
  hauteur: 154,
  origineY: -2,
  cercles: [
    { cx: 120.76, cy: 57.6, r: 14.4, couleur: "var(--ec-euca)" },
    { cx: 173.56, cy: 48, r: 21.6, couleur: "var(--ec-sage)" },
    { cx: 235.96, cy: 38.4, r: 26.4, couleur: "var(--ec-blue)" },
  ],
} as const;

/** Mise en page d'un format d'écran : distances en pixels depuis le centre de la scène. */
export type Format = {
  /** Diamètre commun des trois disques pendant les mots (FR-003). */
  diametre: number;
  /** Positions des disques pendant les mots. */
  positionsMots: [number, number][];
  /** Largeur d'affichage du logo final (FR-004). */
  largeurLogo: number;
  /** Distance entre le haut du logo final et le centre de la scène. */
  hautLogo: number;
  /** Titres des arguments pendant les mots : sous chaque disque (ordinateur) ou à sa droite (téléphone). */
  titres: "dessous" | "droite";
  /** Agrandissement des points à leur arrivée, par rapport au logo final. */
  agrandissementArrivee: number;
  /** Écart horizontal plafonné à cette part de la largeur d'écran (écrans de 768 px). */
  limiteVw?: number;
};

export const FORMATS: { ordinateur: Format; telephone: Format } = {
  ordinateur: {
    diametre: 140,
    // Disques remontés de 50 px pour laisser la place aux titres des arguments en dessous.
    positionsMots: [[-220, -50], [0, -50], [220, -50]],
    largeurLogo: 112,
    hautLogo: 124,
    titres: "dessous",
    agrandissementArrivee: 3,
    limiteVw: 27,
  },
  telephone: {
    diametre: 128,
    // Disques décalés vers la gauche : les titres des arguments s'affichent à leur droite.
    positionsMots: [[-80, -140], [-80, 0], [-80, 140]],
    largeurLogo: 112,
    hautLogo: 200,
    titres: "droite",
    agrandissementArrivee: 2.5,
  },
};

type Point = { x: number; y: number; diametre: number };

/** Points du logo final, au centre horizontal de la scène, le haut du logo à `hautLogo` au-dessus du centre. */
export function pointsLogo(f: Format): Point[] {
  const echelle = f.largeurLogo / LOGO.largeur;
  return LOGO.cercles.map((c) => ({
    x: (c.cx - LOGO.largeur / 2) * echelle,
    y: -f.hautLogo + (c.cy - LOGO.origineY) * echelle,
    diametre: 2 * c.r * echelle,
  }));
}

/** Points à leur arrivée : le symbole agrandi, centré sur la scène. */
export function pointsArrivee(f: Format): Point[] {
  const logo = pointsLogo(f);
  const milieuY = logo.reduce((s, p) => s + p.y, 0) / logo.length;
  return logo.map((p) => ({ x: p.x * f.agrandissementArrivee, y: (p.y - milieuY) * f.agrandissementArrivee, diametre: p.diametre * f.agrandissementArrivee }));
}

// ------------------------------------------------------------------ Étapes (secondes)

export const ETAPES = {
  /** Arrivée du point i : chute, puis un seul rebond amorti. */
  arrivee: (i: number) => 0.1 + 0.18 * i,
  dureeArrivee: 0.75,
  ecartDebut: 1.4,
  ecartFin: 2.4,
  /** Apparition du mot i (et léger gonflement de son disque). */
  mot: (i: number) => 2.5 + 1.1 * i,
  dureeMot: 0.5,
  /** Titre d'argument de rang r (0 ou 1) du mot m : apparaît sous son disque, peu après le mot (FR-022). */
  titre: (m: number, r: number) => 2.5 + 1.1 * m + 0.45 + 0.35 * r,
  dureeTitre: 0.4,
  motsEffaces: [7.4, 7.75] as const,
  regroupement: [7.6, 8.5] as const,
  logo: [8.45, 8.75] as const,
  accroche: [8.8, 9.5] as const,
  /** Rappel en cascade de l'argument i dans l'image finale. */
  argument: (i: number) => [9.4 + 0.08 * i, 9.8 + 0.08 * i] as const,
  lien: [10, 10.4] as const,
};

const ENTREE = "cubic-bezier(.55,0,.85,.35)"; // accélère (chute, aimant)
const SORTIE = "cubic-bezier(.2,.8,.3,1)"; // décélère (rebond, arrivée)
const SOUPLE = "cubic-bezier(.45,0,.25,1)";

/** Pourcentage du cycle pour un instant de la séquence. */
export function pourcent(t: number): string {
  return `${(((FONDU_INITIAL + t) / DUREE_CYCLE) * 100).toFixed(3)}%`;
}

type Etape = { t: number; css: string; suite?: string };

function keyframes(nom: string, etapes: Etape[], debut: string, fin: string): string {
  const lignes = [`0%{${debut}}`];
  for (const e of etapes) lignes.push(`${pourcent(e.t)}{${e.css}${e.suite ? `;animation-timing-function:${e.suite}` : ""}}`);
  lignes.push(`100%{${fin}}`);
  return `@keyframes ${nom}{${lignes.join("")}}`;
}

const tr = (x: string, y: string, s: string) => `transform:translate(${x},${y}) scale(${s})`;

/** Feuille de style de l'animation : variables par format d'écran et images clés. */
/** Hauteur de la scène pendant l'animation ; le bandeau compact prend la hauteur de son contenu. */
export const HAUTEUR_SCENE = { telephone: "470px", ordinateur: "350px", grandEcran: "300px" } as const;

/** Durée de la réduction en bandeau compact, en millisecondes (fondu de sortie, puis hauteur). */
export const REDUCTION = { fondu: 250, hauteur: 500 } as const;

export function feuilleDeStyle(): string {
  const regles: string[] = [];

  // Variables des points, par format d'écran (ordinateur à partir de 768 px).
  const variables = (f: Format) => {
    const arrivee = pointsArrivee(f);
    const logo = pointsLogo(f);
    return [0, 1, 2]
      .map((i) => {
        const a = arrivee[i]!;
        const l = logo[i]!;
        const [px, py] = f.positionsMots[i]!;
        const mx = f.limiteVw && px !== 0 ? `calc(${Math.sign(px)} * min(${Math.abs(px)}px, ${f.limiteVw}vw))` : `${px}px`;
        const my = `${py}px`;
        return `.tt-point-${i + 1}{--ax:${a.x.toFixed(2)}px;--ay:${a.y.toFixed(2)}px;--as:${(a.diametre / f.diametre).toFixed(4)};--mx:${mx};--my:${my};--lx:${l.x.toFixed(2)}px;--ly:${l.y.toFixed(2)}px;--ls:${(l.diametre / f.diametre).toFixed(4)}}.tt-mot-${i + 1}{--mx:${mx};--my:${my}}`;
      })
      .concat(`.tt-scene{--tt-d:${f.diametre}px;--tt-logo-l:${f.largeurLogo}px;--tt-logo-haut:${f.hautLogo}px}`)
      .concat(
        ARGUMENTS_ANIMATION.map((a, k) => {
          const [px, py] = f.positionsMots[a.mot]!;
          const rang = ARGUMENTS_ANIMATION.slice(0, k).filter((b) => b.mot === a.mot).length;
          const nombre = ARGUMENTS_ANIMATION.filter((b) => b.mot === a.mot).length;
          if (f.titres === "dessous") {
            const sx = f.limiteVw && px !== 0 ? `calc(${Math.sign(px)} * min(${Math.abs(px)}px, ${f.limiteVw}vw))` : `${px}px`;
            const sy = py + f.diametre / 2 + 12 + rang * 22;
            return `.tt-titre-${k + 1}{transform:translate(calc(-50% + ${sx}),${sy}px);white-space:nowrap;text-align:center}`;
          }
          // À droite du disque, centrés verticalement sur lui ; largeur jusqu'au bord de la scène.
          const sx = px + f.diametre / 2 + 12;
          const sy = py + (rang - (nombre - 1) / 2) * 40;
          return `.tt-titre-${k + 1}{transform:translate(${sx}px,calc(-50% + ${sy}px));width:calc(50% - ${sx}px - 16px);text-align:left}`;
        }).join(""),
      )
      .join("");
  };
  regles.push(variables(FORMATS.telephone));
  regles.push(`@media (min-width:768px){${variables(FORMATS.ordinateur)}}`);

  // Points : arrivée en rebond, écart jusqu'au même diamètre, gonflement au mot, regroupement en logo.
  for (const i of [0, 1, 2]) {
    const a = ETAPES.arrivee(i);
    const mot = ETAPES.mot(i);
    const [r0, r1] = ETAPES.regroupement;
    const pale = `background-color:color-mix(in srgb,var(--tt-c) 40%,var(--ec-bg))`;
    const plein = `background-color:var(--tt-c)`;
    regles.push(
      keyframes(
        `tt-point-${i + 1}`,
        [
          { t: 0, css: `opacity:0;${tr("var(--ax)", "calc(var(--ay) - 80px)", "var(--as)")};${plein}` },
          { t: a, css: `opacity:0;${tr("var(--ax)", "calc(var(--ay) - 80px)", "var(--as)")}`, suite: ENTREE },
          { t: a + ETAPES.dureeArrivee * 0.5, css: `opacity:1;${tr("var(--ax)", "calc(var(--ay) + 9px)", "var(--as)")}`, suite: SORTIE },
          { t: a + ETAPES.dureeArrivee * 0.75, css: `${tr("var(--ax)", "calc(var(--ay) - 3px)", "var(--as)")}`, suite: SOUPLE },
          { t: a + ETAPES.dureeArrivee, css: `${tr("var(--ax)", "var(--ay)", "var(--as)")}` },
          { t: ETAPES.ecartDebut, css: `${tr("var(--ax)", "var(--ay)", "var(--as)")};${plein}`, suite: SORTIE },
          { t: ETAPES.ecartFin - 0.25, css: `${tr("calc(var(--mx) * 1.04)", "calc(var(--my) * 1.04)", "1.03")}`, suite: SOUPLE },
          { t: ETAPES.ecartFin, css: `${tr("var(--mx)", "var(--my)", "1")};${pale}` },
          { t: mot, css: `${tr("var(--mx)", "var(--my)", "1")}`, suite: SORTIE },
          { t: mot + 0.25, css: `${tr("var(--mx)", "var(--my)", "1.06")}`, suite: SOUPLE },
          { t: mot + 0.5, css: `${tr("var(--mx)", "var(--my)", "1")}` },
          { t: r0, css: `opacity:1;${tr("var(--mx)", "var(--my)", "1")};${pale}`, suite: ENTREE },
          { t: r1 - 0.12, css: `${tr("var(--lx)", "var(--ly)", "calc(var(--ls) * 1.08)")};${plein}`, suite: SOUPLE },
          { t: r1, css: `${tr("var(--lx)", "var(--ly)", "var(--ls)")}` },
          { t: ETAPES.logo[1], css: `opacity:1;${tr("var(--lx)", "var(--ly)", "var(--ls)")}` },
          { t: ETAPES.logo[1] + 0.05, css: `opacity:0;${tr("var(--lx)", "var(--ly)", "var(--ls)")}` },
        ],
        `opacity:0;${tr("var(--lx)", "var(--ly)", "var(--ls)")};${plein}`,
        `opacity:0;${tr("var(--lx)", "var(--ly)", "var(--ls)")};${plein}`,
      ),
    );

    // Mot i : glisse de bas en haut, comme sorti d'une fente, puis s'efface avant le regroupement.
    const [e0, e1] = ETAPES.motsEffaces;
    regles.push(
      keyframes(
        `tt-mot-${i + 1}`,
        [
          { t: mot, css: "opacity:0;transform:translateY(105%)", suite: SORTIE },
          { t: mot + ETAPES.dureeMot, css: "opacity:1;transform:translateY(0)" },
          { t: e0, css: "opacity:1;transform:translateY(0)", suite: ENTREE },
          { t: e1, css: "opacity:0;transform:translateY(-40%)" },
        ],
        "opacity:0;transform:translateY(105%)",
        "opacity:0;transform:translateY(-40%)",
      ),
    );
  }

  // Titres des arguments sous leur disque (FR-022) : apparaissent après leur mot, s'effacent avec lui.
  for (const [k, a] of ARGUMENTS_ANIMATION.entries()) {
    const rang = ARGUMENTS_ANIMATION.slice(0, k).filter((b) => b.mot === a.mot).length;
    const t = ETAPES.titre(a.mot, rang);
    const [e0, e1] = ETAPES.motsEffaces;
    regles.push(
      keyframes(
        `tt-titre-${k + 1}`,
        [
          { t, css: "opacity:0;transform:translateY(6px)", suite: SORTIE },
          { t: t + ETAPES.dureeTitre, css: "opacity:1;transform:none" },
          { t: e0, css: "opacity:1;transform:none", suite: ENTREE },
          { t: e1, css: "opacity:0;transform:translateY(-6px)" },
        ],
        "opacity:0;transform:translateY(6px)",
        "opacity:0;transform:translateY(-6px)",
      ),
    );
  }

  // Image finale : logo, phrase d'accroche, lien. Visible au début du cycle (fondu de la
  // boucle précédente) et à la fin.
  const apparition = (nom: string, [d, f]: readonly [number, number], depart: string) =>
    keyframes(
      nom,
      [
        { t: -FONDU_INITIAL, css: `opacity:1;transform:none`, suite: SOUPLE },
        { t: 0, css: `opacity:0;transform:${depart}` },
        { t: d, css: `opacity:0;transform:${depart}`, suite: SORTIE },
        { t: f, css: "opacity:1;transform:none" },
      ],
      "opacity:1;transform:none",
      "opacity:1;transform:none",
    );
  regles.push(apparition("tt-logo", ETAPES.logo, "none"));
  regles.push(apparition("tt-accroche", ETAPES.accroche, "translateY(24px)"));
  for (const i of [0, 1, 2, 3, 4]) regles.push(apparition(`tt-argument-${i + 1}`, ETAPES.argument(i), "translateY(8px)"));
  regles.push(apparition("tt-lien", ETAPES.lien, "translateY(12px)"));
  // Pause (bouton, onglet caché) : tout mouvement s'arrête là où il en est (FR-009).
  regles.push(".tt-scene[data-pause] *{animation-play-state:paused!important}");
  // Hauteur de la scène pendant l'animation (SC-001 : le haut des six cartes reste visible).
  // La phrase tient sur une ligne à partir de 1 200 px : la scène peut y être plus basse (FR-023).
  regles.push(
    `.tt-scene{height:${HAUTEUR_SCENE.telephone}}@media (min-width:768px){.tt-scene{height:${HAUTEUR_SCENE.ordinateur}}}` +
      `@media (min-width:1200px){.tt-scene{height:${HAUTEUR_SCENE.grandEcran}}}`,
  );
  // Bandeau compact (FR-021) : après la lecture, il reste la phrase d'accroche, les titres des
  // arguments et « Revoir » ; le logo (déjà dans l'en-tête) et le bouton vers les
  // cartes, juste dessous, s'effacent.
  const compact = (p: string) =>
    `${p}{height:auto}${p} .tt-anime,${p} .tt-logo-final,${p} .tt-lien-final{display:none}` +
    `${p} .tt-final{position:static;gap:.75rem;padding:1.75rem 1rem .75rem}${p} .tt-final h1{font-size:var(--ec-fs-h2)}` +
    `${p} .tt-arguments{display:flex;flex-wrap:wrap;justify-content:center;gap:.25rem 1.25rem;font-size:var(--ec-fs-small);max-width:none}` +
    `${p} .tt-controle{position:static;padding:0 1rem 1.5rem}${p} .tt-controle>div{justify-content:center}`;
  regles.push(compact(".tt-scene[data-compact]"));
  // Passage au bandeau : l'image finale s'efface avant que la scène ne se réduise.
  regles.push(".tt-scene[data-sortie] .tt-final,.tt-scene[data-sortie] .tt-controle{opacity:0;transition:opacity .25s ease}");
  // Mouvement réduit (FR-011) : directement le bandeau compact, avec la ligne fixe des trois mots,
  // sans forme animée ni bouton.
  regles.push(
    `@media (prefers-reduced-motion:reduce){${compact(".tt-scene")}.tt-scene .tt-final{padding-bottom:1.75rem}.tt-mots-fixes{display:flex}.tt-controle{display:none}}`,
  );
  // Horloge : un élément invisible dont la fin signale la fin de la lecture.
  regles.push("@keyframes tt-horloge{from{opacity:0}to{opacity:0}}");

  return regles.join("\n");
}

/** Propriété `animation` d'un élément de la scène. */
export function animation(nom: string): string {
  return `${nom} ${DUREE_CYCLE}s linear -${FONDU_INITIAL}s ${BOUCLES} both`;
}
