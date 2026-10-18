"use client";

import Link from "next/link";
import { startTransition, useActionState, type FormEvent } from "react";
import { actionPayer, type EtatEtape } from "@/actions/commande";

/** Validation du récapitulatif (FR-012) : CGV acceptées explicitement ; un seul envoi. */
export function FormulairePayer({ refCommande, libelle }: { refCommande: string; libelle: string }) {
  const [etat, action, enCours] = useActionState(actionPayer, { erreurs: {} } as EtatEtape);
  function envoyer(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (enCours) return;
    const d = new FormData(ev.currentTarget);
    startTransition(() => action(d));
  }
  return (
    <form onSubmit={envoyer} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="ref" value={refCommande} />
      <label className="flex min-h-11 items-start gap-3">
        <input type="checkbox" name="cgv" value="oui" aria-describedby={etat.erreurs.cgv ? "erreur-cgv" : undefined} aria-invalid={etat.erreurs.cgv ? true : undefined} className="mt-1 size-5 shrink-0" />
        <span>
          J’accepte les <Link href="/cgv" target="_blank">conditions générales de vente</Link>.
        </span>
      </label>
      {etat.erreurs.cgv ? <p id="erreur-cgv" role="alert" className="text-small font-medium text-ink">{etat.erreurs.cgv}</p> : null}
      <div>
        <button type="submit" disabled={enCours} className="ec-btn ec-btn--primary">{enCours ? "Redirection vers le paiement…" : libelle}</button>
      </div>
    </form>
  );
}
