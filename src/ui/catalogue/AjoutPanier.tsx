"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { actionAjouterAuPanier } from "@/actions/panier";
import { euros } from "@/lib/montants";
import { cx } from "../cx";

type Props = {
  defaultCode: string;
  formule?: "achat" | "mise_a_disposition";
  quantite?: number;
  prixAffiche?: number;
  libelle?: string;
  variante?: "principal" | "secondaire";
  className?: string;
};

/**
 * Ajout au panier sans quitter la page (FR-019, FR-024, US3-3) : confirmation annoncée
 * (`role="status"`), refus expliqué, prix changé signalé (cas limite de la spec).
 */
export function AjoutPanier({ defaultCode, formule = "achat", quantite = 1, prixAffiche, libelle = "Ajouter au panier", variante = "principal", className }: Props) {
  const [enCours, demarrer] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  function ajouter() {
    setMessage(null);
    demarrer(async () => {
      const r = await actionAjouterAuPanier({ defaultCode, formule, quantite, prixAffiche });
      if (!r.ok) return setMessage({ ok: false, texte: r.message });
      const morceaux = [`Ajouté au panier${quantite > 1 ? ` (${quantite})` : ""}.`];
      if (r.prixAChange) morceaux.push(`Le prix a changé : ${euros(r.prixHt)} HT.`);
      if (r.delaiJours) morceaux.push(`Délai : ${r.delaiJours} jours.`);
      setMessage({ ok: true, texte: morceaux.join(" ") });
    });
  }

  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={ajouter}
        disabled={enCours}
        className={cx("ec-btn self-start", variante === "principal" ? "ec-btn--primary" : "ec-btn--secondary")}
      >
        {enCours ? "Ajout en cours…" : libelle}
      </button>
      <p role="status" aria-live="polite" className={cx("text-small", message ? "" : "sr-only")}>
        {message ? (
          <>
            {message.texte} {message.ok ? <Link href="/panier">Voir le panier</Link> : null}
          </>
        ) : null}
      </p>
    </div>
  );
}
