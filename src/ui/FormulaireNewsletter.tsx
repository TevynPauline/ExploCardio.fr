"use client";

import { useActionState } from "react";
import { inscrireNewsletter, type EtatNewsletter } from "@/actions/formulaires";
import { TEXTE_CONSENTEMENT_COURT } from "./textes-newsletter";

/** Inscription à la newsletter (FR-028) : consentement explicite, confirmation par email. */
export function FormulaireNewsletter({ jeton }: { jeton: string }) {
  const [etat, action, enCours] = useActionState<EtatNewsletter, FormData>(inscrireNewsletter, { statut: "initial", email: "" });
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <h2 className="text-h3 font-semibold text-white">Newsletter</h2>
      <input type="hidden" name="jeton" value={jeton} />
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Site web (laissez vide)
          <input type="text" name="site_web" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label htmlFor="newsletter-email" className="text-small font-medium text-white">Votre adresse email</label>
      <input
        id="newsletter-email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={etat.email}
        className="min-h-11 rounded-sm border border-surface bg-surface px-3 text-ink"
      />
      <label className="flex min-h-11 items-start gap-3 text-small text-white">
        <input type="checkbox" name="consentement" value="oui" required className="mt-1 size-5 shrink-0" />
        <span>{TEXTE_CONSENTEMENT_COURT}</span>
      </label>
      <div>
        <button type="submit" disabled={enCours} className="ec-btn ec-btn--secondary border-surface bg-surface text-ink">
          {enCours ? "Envoi…" : "M’inscrire"}
        </button>
      </div>
      <p role="status" className="text-small text-white">
        {etat.statut === "envoye"
          ? "Merci. Si cette adresse n’est pas encore inscrite, vous allez recevoir un email : cliquez sur le lien pour confirmer votre inscription."
          : etat.message ?? ""}
      </p>
    </form>
  );
}
