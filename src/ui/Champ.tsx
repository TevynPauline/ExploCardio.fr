import type { InputHTMLAttributes } from "react";
import { cx } from "./cx";

type ChampProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  libelle: string;
  aide?: string;
  erreur?: string | null;
};

/**
 * Champ de formulaire de la charte : libellé au-dessus (14 px, 500), champ blanc, rayon 6 px,
 * bordure contrastée (≥ 3:1, WCAG 1.4.11), halo d'action au focus. Hauteur ≥ 44 px.
 */
export function Champ({ id, libelle, aide, erreur, className, "aria-describedby": decritPar, ...props }: ChampProps) {
  const idAide = aide ? `${id}-aide` : undefined;
  const idErreur = erreur ? `${id}-erreur` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-small font-medium text-ink">
        {libelle}
      </label>
      <input
        id={id}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={[idAide, idErreur, decritPar].filter(Boolean).join(" ") || undefined}
        className={cx(
          "min-h-11 rounded-sm border border-muted bg-surface px-3 text-body text-ink",
          "focus-visible:border-action focus-visible:outline-2 focus-visible:outline-action",
          className,
        )}
        {...props}
      />
      {aide ? (
        <p id={idAide} className="text-small text-muted">
          {aide}
        </p>
      ) : null}
      {erreur ? (
        <p id={idErreur} role="alert" className="text-small font-medium text-ink">
          {erreur}
        </p>
      ) : null}
    </div>
  );
}
