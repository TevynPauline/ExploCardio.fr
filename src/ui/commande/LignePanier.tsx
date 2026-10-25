"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { actionModifierLigne, actionSupprimerLigne } from "@/actions/panier";
import { prixLigne, type Bareme } from "@/domaine/commande/prix-ligne";
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
  promotionTerminee?: string | null;
  ancienPrixHt: number;
  delaiJours: number | null;
  indisponible: boolean;
  /** F05 (D4) : kit d'accessoires obligatoire pour une mise à disposition du panier. */
  obligatoire?: boolean;
  /** F16 (D6) : barème pour afficher le prix de la ligne dès que la quantité change. */
  bareme?: Bareme | null;
};

/** Événement « calcul du panier en cours » (F16, D6) : les totaux affichent « Mise à jour… ». */
export const EVENEMENT_CALCUL = "ec:panier-calcul";

const QUANTITE_MAX = 999;
const DELAI_MS = 300;

/** Ligne du panier (F04, US1) : quantité et suppression sans rechargement, changements signalés. */
export function LignePanier(p: Props) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [quantite, setQuantite] = useState(String(p.quantite));
  const [erreur, setErreur] = useState<string | null>(null);
  const [avis, setAvis] = useState<string | null>(null);
  const minuteur = useRef<number | null>(null);
  const enregistree = useRef(p.quantite);

  // Le serveur a recalculé le panier : la quantité enregistrée devient la référence.
  useEffect(() => {
    enregistree.current = p.quantite;
  }, [p.quantite]);

  function signaler(calcul: boolean) {
    window.dispatchEvent(new CustomEvent(EVENEMENT_CALCUL, { detail: calcul }));
  }

  function apres(ok: boolean, message: string) {
    signaler(false);
    if (!ok) return setErreur(message);
    setErreur(null);
    window.dispatchEvent(new Event("ec:panier"));
    router.refresh();
  }

  function enregistrer(q: number) {
    if (minuteur.current) window.clearTimeout(minuteur.current);
    minuteur.current = null;
    if (q === enregistree.current) return signaler(false);
    signaler(true);
    demarrer(async () => {
      let ok = false;
      try {
        ok = await actionModifierLigne(p.id, q);
      } catch {
        ok = false;
      }
      if (ok) enregistree.current = q;
      else setQuantite(String(enregistree.current));
      apres(ok, "La quantité n'a pas pu être enregistrée : le panier revient à la quantité précédente.");
    });
  }

  /** Saisie : prix affiché aussitôt ; enregistrement 300 ms après la dernière frappe (F16, FR-016). */
  function changer(saisie: string) {
    setAvis(null);
    let valeur = saisie;
    const n = Number(saisie);
    if (saisie !== "" && Number.isInteger(n) && n > QUANTITE_MAX) {
      valeur = String(QUANTITE_MAX);
      setAvis(`Quantité limitée à ${QUANTITE_MAX} par ligne.`);
    }
    setQuantite(valeur);
    const q = Number(valeur);
    if (minuteur.current) window.clearTimeout(minuteur.current);
    if (valeur === "" || !Number.isInteger(q) || q < 1) return;
    signaler(true);
    minuteur.current = window.setTimeout(() => enregistrer(q), DELAI_MS);
  }

  const q = Number(quantite);
  const totalAffiche = p.bareme && quantite !== "" && Number.isInteger(q) && q >= 1 ? prixLigne(p.bareme, q) : p.totalHt;

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
        {p.promotionTerminee ? (
          <p className="text-small font-medium text-ink">La promotion « {p.promotionTerminee} » est terminée : le prix en vigueur s’applique.</p>
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
        {avis ? <p role="status" className="text-small font-medium text-ink">{avis}</p> : null}
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
            onChange={(e) => changer(e.target.value)}
            onBlur={() => {
              // Champ laissé vide ou invalide : retour à la quantité enregistrée.
              if (quantite === "" || !Number.isInteger(q) || q < 1) setQuantite(String(enregistree.current));
              else if (minuteur.current) enregistrer(q);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (Number.isInteger(q) && q >= 1) enregistrer(q);
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
        {totalAffiche !== null ? (
          <p data-total-ligne className="min-w-28 text-right font-semibold text-ink">
            {euros(totalAffiche)} HT{p.formule === "mise_a_disposition" ? " / 1er mois" : ""}
          </p>
        ) : null}
      </div>
    </li>
  );
}
