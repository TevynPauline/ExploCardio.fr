"use client";

import { type FormEvent, startTransition, useActionState } from "react";
import { actionAdresses, actionEmail, actionInformations, actionNumero, type EtatFormulaire } from "@/actions/mon-compte";
import { Button } from "../Button";
import { Champ } from "../Champ";
import { ChampsAdresse } from "./ChampsAdresse";

const initial: EtatFormulaire = { statut: "initial", erreurs: {}, saisie: {} };
const classeSelect = "min-h-11 rounded-sm border border-muted bg-surface px-3 text-ink";

/**
 * Envoi sans la remise à zéro automatique des formulaires de React 19 : la saisie en cours reste
 * affichée (et peut être corrigée) pendant et après l'enregistrement.
 */
function sansRemiseAZero(action: (d: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const donnees = new FormData(e.currentTarget);
    startTransition(() => action(donnees));
  };
}

function Message({ etat }: { etat: EtatFormulaire }) {
  if (!etat.message) return null;
  return (
    <p role={etat.statut === "ok" ? "status" : "alert"} className={etat.statut === "ok" ? "ec-box--info p-3" : "ec-box--promo p-3 font-medium"}>
      {etat.message}
    </p>
  );
}

export function FormulaireInformations({ valeurs, specialites }: { valeurs: Record<string, string>; specialites: string[] }) {
  const [etat, action, enCours] = useActionState(actionInformations, initial);
  const v = { ...valeurs, ...etat.saisie };
  const e = etat.erreurs;
  return (
    <form onSubmit={sansRemiseAZero(action)} noValidate className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><Message etat={etat} /></div>
      <div className="flex flex-col gap-1">
        <label htmlFor="civilite" className="text-small font-medium">Civilité</label>
        <select id="civilite" name="civilite" defaultValue={v.civilite} className={classeSelect}>
          {["Dr", "Pr", "Mme", "M."].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="specialite" className="text-small font-medium">Spécialité</label>
        <select id="specialite" name="specialite" defaultValue={v.specialite} aria-invalid={e.specialite ? true : undefined} className={classeSelect}>
          {specialites.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>
      <Champ id="prenom" name="prenom" libelle="Prénom" autoComplete="given-name" defaultValue={v.prenom} erreur={e.prenom} />
      <Champ id="nom" name="nom" libelle="Nom" autoComplete="family-name" defaultValue={v.nom} erreur={e.nom} />
      <Champ id="telephone" name="telephone" type="tel" libelle="Téléphone" autoComplete="tel" defaultValue={v.telephone} erreur={e.telephone} />
      <div className="flex items-end"><Button type="submit" disabled={enCours}>Enregistrer</Button></div>
    </form>
  );
}

export function FormulaireEmail({ actuel }: { actuel: string }) {
  const [etat, action, enCours] = useActionState(actionEmail, initial);
  return (
    <form onSubmit={sansRemiseAZero(action)} noValidate className="flex max-w-md flex-col gap-3">
      <Message etat={etat} />
      <p>Adresse actuelle : <strong className="font-semibold">{actuel}</strong></p>
      <Champ id="nouvelEmail" name="nouvelEmail" type="email" libelle="Nouvelle adresse email" autoComplete="email" defaultValue={etat.saisie.nouvelEmail} erreur={etat.erreurs.nouvelEmail} />
      <div><Button type="submit" variante="secondaire" disabled={enCours}>Changer d’adresse</Button></div>
    </form>
  );
}

export function FormulaireNumero({ libelle, actuel, enAttente }: { libelle: string; actuel: string; enAttente: string | null }) {
  const [etat, action, enCours] = useActionState(actionNumero, initial);
  return (
    <form onSubmit={sansRemiseAZero(action)} noValidate className="flex max-w-md flex-col gap-3">
      <Message etat={etat} />
      <p>{libelle} actuel : <strong className="font-semibold">{actuel}</strong></p>
      {enAttente ? <p className="ec-box--info p-3">Demande en cours de vérification : {enAttente}</p> : null}
      <Champ id="numero" name="numero" libelle={`Nouveau numéro ${libelle}`} inputMode="numeric" defaultValue={etat.saisie.numero} erreur={etat.erreurs.numero} aide="Le changement est vérifié par notre équipe avant d'être appliqué." />
      <div><Button type="submit" variante="secondaire" disabled={enCours}>Demander le changement</Button></div>
    </form>
  );
}

export function FormulaireAdresses({ valeurs }: { valeurs: Record<string, string> }) {
  const [etat, action, enCours] = useActionState(actionAdresses, initial);
  const v = { ...valeurs, ...etat.saisie };
  return (
    <form onSubmit={sansRemiseAZero(action)} noValidate className="flex flex-col gap-6">
      <Message etat={etat} />
      <ChampsAdresse prefixe="cabinet" legende="Adresse du cabinet" valeurs={v} erreurs={etat.erreurs} />
      <ChampsAdresse prefixe="livraison" legende="Adresse de livraison" valeurs={v} erreurs={etat.erreurs} aideCodePostal="Livraison en France métropolitaine (Corse comprise)." />
      <ChampsAdresse prefixe="facturation" legende="Adresse de facturation" valeurs={v} erreurs={etat.erreurs} />
      <div><Button type="submit" disabled={enCours}>Enregistrer les adresses</Button></div>
    </form>
  );
}
