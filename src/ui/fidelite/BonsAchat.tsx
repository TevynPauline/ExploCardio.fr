"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { actionUtiliserBons } from "@/actions/panier";
import { centimesDepuisSaisie, euros } from "@/lib/montants";

type Props = {
  soldeHt: number;
  prochaineExpiration: { date: string; montantHt: number } | null;
  utilises: boolean;
  montantDemandeHt: number | null;
  /** Bons réellement appliqués par le devis (plafonnés). */
  appliquesHt: number;
};

/** Bons d'achat au panier (F06, US3, D1) : en tout ou en partie ; Odoo plafonne le montant. */
export function BonsAchat({ soldeHt, prochaineExpiration, utilises, montantDemandeHt, appliquesHt }: Props) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [saisie, setSaisie] = useState(montantDemandeHt !== null ? (montantDemandeHt / 100).toFixed(2).replace(".", ",") : "");
  const [erreur, setErreur] = useState<string | null>(null);
  if (soldeHt <= 0) return null;
  const appliquer = (utiliser: boolean, montant: number | null) =>
    demarrer(async () => {
      await actionUtiliserBons(utiliser, montant);
      router.refresh();
    });
  return (
    <section aria-labelledby="titre-bons" className="flex flex-col gap-3">
      <h3 id="titre-bons" className="font-semibold text-ink">Bons d’achat</h3>
      <p>
        Solde disponible : <strong className="text-ink">{euros(soldeHt)} HT</strong>
        {prochaineExpiration ? <span className="text-small text-muted"> (dont {euros(prochaineExpiration.montantHt)} expirant le {new Date(prochaineExpiration.date).toLocaleDateString("fr-FR")})</span> : null}
      </p>
      {utilises ? <p role="status">{euros(appliquesHt)} HT de bons appliqués à cette commande. Les bons qui expirent le plus tôt sont utilisés en premier.</p> : null}
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!saisie.trim()) return appliquer(true, null);
          const c = centimesDepuisSaisie(saisie);
          if (c === null || c < 0) return setErreur("Indiquez un montant en euros, par exemple 50,00.");
          setErreur(null);
          appliquer(true, c);
        }}
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="montant-bons" className="text-small font-medium">Montant à utiliser (€ HT, vide = le maximum)</label>
          <input
            id="montant-bons"
            inputMode="decimal"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            aria-invalid={erreur ? true : undefined}
            aria-describedby={erreur ? "erreur-bons" : undefined}
            className="min-h-11 w-40 rounded-sm border border-muted bg-surface px-3 text-ink"
          />
        </div>
        <button type="submit" className="ec-btn ec-btn--secondary" disabled={enCours}>{utilises ? "Modifier" : "Utiliser mes bons"}</button>
        {utilises ? (
          <button type="button" className="ec-btn ec-btn--secondary" disabled={enCours} onClick={() => appliquer(false, null)}>Ne pas utiliser</button>
        ) : null}
      </form>
      {erreur ? <p id="erreur-bons" role="alert" className="text-small font-medium text-ink">{erreur}</p> : null}
    </section>
  );
}
