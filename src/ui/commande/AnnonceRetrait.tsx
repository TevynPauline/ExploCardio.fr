"use client";

import { useEffect, useState } from "react";

// Retrait d'un article du panier (F18, FR-014) : la ligne disparaît avec le nouveau rendu de la
// page ; ce composant, présent que le panier soit plein ou vide, annonce le retrait et place le
// focus sur l'article suivant, ou sur le titre du panier. L'annonce en attente est gardée hors
// de React pour survivre au passage « panier » → « panier vide ».

const EVENEMENT = "ec:panier-retrait";
export const ID_TITRE_PANIER = "titre-panier";

let enAttente: { message: string; cible: string | null } | null = null;

/** Appelé par la ligne retirée : `cible` est l'id de l'élément à focaliser ensuite. */
export function signalerRetrait(message: string, cible: string | null) {
  enAttente = { message, cible };
  window.dispatchEvent(new Event(EVENEMENT));
}

export function AnnonceRetrait() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    let minuteur: number | undefined;
    const traiter = () => {
      if (!enAttente) return;
      const { message: m, cible } = enAttente;
      setMessage(m);
      // La page se recalcule : on attend que la ligne soit partie (2 s au plus).
      const debut = Date.now();
      const essayer = () => {
        const element = (cible && document.getElementById(cible)) || document.getElementById(ID_TITRE_PANIER);
        const ligneEncore = enAttente && document.querySelector(`[data-ligne-retiree="true"]`);
        if (element && !ligneEncore) {
          element.focus();
          enAttente = null;
        } else if (Date.now() - debut < 2000) minuteur = window.setTimeout(essayer, 100);
        else enAttente = null;
      };
      essayer();
    };
    traiter();
    window.addEventListener(EVENEMENT, traiter);
    return () => {
      window.removeEventListener(EVENEMENT, traiter);
      window.clearTimeout(minuteur);
    };
  }, []);

  return (
    <p role="status" className="sr-only">
      {message}
    </p>
  );
}
