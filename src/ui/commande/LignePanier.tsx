"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { actionModifierLigne, actionSupprimerLigne } from "@/actions/panier";
import { euros } from "@/lib/montants";

type Props = {
  id: string;
  libelle: string;
  defaultCode: string;
  chemin: string | null;
  formule: "achat" | "mise_a_disposition";
  quantite: number;
  prixUnitaireHt: number | null;
  totalHt: number | null;
  remiseHt: number;
  promotion: string | null;
  prixAChange: boolean;
  ancienPrixHt: number;
  delaiJours: number | null;
  indisponible: boolean;
  /** F05 (D4) : kit d'accessoires obligatoire pour une mise à disposition du panier. */
  obligatoire?: boolean;
};

/** Ligne du panier (F04, US1) : quantité et suppression sans rechargement, changements signalés. */
export function LignePanier(p: Props) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [quantite, setQuantite] = useState(String(p.quantite));
  const [erreur, setErreur] = useState<string | null>(null);

  function apres(ok: boolean, message: string) {
    if (!ok) return setErreur(message);
    setErreur(null);
    window.dispatchEvent(new Event("ec:panier"));
    router.refresh();
  }

  function enregistrer() {
    const q = Math.trunc(Number(quantite));
    if (q === p.quantite) return;
    demarrer(async () => apres(await actionModifierLigne(p.id, q), "Indiquez une quantité entre 1 et 999."));
  }

  const idQuantite = `quantite-${p.id}`;
  return (
    <li className="ec-card flex flex-wrap items-start justify-between gap-4" aria-busy={enCours}>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{p.chemin ? <Link href={p.chemin}>{p.libelle}</Link> : p.libelle}</p>
        <p className="text-small text-muted">Réf. {p.defaultCode}</p>
        {p.obligatoire ? <p className="text-small font-medium text-ink">Kit obligatoire pour votre première mise à disposition de ce type d’appareil : vous le conservez.</p> : null}
        {p.prixUnitaireHt !== null ? (
          <p className="text-small text-muted">
            {euros(p.prixUnitaireHt)} HT {p.formule === "mise_a_disposition" ? "le premier mois" : "l’unité"}
            {p.promotion ? ` · ${p.promotion}` : ""}
          </p>
        ) : null}
        {p.prixAChange && p.prixUnitaireHt !== null ? (
          <p className="text-small font-medium text-ink">
            Le prix a changé depuis votre ajout : {euros(p.ancienPrixHt)} HT → {euros(p.prixUnitaireHt)} HT.
          </p>
        ) : null}
        {p.indisponible ? (
          <p className="text-small font-medium text-ink">Indisponible pour le moment : retirez-le pour commander, ou contactez-nous.</p>
        ) : p.delaiJours ? (
          <p className="text-small text-ink">Délai : {p.delaiJours} jours.</p>
        ) : null}
        {erreur ? <p role="alert" className="text-small font-medium text-ink">{erreur}</p> : null}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={idQuantite} className="text-small font-medium">Quantité</label>
          <input
            id={idQuantite}
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
            onBlur={enregistrer}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                enregistrer();
              }
            }}
            className="min-h-11 w-24 rounded-sm border border-muted bg-surface px-3 text-ink"
          />
        </div>
        {p.obligatoire ? null : (
          <button
            type="button"
            className="ec-btn ec-btn--secondary"
            disabled={enCours}
            aria-label={`Retirer ${p.libelle} du panier`}
            onClick={() => demarrer(async () => apres(await actionSupprimerLigne(p.id), "Cette ligne n'a pas pu être retirée."))}
          >
            Retirer
          </button>
        )}
        {p.totalHt !== null ? (
          <p className="min-w-28 text-right font-semibold text-ink">
            {euros(p.totalHt)} HT{p.formule === "mise_a_disposition" ? " / 1er mois" : ""}
          </p>
        ) : null}
      </div>
    </li>
  );
}
