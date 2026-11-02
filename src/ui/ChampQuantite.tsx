"use client";

import type { FocusEvent, KeyboardEvent } from "react";

/**
 * Quantité avec boutons « − » et « + » toujours visibles (F18, FR-007 à FR-011) : les flèches
 * natives du champ n'apparaissent qu'au survol et jamais sur écran tactile. Le champ reste
 * saisissable ; la quantité est annoncée aux lecteurs d'écran.
 */
export function ChampQuantite({
  id,
  libelle = "Quantité",
  libelleArticle,
  valeur,
  min = 1,
  max,
  desactive = false,
  onChange,
  onBlur,
  onKeyDown,
  name,
}: {
  id: string;
  /** Libellé du champ (« Quantité (lots) » sur une fiche vendue par lots). */
  libelle?: string;
  libelleArticle: string;
  valeur: string;
  min?: number;
  max: number;
  desactive?: boolean;
  onChange: (valeur: string) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  name?: string;
}) {
  const n = Number(valeur);
  const valide = valeur !== "" && Number.isInteger(n);
  const pas = (delta: number) => {
    const depart = valide ? n : min;
    onChange(String(Math.min(max, Math.max(min, depart + delta))));
  };
  const bouton =
    "inline-flex size-11 shrink-0 items-center justify-center rounded-sm border border-muted bg-surface text-h3 leading-none text-ink hover:bg-pale disabled:cursor-not-allowed disabled:opacity-50";
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-small font-medium">
        {libelle}
      </label>
      <div className="flex items-center gap-1">
        <button type="button" className={bouton} disabled={desactive || (valide && n <= min)} aria-label={`Diminuer la quantité de ${libelleArticle}`} onClick={() => pas(-1)}>
          <span aria-hidden="true">−</span>
        </button>
        <input
          id={id}
          name={name}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={valeur}
          disabled={desactive}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          className="ec-quantite min-h-11 w-16 rounded-sm border border-muted bg-surface px-2 text-center text-ink"
        />
        <button type="button" className={bouton} disabled={desactive || (valide && n >= max)} aria-label={`Augmenter la quantité de ${libelleArticle}`} onClick={() => pas(1)}>
          <span aria-hidden="true">+</span>
        </button>
      </div>
      <span className="sr-only" aria-live="polite">
        {valide ? `Quantité : ${n}` : ""}
      </span>
    </div>
  );
}
