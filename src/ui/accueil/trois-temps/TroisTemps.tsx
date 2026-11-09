"use client";

import Image from "next/image";
import empile from "@brand/assets/explocardio-fr-logo.svg";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ARGUMENTS_ANIMATION, type TextesAnimation } from "@/domaine/textes-animation";
import { animation, feuilleDeStyle, LOGO, REDUCTION } from "./chronologie";

// Animation « Les trois temps » (F20, US1, US2) : les trois points du logo arrivent en
// rebondissant, s'écartent jusqu'à un même diamètre, portent chacun un mot, puis se referment sur
// le logo officiel et la phrase d'accroche, titre principal de la page. Pause à tout moment,
// une seule lecture, puis réduction en bandeau compact (phrase d'accroche et « Revoir »)
// pour laisser la place au reste de la page ; bandeau d'emblée si le visiteur a demandé à réduire
// les animations.

// F23 (FR-019, D4) : placée plus bas que le premier bloc, l'animation attend d'entrer à l'écran.
const STYLE = `${feuilleDeStyle()}@media (scripting:enabled){.tt-scene[data-differee]:not([data-vue]) *{animation-play-state:paused!important}}`;

type Etat = "lecture" | "pause" | "fini";

function IconePause({ etat }: { etat: Etat }) {
  return etat === "lecture" ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="currentColor">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
    </svg>
  );
}

/**
 * `titrePrincipal` : la phrase d'accroche est le `<h1>` de la page (animation en premier bloc) ;
 * sinon, un `<p>` de même style (F23, FR-012). `differee` : lecture à l'entrée à l'écran.
 * `cible` : ancre du bouton « Voir l'offre » (FR-018).
 */
