"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { envoyerContact, type EtatContact } from "@/actions/formulaires";
import { Button } from "./Button";
import { Champ } from "./Champ";

type Props = { motifs: string[]; motifInitial: string | null; jeton: string; liensWhatsapp: { appeler: string; ecrire: string } };

const champsVides = { motif: "", nom: "", email: "", telephone: "", cabinet: "", message: "" };

/**
 * Formulaire de contact (FR-030 à FR-032) : erreurs reliées aux champs et annoncées, saisie
 * conservée, avertissement « aucune donnée de patient », champ piège invisible.
 * Motif « Assistance » : boutons WhatsApp au-dessus (le SAV n'est pas géré par le site).
 */
export function FormulaireContact({ motifs, motifInitial, jeton, liensWhatsapp }: Props) {
  const initial: EtatContact = { statut: "initial", erreurs: {}, saisie: { ...champsVides, motif: motifInitial ?? "" } };
  const [etat, action, enCours] = useActionState(envoyerContact, initial);
  const [motif, setMotif] = useState(etat.saisie.motif);
  const message = useRef<HTMLParagraphElement>(null);
  const e = etat.erreurs;

  useEffect(() => {
    if (etat.statut !== "initial") message.current?.focus();
  }, [etat]);

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="jeton" value={jeton} />
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Site web (laissez vide)
          <input type="text" name="site_web" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {etat.statut !== "initial" ? (
        <p ref={message} tabIndex={-1} role={etat.statut === "envoye" ? "status" : "alert"} className={etat.statut === "envoye" ? "ec-box--info p-4" : "ec-box--promo p-4 font-medium"}>
          {etat.statut === "envoye" && "Merci, votre message a bien été envoyé. Notre équipe vous répond rapidement."}
          {etat.statut === "erreurs" && "Votre message n'a pas été envoyé : corrigez les champs signalés."}
          {etat.statut === "limite" && "Vous avez envoyé plusieurs messages récemment. Réessayez dans une heure ou écrivez-nous sur WhatsApp."}
          {etat.statut === "refuse" && "Votre message n'a pas pu être envoyé. Patientez quelques secondes puis réessayez."}
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <label htmlFor="motif" className="text-small font-medium text-ink">Motif</label>
        <select
          id="motif"
          name="motif"
          value={motif}
          onChange={(ev) => setMotif(ev.target.value)}
          aria-invalid={e.motif ? true : undefined}
          aria-describedby={e.motif ? "motif-erreur" : undefined}
          className="min-h-11 w-full min-w-0 rounded-sm border border-muted bg-surface px-3 text-ink"
        >
          <option value="">Choisissez un motif</option>
          {motifs.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {e.motif ? <p id="motif-erreur" className="text-small font-medium text-ink">{e.motif}</p> : null}
      </div>

      {motif === "Assistance" ? (
        <div className="ec-box--info flex flex-col gap-3 p-4">
          <p>Pour une assistance rapide, appelez-nous ou écrivez-nous sur WhatsApp.</p>
          <div className="flex flex-wrap gap-2">
            <a href={liensWhatsapp.appeler} className="ec-btn ec-btn--primary">Appeler</a>
            <a href={liensWhatsapp.ecrire} className="ec-btn ec-btn--secondary">Écrire sur WhatsApp</a>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Champ id="nom" name="nom" libelle="Nom" autoComplete="name" required defaultValue={etat.saisie.nom} erreur={e.nom} />
        <Champ id="email" name="email" type="email" libelle="Email" autoComplete="email" required defaultValue={etat.saisie.email} erreur={e.email} />
        <Champ id="telephone" name="telephone" type="tel" libelle="Téléphone (facultatif)" autoComplete="tel" defaultValue={etat.saisie.telephone} erreur={e.telephone} />
        <Champ id="cabinet" name="cabinet" libelle="Cabinet (facultatif)" autoComplete="organization" defaultValue={etat.saisie.cabinet} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="message" className="text-small font-medium text-ink">Message</label>
        <p id="message-aide" className="text-small text-muted">
          N’indiquez aucune donnée concernant vos patients.
        </p>
        <textarea
          id="message"
          name="message"
          rows={6}
          required
          defaultValue={etat.saisie.message}
          aria-invalid={e.message ? true : undefined}
          aria-describedby={["message-aide", e.message ? "message-erreur" : null].filter(Boolean).join(" ")}
          className="w-full min-w-0 rounded-sm border border-muted bg-surface p-3 text-ink"
        />
        {e.message ? <p id="message-erreur" className="text-small font-medium text-ink">{e.message}</p> : null}
      </div>

      <p className="text-small text-muted">
        Vos coordonnées servent uniquement à vous répondre. Voir notre{" "}
        <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>
      <div>
        <Button type="submit" disabled={enCours}>{enCours ? "Envoi…" : "Envoyer"}</Button>
      </div>
    </form>
  );
}
