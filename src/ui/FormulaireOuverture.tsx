"use client";

import { useActionState, useEffect, useRef } from "react";
import { inscrireOuvertureAction, type EtatOuverture } from "@/actions/ouverture";
import { Button } from "./Button";
import { Champ } from "./Champ";

const initial: EtatOuverture = { statut: "initial", erreurs: {}, saisie: { nom: "", email: "", telephone: "", commentaire: "" } };

/**
 * Page d'attente (F17) : nom et email obligatoires, téléphone et commentaire facultatifs,
 * consentement explicite. Après un envoi, le formulaire est vidé pour la personne suivante et
 * un message le confirme.
 */
export function FormulaireOuverture({ jeton, texteConsentement }: { jeton: string; texteConsentement: string }) {
  const [etat, action, enCours] = useActionState(inscrireOuvertureAction, initial);
  const message = useRef<HTMLParagraphElement>(null);
  const e = etat.erreurs;

  useEffect(() => {
    if (etat.statut !== "initial") message.current?.focus();
  }, [etat]);

  return (
    // La clé recrée les champs après chaque réponse : saisie conservée en cas d'erreur, vidée après une inscription.
    <form key={JSON.stringify(etat)} action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="jeton" value={jeton} />
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Site web (laissez vide)
          <input type="text" name="site_web" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {etat.statut !== "initial" ? (
        <p ref={message} tabIndex={-1} role={etat.statut === "inscrit" ? "status" : "alert"} className={etat.statut === "inscrit" ? "ec-box--info p-4" : "ec-box--promo p-4 font-medium"}>
          {etat.statut === "inscrit" && "Message bien envoyé, nous revenons vers vous rapidement."}
          {etat.statut === "erreurs" && "Votre message n’a pas été envoyé : corrigez les champs signalés."}
          {etat.statut === "limite" && "Trop d’envois depuis cet appareil. Réessayez dans une heure."}
          {etat.statut === "refuse" && "Votre message n’a pas pu être envoyé. Patientez quelques secondes puis réessayez."}
        </p>
      ) : null}

      <Champ id="ouverture-nom" name="nom" libelle="Nom et prénom" autoComplete="name" required maxLength={120} defaultValue={etat.saisie.nom} erreur={e.nom} />
      <Champ id="ouverture-email" name="email" type="email" libelle="Adresse email" autoComplete="email" required defaultValue={etat.saisie.email} erreur={e.email} />
      <Champ id="ouverture-telephone" name="telephone" type="tel" libelle="Numéro de téléphone (facultatif)" autoComplete="tel" defaultValue={etat.saisie.telephone} erreur={e.telephone} />

      <div className="flex flex-col gap-1">
        <label htmlFor="ouverture-commentaire" className="text-small font-medium text-ink">Commentaires (facultatif)</label>
        <p id="ouverture-commentaire-aide" className="text-small text-muted">N’indiquez aucune donnée concernant vos patients.</p>
        <textarea
          id="ouverture-commentaire"
          name="commentaire"
          rows={4}
          maxLength={2000}
          defaultValue={etat.saisie.commentaire}
          aria-invalid={e.commentaire ? true : undefined}
          aria-describedby={["ouverture-commentaire-aide", e.commentaire ? "ouverture-commentaire-erreur" : null].filter(Boolean).join(" ")}
          className="w-full min-w-0 rounded-sm border border-muted bg-surface p-3 text-ink focus-visible:border-action focus-visible:outline-2 focus-visible:outline-action"
        />
        {e.commentaire ? (
          <p id="ouverture-commentaire-erreur" role="alert" className="text-small font-medium text-ink">
            {e.commentaire}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex min-h-11 items-start gap-3 text-small text-ink">
          <input
            type="checkbox"
            name="consentement"
            value="oui"
            required
            aria-invalid={e.consentement ? true : undefined}
            aria-describedby={e.consentement ? "ouverture-consentement-erreur" : undefined}
            className="mt-1 size-5 shrink-0"
          />
          <span>{texteConsentement}</span>
        </label>
        {e.consentement ? (
          <p id="ouverture-consentement-erreur" role="alert" className="text-small font-medium text-ink">
            {e.consentement}
          </p>
        ) : null}
      </div>

      <div>
        <Button type="submit" disabled={enCours}>
          {enCours ? "Envoi…" : "Envoyer"}
        </Button>
      </div>
    </form>
  );
}