export function TroisTemps({
  textes,
  titrePrincipal = true,
  differee = false,
  cible = "#acces-rapide",
}: {
  textes: TextesAnimation;
  titrePrincipal?: boolean;
  differee?: boolean;
  cible?: string;
}) {
  const [vue, setVue] = useState(!differee);
  const [etat, setEtat] = useState<Etat>("lecture");
  const [cache, setCache] = useState(false);
  // Changer de clé remonte les formes : l'animation repart du début (« Lecture » après la fin).
  const [tour, setTour] = useState(0);
  // Fin de la lecture : l'image finale s'efface (« sortie »), puis la scène devient un bandeau.
  const [sortie, setSortie] = useState(false);
  const [compact, setCompact] = useState(false);
  const scene = useRef<HTMLElement>(null);
  const avant = useRef<{ hauteur: number; suite: number } | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(minuterie.current), []);

  useEffect(() => {
    const el = scene.current;
    if (vue || !el) return;
    const observateur = new IntersectionObserver((entrees) => {
      if (entrees.some((e) => e.isIntersecting)) {
        setVue(true);
        observateur.disconnect();
      }
    }, { threshold: 0.5 });
    observateur.observe(el);
    return () => observateur.disconnect();
  }, [vue]);

  useEffect(() => {
    const suivre = () => setCache(document.visibilityState === "hidden");
    suivre();
    document.addEventListener("visibilitychange", suivre);
    return () => document.removeEventListener("visibilitychange", suivre);
  }, []);

  const finir = () => {
    setEtat("fini");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCompact(true);
      return;
    }
    setSortie(true);
    minuterie.current = setTimeout(() => {
      const el = scene.current;
      if (el) avant.current = { hauteur: el.offsetHeight, suite: el.nextElementSibling?.getBoundingClientRect().top ?? 0 };
      setSortie(false);
      setCompact(true);
    }, REDUCTION.fondu);
  };

  // Réduction en bandeau : en haut de page, la hauteur se réduit en douceur et le bandeau apparaît
  // en fondu ; si le visiteur a déjà fait défiler la page, ce qu'il lit ne bouge pas.
  useLayoutEffect(() => {
    const el = scene.current;
    const mesure = avant.current;
    avant.current = null;
    if (!compact || !el || !mesure) return;
    const hauteur = el.offsetHeight;
    if (window.scrollY >= mesure.hauteur - hauteur) {
      const ecart = (el.nextElementSibling?.getBoundingClientRect().top ?? 0) - mesure.suite;
      if (ecart) window.scrollBy({ top: ecart, behavior: "instant" });
      return;
    }
    el.animate([{ height: `${mesure.hauteur}px` }, { height: `${hauteur}px` }], { duration: REDUCTION.hauteur, easing: "cubic-bezier(.2,.7,.2,1)" });
    for (const bloc of el.querySelectorAll(".tt-final, .tt-controle")) {
      bloc.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, delay: REDUCTION.hauteur / 2, fill: "backwards" });
    }
  }, [compact]);

  const basculer = () => {
    if (etat === "lecture") setEtat("pause");
    else if (etat === "pause") setEtat("lecture");
    else {
      clearTimeout(minuterie.current);
      setSortie(false);
      setCompact(false);
      setTour((t) => t + 1);
      setEtat("lecture");
    }
  };

  const Accroche = titrePrincipal ? "h1" : "p";
  const enPause = etat === "pause" || (etat === "lecture" && cache);

  return (
    <section
      ref={scene}
      id="trois-temps"
      data-section="trois-temps"
      data-differee={differee ? "" : undefined}
      data-vue={vue ? "" : undefined}
      aria-labelledby="titre-trois-temps"
      data-pause={enPause ? "" : undefined}
      data-etat={etat}
      data-sortie={sortie ? "" : undefined}
      data-compact={compact ? "" : undefined}
      className="tt-scene relative isolate overflow-hidden"
    >
      <style href="tt-trois-temps" precedence="default">
        {STYLE}
      </style>
      <div key={tour} className="contents">
        {/* Horloge invisible : sa fin signale la fin de la lecture. */}
        <span aria-hidden="true" className="absolute size-0" style={{ animation: animation("tt-horloge") }} onAnimationEnd={finir} />

        {/* Formes et mots animés, décoratifs : le texte est lu une fois plus bas (FR-013). */}
        <div aria-hidden="true" className="tt-anime pointer-events-none absolute inset-0">
          {LOGO.cercles.map((c, i) => (
            <span
              key={i}
              className={`tt-point-${i + 1} absolute left-1/2 top-1/2 block rounded-full will-change-transform`}
              style={{
                width: "var(--tt-d)",
                height: "var(--tt-d)",
                margin: "calc(var(--tt-d) / -2) 0 0 calc(var(--tt-d) / -2)",
                ["--tt-c" as string]: c.couleur,
                animation: animation(`tt-point-${i + 1}`),
              }}
            />
          ))}
          {textes.mots.map((mot, i) => (
            <span
              key={i}
              className={`tt-mot-${i + 1} absolute left-1/2 top-1/2 block overflow-hidden whitespace-nowrap px-1 text-center text-[1.375rem] font-light leading-tight text-ink md:text-[1.625rem]`}
              style={{ transform: "translate(calc(-50% + var(--mx)), calc(-50% + var(--my)))" }}
            >
              <span className="block" style={{ animation: animation(`tt-mot-${i + 1}`) }}>
                {mot}
              </span>
            </span>
          ))}
          {/* Titres des arguments sous le disque de leur mot (à sa droite sur téléphone), FR-022. */}
          {textes.arguments.map((argument, i) => (
            <span key={i} className={`tt-titre-${i + 1} absolute left-1/2 top-1/2 block text-small font-medium leading-snug text-ink lg:text-body`}>
              <span className="block" style={{ animation: animation(`tt-titre-${i + 1}`) }}>
                {argument}
              </span>
            </span>
          ))}
        </div>

        {/* Image finale : logo, phrase d'accroche (titre de la page), lien vers les six cartes. */}
        <div className="tt-final absolute inset-x-0 flex flex-col items-center gap-3 px-4 text-center" style={{ top: "calc(50% - var(--tt-logo-haut))" }}>
          <Image
            src={empile}
            alt="ExploCardio.fr"
            priority
            unoptimized
            className="tt-logo-final h-auto"
            style={{ width: "var(--tt-logo-l)", animation: animation("tt-logo") }}
          />
          <Accroche id="titre-trois-temps" className="max-w-6xl text-balance text-display font-light text-ink" style={{ animation: animation("tt-accroche") }}>
            {textes.accroche}
          </Accroche>
          <p className="sr-only">{textes.mots.join(", ")}.</p>
          <ul aria-hidden="true" className="tt-mots-fixes hidden flex-wrap items-center justify-center gap-x-6 gap-y-2 text-h3 font-light text-ink">
            {textes.mots.map((mot, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="block size-3 rounded-full" style={{ background: LOGO.cercles[i]!.couleur }} />
                {mot}
              </li>
            ))}
          </ul>
          {/* Rappel des arguments commerciaux (FR-022), dans l'ordre des mots, pastille de la couleur du mot. */}
          <ul className="tt-arguments flex max-w-3xl flex-wrap justify-center gap-x-5 gap-y-1.5 text-small text-ink md:gap-x-8 md:gap-y-2 md:text-body">
            {textes.arguments.map((argument, i) => (
              <li key={i} className="flex items-center gap-2" style={{ animation: animation(`tt-argument-${i + 1}`) }}>
                <span aria-hidden="true" className="block size-2.5 shrink-0 rounded-full" style={{ background: LOGO.cercles[ARGUMENTS_ANIMATION[i]!.mot]!.couleur }} />
                {argument}
              </li>
            ))}
          </ul>
          <a href={cible} className="tt-lien-final ec-btn ec-btn--primary" style={{ animation: animation("tt-lien") }}>
            Voir l’offre
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M6 13l6 6 6-6" />
            </svg>
          </a>
        </div>
      </div>

      <div className="tt-controle pointer-events-none absolute inset-x-0 top-3">
        <div className="mx-auto flex max-w-page justify-end px-4">
          <button
            type="button"
            onClick={basculer}
            className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-pill border border-line bg-surface px-4 text-small font-medium text-ink hover:bg-pale"
          >
            <IconePause etat={etat} />
            {etat === "lecture" ? "Pause" : etat === "pause" ? "Lecture" : "Revoir"}
          </button>
        </div>
      </div>
    </section>
  );
}
