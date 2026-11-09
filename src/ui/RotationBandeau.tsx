"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
import type { MessageBandeau } from "@/domaine/contenus";

const INTERVALLE_MS = 6000;

/**
 * Rotation des messages du bandeau (US2-8) : bouton de pause toujours présent, rotation
 * suspendue d'office si le visiteur a demandé la réduction des animations. Pas d'annonce
 * automatique aux lecteurs d'écran à chaque changement.
 */
export function RotationBandeau({ messages, lienOffres = false }: { messages: MessageBandeau[]; lienOffres?: boolean }) {
  const chemin = usePathname();
  const [indice, setIndice] = useState(0);
  const [pause, setPause] = useState(false);
  const [mouvementReduit, setMouvementReduit] = useState(false);

  useEffect(() => {
    const requete = window.matchMedia("(prefers-reduced-motion: reduce)");
    const maj = () => setMouvementReduit(requete.matches);
    maj();
    requete.addEventListener("change", maj);
    return () => requete.removeEventListener("change", maj);
  }, []);

  const tourne = messages.length > 1 && !pause && !mouvementReduit;
  useEffect(() => {
    if (!tourne) return;
    const minuteur = window.setInterval(() => setIndice((i) => (i + 1) % messages.length), INTERVALLE_MS);
    return () => window.clearInterval(minuteur);
  }, [tourne, messages.length]);

  const courant = indice % messages.length;
  return (
    <div role="region" aria-label="Promotion en cours" className="ec-box--promo rounded-none">
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-center gap-x-3 px-4 py-2 text-small text-ink">
        {/* Sur téléphone, le message occupe sa ligne ; le lien et la pause passent dessous (F23).
            Tous les messages occupent la même case : le bandeau garde la hauteur du plus long et la
            page ne bouge pas quand le message change (CLS) ; seul le message courant est visible. */}
        <div className="grid w-full min-w-0 sm:w-auto sm:flex-1">
          {messages.map((message, i) => (
            <p
              key={i}
              aria-hidden={i === courant ? undefined : true}
              className={`text-center [grid-area:1/1] ${i === courant ? "" : "invisible"}`}
            >
              {message.lien ? (
                <Link href={message.lien} className="font-medium text-ink underline underline-offset-2">
                  {message.texte}
                </Link>
              ) : (
                message.texte
              )}
              {messages.length > 1 && i === courant ? (
                <span className="sr-only">
                  {" "}
                  (message {courant + 1} sur {messages.length})
                </span>
              ) : null}
            </p>
          ))}
        </div>
        {lienOffres ? (
          <Link
            href="/#offres-du-moment"
            onClick={(e) => allerAuxOffres(e, chemin)}
            className="inline-flex min-h-11 shrink-0 items-center rounded-pill px-3 text-small font-semibold text-ink underline underline-offset-2"
          >
            Nos offres du moment
          </Link>
        ) : null}
        {messages.length > 1 ? (
          <button
            type="button"
            onClick={() => setPause(!pause)}
            aria-pressed={pause || mouvementReduit}
            disabled={mouvementReduit}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-pill px-3 text-small font-medium text-ink underline underline-offset-2"
          >
            {pause || mouvementReduit ? "Reprendre le défilement" : "Mettre en pause"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Lien « Nos offres du moment » (F23, FR-003) : sur l'accueil, défile jusqu'au carrousel et lui
 * donne le focus ; depuis une autre page, la navigation mène à l'accueil, au carrousel.
 */
function allerAuxOffres(e: MouseEvent<HTMLAnchorElement>, chemin: string) {
  if (chemin !== "/") return;
  const cible = document.getElementById("offres-du-moment");
  if (!cible) return;
  e.preventDefault();
  const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  cible.scrollIntoView({ behavior: reduit ? "auto" : "smooth", block: "start" });
  cible.focus({ preventScroll: true });
  history.replaceState(null, "", "#offres-du-moment");
}
