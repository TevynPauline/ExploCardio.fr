"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MessageBandeau } from "@/domaine/contenus";

const INTERVALLE_MS = 6000;

/**
 * Rotation des messages du bandeau (US2-8) : bouton de pause toujours présent, rotation
 * suspendue d'office si le visiteur a demandé la réduction des animations. Pas d'annonce
 * automatique aux lecteurs d'écran à chaque changement.
 */
export function RotationBandeau({ messages }: { messages: MessageBandeau[] }) {
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

  const message = messages[indice % messages.length]!;
  return (
    <div role="region" aria-label="Promotion en cours" className="ec-box--promo rounded-none">
      <div className="mx-auto flex max-w-page items-center justify-center gap-3 px-4 py-2 text-small text-ink">
        <p className="min-w-0 flex-1 text-center">
          {message.lien ? (
            <Link href={message.lien} className="font-medium text-ink underline underline-offset-2">
              {message.texte}
            </Link>
          ) : (
            message.texte
          )}
          {messages.length > 1 ? (
            <span className="sr-only">
              {" "}
              (message {(indice % messages.length) + 1} sur {messages.length})
            </span>
          ) : null}
        </p>
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
