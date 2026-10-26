"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { actionAdresses, type EtatEtape } from "@/actions/commande";
import { Champ } from "../Champ";
import { ChampsAdresse } from "../comptes/ChampsAdresse";

/** Étape « Adresses » (FR-009) : préremplies, modifiables ; la saisie reste affichée en cas d'erreur. */
export function FormulaireAdresses({ refCommande, valeurs, identique, demanderNumero = false }: { refCommande: string; valeurs: Record<string, string>; identique: boolean; demanderNumero?: boolean }) {
  const [etat, action, enCours] = useActionState(actionAdresses, { erreurs: {} } as EtatEtape);
  const [meme, setMeme] = useState(identique);
  const v = { ...valeurs, ...(etat.saisie ?? {}) };
  function envoyer(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const d = new FormData(ev.currentTarget);
    startTransition(() => action(d));
  }
  return (
    <form onSubmit={envoyer} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="ref" value={refCommande} />
      {etat.message ? <p role="alert" className="ec-box--promo p-3 font-medium">{etat.message}</p> : null}
      {demanderNumero ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-h3 font-semibold">Numéro d’entreprise</legend>
          <input type="hidden" name="numeroDemande" value="oui" />
          <Champ
            id="numero"
            name="numero"
            libelle="SIRET ou SIREN de votre cabinet"
            inputMode="numeric"
            defaultValue={v.numero}
            erreur={etat.erreurs.numero}
            aide="14 ou 9 chiffres, indiqués sur vos factures. Demandé une seule fois ; notre équipe le vérifie ensuite."
          />
        </fieldset>
      ) : null}
      <ChampsAdresse prefixe="livraison" legende="Adresse de livraison" valeurs={v} erreurs={etat.erreurs} aideCodePostal="Livraison en France métropolitaine (Corse comprise)." pays />
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" name="identique" value="oui" checked={meme} onChange={(e) => setMeme(e.target.checked)} className="size-5" />
        Adresse de facturation identique
      </label>
      {meme ? null : <ChampsAdresse prefixe="facturation" legende="Adresse de facturation" valeurs={v} erreurs={etat.erreurs} />}
      <div>
        <button type="submit" disabled={enCours} className="ec-btn ec-btn--primary">{enCours ? "Enregistrement…" : "Continuer"}</button>
      </div>
    </form>
  );
}
