"use client";

import { useEffect, useId, useRef } from "react";

/**
 * Fenêtre de confirmation (F18, FR-012, FR-013) : modale native (<dialog>), comme le menu
 * mobile : fond inerte, focus retenu, Échap pour fermer. « Annuler » et un clic sur le fond
 * ferment aussi, sans rien faire. Le focus revient à l'élément qui l'a ouverte, sauf si
 * l'action confirmée le place ailleurs (`onConfirmer` renvoie alors vrai).
 */
export function FenetreConfirmation({
  ouverte,
  titre,
  texte,
  libelleConfirmer,
  onConfirmer,
  onFermer,
}: {
  ouverte: boolean;
  titre: string;
  texte: string;
  libelleConfirmer: string;
  onConfirmer: () => void;
  onFermer: () => void;
}) {
  const dialogue = useRef<HTMLDialogElement>(null);
  const origine = useRef<Element | null>(null);
  const confirme = useRef(false);
  const id = useId();

  useEffect(() => {
    const d = dialogue.current;
    if (!d) return;
    if (ouverte && !d.open) {
      origine.current = document.activeElement;
      confirme.current = false;
      d.showModal();
    } else if (!ouverte && d.open) d.close();
  }, [ouverte]);

  return (
    <dialog
      ref={dialogue}
      aria-labelledby={`${id}-titre`}
      aria-describedby={`${id}-texte`}
      onClose={() => {
        if (!confirme.current && origine.current instanceof HTMLElement) origine.current.focus();
        onFermer();
      }}
      // Un clic sur le fond (hors du contenu) atteint le <dialog> lui-même.
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-md border border-line bg-surface p-0 text-ink backdrop:bg-dark/40"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 id={`${id}-titre`} className="text-h3 font-semibold">
          {titre}
        </h2>
        <p id={`${id}-texte`}>{texte}</p>
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" className="ec-btn ec-btn--secondary" onClick={() => dialogue.current?.close()}>
            Annuler
          </button>
          <button
            type="button"
            className="ec-btn ec-btn--primary"
            onClick={() => {
              confirme.current = true;
              dialogue.current?.close();
              onConfirmer();
            }}
          >
            {libelleConfirmer}
          </button>
        </div>
      </div>
    </dialog>
  );
}
