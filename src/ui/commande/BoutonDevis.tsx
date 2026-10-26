"use client";

import Link from "next/link";
import { useActionState } from "react";
import { actionRecevoirDevis, type EtatDevisPanier } from "@/actions/devis-panier";

// « Recevoir un devis » depuis le panier (F16, US6, FR-018, FR-019) : le devis est créé dans
// Odoo, téléchargeable aussitôt et envoyé par email. Le panier n'est pas modifié.

export function BoutonDevis({ connecte }: { connecte: boolean }) {
  const [etat, envoyer, enCours] = useActionState<EtatDevisPanier, FormData>(actionRecevoirDevis, { statut: "initial" });
  if (!connecte) {
    return (
      <Link href="/connexion?retour=%2Fpanier" className="ec-btn ec-btn--secondary">
        Se connecter pour recevoir un devis
      </Link>
    );
  }
  return (
    // Bouton dans la rangée d'actions du panier ; le résultat passe sur sa propre ligne, en dessous.
    <div className="contents">
      <form action={envoyer}>
        <button type="submit" className="ec-btn ec-btn--secondary" disabled={enCours} aria-describedby={etat.statut !== "initial" ? "resultat-devis" : undefined}>
          {enCours ? "Création du devis…" : "Recevoir un devis"}
        </button>
      </form>
      <div id="resultat-devis" role="status" aria-live="polite" className="order-last w-full empty:hidden">
        {etat.statut === "cree" ? (
          <p className="ec-box--info flex flex-col gap-2 p-4">
            <span>Votre devis {etat.ref} est prêt. Nous vous l’avons aussi envoyé par email.</span>
            <span className="flex flex-wrap gap-x-4">
              <a href={`/mon-compte/devis/${encodeURIComponent(etat.ref)}/pdf`} className="inline-flex min-h-11 items-center font-medium">
                Télécharger le devis (PDF)
              </a>
              <Link href="/mon-compte/devis" className="inline-flex min-h-11 items-center">Mes devis</Link>
            </span>
          </p>
        ) : null}
        {etat.statut === "refuse" ? (
          <p className="ec-box--info flex flex-col gap-2 p-4">
            <span>{etat.message}</span>
            {etat.motif === "hors_metropole" || etat.motif === "odoo" ? (
              <Link href={etat.motif === "hors_metropole" ? "/qui-sommes-nous?motif=hors-metropole#contact" : "/qui-sommes-nous#contact"} className="inline-flex min-h-11 items-center font-medium">
                Nous contacter
              </Link>
            ) : null}
            {etat.motif === "adresse" ? (
              <Link href="/mon-compte/adresses" className="inline-flex min-h-11 items-center font-medium">Indiquer mon adresse</Link>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
