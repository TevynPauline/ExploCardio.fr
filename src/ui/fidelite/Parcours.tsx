import { Dots } from "../Dots";

/** Le parcours du programme (F06, FR-036) : consommables → bons d'achat → assistance offerte. */
export function ParcoursFidelite() {
  return (
    <p className="flex flex-wrap items-center gap-2 text-small font-semibold text-ink">
      <Dots /> Consommables <span aria-hidden="true">→</span> bons d’achat <span aria-hidden="true">→</span> assistance offerte
    </p>
  );
}
