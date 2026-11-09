import type { ReactNode } from "react";

// Schémas des six cartes « Pourquoi choisir ExploCardio.fr ? » (F23, FR-008 à FR-010, D9) :
// formes de la charte (cercles, pilules, traits fins) aux couleurs des tokens, mots en vrai texte
// à l'encre. Décoratifs (aria-hidden) : le sens est porté par le titre et la phrase de la carte.
// Chaque schéma s'anime une fois (≤ 2 s) quand sa carte entre à l'écran ; sans script ou en
// mouvement réduit, les animations ne sont pas déclarées : l'état final s'affiche d'emblée.

const ENTREE = "cubic-bezier(.2,.7,.2,1)";

export const STYLE_POURQUOI = `
@keyframes pq-gauche{from{transform:translateX(-28px);opacity:0}}
@keyframes pq-droite{from{transform:translateX(28px);opacity:0}}
@keyframes pq-haut{from{transform:translateY(-16px);opacity:0}}
@keyframes pq-apparait{from{opacity:0;transform:scale(.6)}}
@keyframes pq-trait{from{transform:scaleX(0)}}
@keyframes pq-jauge{from{transform:scaleX(0)}}
@keyframes pq-selection{0%{transform:translateX(0)}30%,45%{transform:translateX(100%)}70%,85%{transform:translateX(200%)}100%{transform:translateX(0)}}
@media (scripting:enabled) and (prefers-reduced-motion:no-preference){
.pq-carte .pq-gauche{animation:pq-gauche .9s ${ENTREE} both}
.pq-carte .pq-droite{animation:pq-droite .9s ${ENTREE} both}
.pq-carte .pq-haut{animation:pq-haut .7s ${ENTREE} both}
.pq-carte .pq-apparait{animation:pq-apparait .5s ${ENTREE} both}
.pq-carte .pq-trait{transform-origin:left center;animation:pq-trait .5s ease-out both}
.pq-carte .pq-jauge{transform-origin:left center;animation:pq-jauge 1.1s ${ENTREE} both}
.pq-carte .pq-selection{animation:pq-selection 2s ease-in-out both}
.pq-carte:not([data-visible]) *{animation-play-state:paused!important}
}`;

/** Délai d'une forme, en secondes. */
const apres = (s: number) => ({ animationDelay: `${s}s` });

function Cadre({ children }: { children: ReactNode }) {
  return (
    <div aria-hidden="true" className="flex h-32 items-center justify-center overflow-hidden rounded bg-bg px-3 text-small font-medium leading-tight text-ink">
      {children}
    </div>
  );
}

