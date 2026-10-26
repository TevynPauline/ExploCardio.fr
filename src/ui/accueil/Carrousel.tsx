"use client";

import Image from "next/image";
import { sansOptimisation } from "../images";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Vignette } from "@/domaine/vignettes";

// Carrousel de l'accueil (F16, US2, FR-005, FR-006) : remplace le grand bandeau. Une vignette à
// la fois ; défilement toutes les 6 secondes, arrêté au survol, au focus et par le bouton
// « Pause » ; flèches et points ; aucun défilement automatique si le visiteur a demandé à réduire
// les animations (WCAG 2.2.2).

const INTERVALLE_MS = 6000;

const FONDS: Record<string, string> = { pale: "bg-pale", "blue-soft": "bg-blue-soft", lin: "bg-lin", mint: "bg-mint" };

function IconeFleche({ sens }: { sens: "gauche" | "droite" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={sens === "gauche" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

const controle = "inline-flex size-11 items-center justify-center rounded-pill border border-line bg-surface text-ink hover:bg-pale";

export function Carrousel({ vignettes }: { vignettes: Vignette[] }) {
  const [indice, setIndice] = useState(0);
  const [enPause, setEnPause] = useState(false);
  const [survol, setSurvol] = useState(false);
  const [focus, setFocus] = useState(false);
  const [mouvementReduit, setMouvementReduit] = useState(true);
  const total = vignettes.length;

  useEffect(() => {
    const requete = window.matchMedia("(prefers-reduced-motion: reduce)");
    const appliquer = () => setMouvementReduit(requete.matches);
    appliquer();
    requete.addEventListener("change", appliquer);
    return () => requete.removeEventListener("change", appliquer);
  }, []);

  const aller = useCallback((i: number) => setIndice(((i % total) + total) % total), [total]);
  const defile = total > 1 && !enPause && !survol && !focus && !mouvementReduit;

  useEffect(() => {
    if (!defile) return;
    const minuteur = window.setInterval(() => setIndice((i) => (i + 1) % total), INTERVALLE_MS);
    return () => window.clearInterval(minuteur);
  }, [defile, total]);

  if (total === 0) return null;

  return (
    <section
      aria-roledescription="carrousel"
      aria-label="À la une"
      data-section="carrousel"
      className="mx-auto w-full max-w-page px-4 pt-6"
      onMouseEnter={() => setSurvol(true)}
      onMouseLeave={() => setSurvol(false)}
      onFocus={() => setFocus(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocus(false);
      }}
    >
      <div className="relative overflow-hidden rounded-lg">
        <div aria-live={defile ? "off" : "polite"} className="flex transition-transform duration-500 ease-out motion-reduce:transition-none" style={{ transform: `translateX(-${indice * 100}%)` }}>
          {vignettes.map((v, i) => {
            const visible = i === indice;
            return (
              <div
                key={v.id}
                role="group"
                aria-roledescription="vignette"
                aria-label={`${i + 1} sur ${total}`}
                aria-hidden={visible ? undefined : true}
                inert={!visible}
                data-vignette
                className={`relative flex h-[440px] w-full shrink-0 items-end overflow-hidden lg:h-[420px] lg:items-center ${FONDS[v.fond ?? "pale"] ?? "bg-pale"}`}
              >
                {v.image ? (
                  <>
                    {/* F16 (choix du 2026-10-26) : image légèrement transparente sur toute la vignette,
                        sur le fond pastel, sous le texte (encre) qui reste lisible. */}
                    <Image src={v.image.url} alt={v.image.texteRemplacement} fill sizes="(min-width: 1180px) 1180px, 100vw" priority={i === 0} className="object-cover opacity-30" unoptimized={sansOptimisation(v.image.url)} />
                  </>
                ) : (
                  <span aria-hidden="true" className="pointer-events-none absolute -right-8 top-8 hidden items-end gap-5 md:flex">
                    <span className="block size-20 rounded-full bg-euca" />
                    <span className="block size-28 rounded-full bg-sage" />
                    <span className="block size-36 rounded-full bg-blue" />
                  </span>
                )}
                <div className="relative flex max-w-xl flex-col items-start gap-4 p-8 text-ink lg:p-12">
                  <h2 className="break-words text-display font-light">{v.titre}</h2>
                  <p className="break-words text-lead">{v.phrase}</p>
                  {v.lien && v.libelleLien ? (
                    <Link href={v.lien} className="ec-btn ec-btn--primary">
                      {v.libelleLien}
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

      </div>
        {total > 1 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => aller(indice - 1)} className={controle} aria-label="Vignette précédente">
              <IconeFleche sens="gauche" />
            </button>
            <button type="button" onClick={() => aller(indice + 1)} className={controle} aria-label="Vignette suivante">
              <IconeFleche sens="droite" />
            </button>
            <button type="button" onClick={() => setEnPause((p) => !p)} className={`${controle} w-auto px-4 text-small font-medium`} aria-pressed={enPause}>
              {enPause ? "Lecture" : "Pause"}
            </button>
          </div>
          <div className="flex items-center">
            {vignettes.map((v, i) => (
              <button
                key={v.id}
                type="button"
                onClick={() => aller(i)}
                aria-label={`Vignette ${i + 1} : ${v.titre}`}
                aria-current={i === indice ? "true" : undefined}
                className="inline-flex size-11 items-center justify-center"
              >
                <span aria-hidden="true" className={`block rounded-full ${i === indice ? "size-3 bg-action" : "size-2 bg-muted"}`} />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
