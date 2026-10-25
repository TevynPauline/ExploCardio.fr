"use client";

import { useEffect, useState, type ReactNode } from "react";
import { EVENEMENT_CALCUL } from "./LignePanier";

// Totaux du panier pendant un recalcul (F16, D6) : « Mise à jour… » jusqu'à la réponse d'Odoo.
export function TotauxEnDirect({ children }: { children: ReactNode }) {
  const [calcul, setCalcul] = useState(false);
  useEffect(() => {
    const ecouter = (e: Event) => setCalcul(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener(EVENEMENT_CALCUL, ecouter);
    return () => window.removeEventListener(EVENEMENT_CALCUL, ecouter);
  }, []);
  return (
    <div aria-busy={calcul} className="relative">
      {calcul ? <p role="status" className="mb-2 text-small font-medium text-muted">Mise à jour…</p> : null}
      <div className={calcul ? "opacity-60" : undefined}>{children}</div>
    </div>
  );
}
