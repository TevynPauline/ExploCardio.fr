"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "../cx";

export type Onglet = { id: string; titre: string; contenu: ReactNode };

/**
 * Onglets d'information (FR-018, FR-042) : motif « tabs » de l'ARIA — flèches gauche et
 * droite, Origine, Fin ; seul l'onglet actif est dans l'ordre de tabulation.
 */
export function Onglets({ onglets, libelle }: { onglets: Onglet[]; libelle: string }) {
  const [actif, setActif] = useState(0);
  const base = useId();
  const boutons = useRef<(HTMLButtonElement | null)[]>([]);

  function aller(i: number) {
    const n = (i + onglets.length) % onglets.length;
    setActif(n);
    boutons.current[n]?.focus();
  }

  function touche(e: KeyboardEvent) {
    const actions: Record<string, () => void> = {
      ArrowRight: () => aller(actif + 1),
      ArrowLeft: () => aller(actif - 1),
      Home: () => aller(0),
      End: () => aller(onglets.length - 1),
    };
    const action = actions[e.key];
    if (action) {
      e.preventDefault();
      action();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label={libelle} onKeyDown={touche} className="flex flex-wrap gap-x-1 gap-y-2 border-b border-line">
        {onglets.map((o, i) => (
          <button
            key={o.id}
            ref={(el) => {
              boutons.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-onglet-${o.id}`}
            aria-selected={i === actif}
            aria-controls={`${base}-panneau-${o.id}`}
            tabIndex={i === actif ? 0 : -1}
            onClick={() => setActif(i)}
            className={cx(
              "-mb-px min-h-11 border-b-2 px-3 text-ink",
              i === actif ? "border-action font-semibold" : "border-transparent hover:border-line",
            )}
          >
            {o.titre}
          </button>
        ))}
      </div>
      {onglets.map((o, i) => (
        <div
          key={o.id}
          role="tabpanel"
          id={`${base}-panneau-${o.id}`}
          aria-labelledby={`${base}-onglet-${o.id}`}
          hidden={i !== actif}
          tabIndex={0}
          className="min-w-0"
        >
          {o.contenu}
        </div>
      ))}
    </div>
  );
}
