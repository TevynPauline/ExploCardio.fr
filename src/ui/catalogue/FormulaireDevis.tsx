"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import { actionDemandeDevis, type EtatDevis } from "@/actions/devis";
import { Button } from "../Button";
import { Champ } from "../Champ";

type Prerempli = { nom: string; email: string; telephone: string; cabinet: string };

/** « Vous cherchez un autre modèle ? » (F03, US7) : saisie conservée en cas d'erreur. */
export function FormulaireDevis({ jeton, prerempli }: { jeton: string; prerempli: Prerempli }) {
  const initial: EtatDevis = { statut: "initial", erreurs: {}, saisie: { besoin: "", message: "", ...prerempli } };
  const [etat, action, enCours] = useActionState(actionDemandeDevis, initial);
  const message = useRef<HTMLParagraphElement>(null);
  const e = etat.erreurs;

  useEffect(() => {
    if (etat.statut !== "initial") message.current?.focus();
  }, [etat]);

  function envoyer(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const donnees = new FormData(ev.currentTarget);
    startTransition(() => action(donnees));
  }

  return (
    <form onSubmit={envoyer} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="jeton" value={jeton} />
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Site web (laissez vide)
          <input type="text" name="site_web" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {etat.statut !== "initial" ? (
        <p ref={message} tabIndex={-1} role={etat.statut === "envoye" ? "status" : "alert"} className={etat.statut === "envoye" ? "ec-box--info p-4" : "ec-box--promo p-4 font-medium"}>
          {etat.statut === "envoye" && "Merci, votre demande est transmise. Nous vous envoyons un devis rapidement."}
          {etat.statut === "erreurs" && "Votre demande n'a pas été envoyée : corrigez les champs signalés."}
          {etat.statut === "limite" && "Vous avez envoyé plusieurs demandes récemment. Réessayez dans une heure."}
          {etat.statut === "refuse" && "Votre demande n'a pas pu être envoyée. Patientez quelques secondes puis réessayez."}
        </p>
      ) : null}
      <Champ id="besoin" name="besoin" libelle="Modèle recherché ou besoin" required defaultValue={etat.saisie.besoin} erreur={e.besoin} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Champ id="devis-nom" name="nom" libelle="Nom" autoComplete="name" required defaultValue={etat.saisie.nom} erreur={e.nom} />
        <Champ id="devis-email" name="email" type="email" libelle="Email" autoComplete="email" required defaultValue={etat.saisie.email} erreur={e.email} />
        <Champ id="devis-telephone" name="telephone" type="tel" libelle="Téléphone (facultatif)" autoComplete="tel" defaultValue={etat.saisie.telephone} erreur={e.telephone} />
        <Champ id="devis-cabinet" name="cabinet" libelle="Cabinet (facultatif)" autoComplete="organization" defaultValue={etat.saisie.cabinet} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="devis-message" className="text-small font-medium text-ink">Précisions (facultatif)</label>
        <p id="devis-message-aide" className="text-small text-muted">N’indiquez aucune donnée concernant vos patients.</p>
        <textarea
          id="devis-message"
          name="message"
          rows={4}
          defaultValue={etat.saisie.message}
          aria-invalid={e.message ? true : undefined}
          aria-describedby={["devis-message-aide", e.message ? "devis-message-erreur" : null].filter(Boolean).join(" ")}
          className="w-full min-w-0 rounded-sm border border-muted bg-surface p-3 text-ink"
        />
        {e.message ? <p id="devis-message-erreur" className="text-small font-medium text-ink">{e.message}</p> : null}
      </div>
      <p className="text-small text-muted">
        Vos coordonnées servent uniquement à vous répondre. Voir notre <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>
      <div>
        <Button type="submit" disabled={enCours}>{enCours ? "Envoi…" : "Demander un devis"}</Button>
      </div>
    </form>
  );
}