function Rond({ couleur, taille, className, style, children }: { couleur: string; taille: number; className?: string; style?: React.CSSProperties; children?: ReactNode }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full text-center ${className ?? ""}`}
      style={{ width: taille, height: taille, background: `var(--ec-${couleur})`, ...style }}
    >
      {children}
    </span>
  );
}

/** 1. Une offre de produits et de services : trois cercles qui se rejoignent et se chevauchent. */
function OffreComplete() {
  const cercles = [
    { couleur: "euca", mot: "Matériel", anim: "pq-gauche" },
    { couleur: "sage", mot: "Consommables", anim: "pq-haut" },
    { couleur: "blue", mot: "Services", anim: "pq-droite" },
  ];
  return (
    <Cadre>
      <div className="flex flex-col items-center gap-3">
        <div className="flex">
          {cercles.map((c, i) => (
            <Rond key={c.mot} couleur={c.couleur} taille={52} className={`${c.anim} mix-blend-multiply`} style={{ margin: "0 -8px", opacity: 0.85, ...apres(i * 0.15) }} />
          ))}
        </div>
        <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          {cercles.map((c, i) => (
            <li key={c.mot} className="pq-apparait flex items-center gap-1.5" style={apres(0.7 + i * 0.1)}>
              <span className="block size-2 rounded-full" style={{ background: `var(--ec-${c.couleur})` }} />
              {c.mot}
            </li>
          ))}
        </ul>
      </div>
    </Cadre>
  );
}

/** 2. Achetez, louez, financez : sélecteur à trois pilules, la sélection glisse d'une option à l'autre. */
function Selecteur() {
  return (
    <Cadre>
      <div className="relative grid w-full max-w-72 grid-cols-3 rounded-pill border border-line bg-surface p-1">
        <span className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)]">
          <span className="pq-selection block size-full rounded-pill border border-sage bg-pale" />
        </span>
        {["Acheter", "Louer", "Financer"].map((mot) => (
          <span key={mot} className="relative py-2 text-center">{mot}</span>
        ))}
      </div>
    </Cadre>
  );
}

/** Étapes reliées par un trait qui se dessine (cartes 3 et 5). */
function Chaine({ etapes }: { etapes: { mot: string; couleur: string; taille: number; detail?: string }[] }) {
  return (
    <Cadre>
      <ol className="flex w-full items-start">
        {etapes.map((e, i) => (
          <li key={e.mot} className="relative flex flex-1 flex-col items-center gap-2 text-center">
            {i > 0 ? (
              <span className="pq-trait absolute top-[13px] block h-0.5 bg-sage" style={{ left: "calc(-50% + 18px)", right: "calc(50% + 18px)", ...apres(0.25 + (i - 1) * 0.5) }} />
            ) : null}
            <span className="flex h-7 items-center">
              <Rond couleur={e.couleur} taille={e.taille} className="pq-apparait relative" style={apres(i * 0.5)} />
            </span>
            <span className="pq-apparait w-full hyphens-auto break-words px-1 font-normal" style={apres(0.1 + i * 0.5)}>
              {e.mot}
              {e.detail ? <span className="mt-1 block text-ink">{e.detail}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </Cadre>
  );
}

/** 4. Une fidélité récompensée : la jauge de points se remplit, puis devient un bon d'achat. */
function Jauge() {
  return (
    <Cadre>
      <div className="flex w-full max-w-80 items-center gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <span>Points</span>
          <span className="block h-3 overflow-hidden rounded-pill border border-line bg-surface">
            <span className="pq-jauge block h-full rounded-pill bg-sage" />
          </span>
        </div>
        <span className="pq-trait block h-0.5 w-5 bg-sage" style={apres(1.1)} />
        <span className="pq-apparait rounded-pill border border-euca bg-pale px-3 py-2" style={apres(1.4)}>
          Bon d’achat
        </span>
      </div>
    </Cadre>
  );
}

/** 6. Des interlocuteurs experts : deux cercles qui se rejoignent. */
function Rencontre() {
  const cercles = [
    { couleur: "blue", mot: "Vous", anim: "pq-gauche" },
    { couleur: "euca", mot: "Nos spécialistes", anim: "pq-droite" },
  ];
  return (
    <Cadre>
      <div className="flex flex-col items-center gap-3">
        <div className="flex">
          {cercles.map((c) => (
            <Rond key={c.mot} couleur={c.couleur} taille={56} className={`${c.anim} mix-blend-multiply`} style={{ margin: "0 -7px", opacity: 0.85 }} />
          ))}
        </div>
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          {cercles.map((c, i) => (
            <li key={c.mot} className="pq-apparait flex items-center gap-1.5" style={apres(0.8 + i * 0.1)}>
              <span className="block size-2 rounded-full" style={{ background: `var(--ec-${c.couleur})` }} />
              {c.mot}
            </li>
          ))}
        </ul>
      </div>
    </Cadre>
  );
}

export const SCHEMAS = [
  <OffreComplete key="1" />,
  <Selecteur key="2" />,
  <Chaine
    key="3"
    etapes={[
      { mot: "Consommables achetés", couleur: "euca", taille: 14 },
      { mot: "Droits ouverts", couleur: "sage", taille: 20 },
      { mot: "Assistance dédiée", couleur: "blue", taille: 26 },
    ]}
  />,
  <Jauge key="4" />,
  <Chaine
    key="5"
    etapes={[
      { mot: "Demande", couleur: "sage", taille: 18 },
      { mot: "Mise à disposition", couleur: "euca", taille: 26, detail: "Matériel ou licence" },
    ]}
  />,
  <Rencontre key="6" />,
];
