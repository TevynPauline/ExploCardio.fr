"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { actionCodePromo } from "@/actions/panier";

/** Code promo (F04, US1-5) : la validité et le motif d'un refus viennent du devis d'Odoo. */
export function CodePromo({ code, statut }: { code: string | null; statut: { applique: boolean; motif: string | null } | null }) {
  const router = useRouter();
  const [saisie, setSaisie] = useState(code ?? "");
  const [enCours, demarrer] = useTransition();
  const appliquer = (valeur: string) =>
    demarrer(async () => {
      await actionCodePromo(valeur);
      router.refresh();
    });
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        appliquer(saisie);
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="code-promo" className="text-small font-medium">Code promo</label>
        <input
          id="code-promo"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          autoComplete="off"
          aria-describedby={statut ? "code-promo-statut" : undefined}
          className="min-h-11 w-48 rounded-sm border border-muted bg-surface px-3 uppercase text-ink"
        />
      </div>
      <button type="submit" className="ec-btn ec-btn--secondary" disabled={enCours}>Appliquer</button>
      {code ? (
        <button
          type="button"
          className="ec-btn ec-btn--secondary"
          disabled={enCours}
          onClick={() => {
            setSaisie("");
            appliquer("");
          }}
        >
          Retirer le code
        </button>
      ) : null}
      {statut ? (
        <p id="code-promo-statut" role="status" className="w-full text-small text-ink">
          {statut.applique ? `Code ${code} appliqué.` : `Code ${code} refusé : ${statut.motif}`}
        </p>
      ) : null}
    </form>
  );
}
