"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { actionDemandeFinancement, type EtatDemande } from "@/actions/financement";
import { euros } from "@/lib/montants";
import { Champ } from "../Champ";

type Equipement = { defaultCode: string; nom: string; quantite: number; mensualites: { dureeMois: number; montantHt: number }[] };

type Props = {
  source: "panier" | "fiche";
  equipements: Equipement[];
  durees: number[];
  mention: string;
  cabinet: { nom: string; siret: string; adresse: string };
  telephone: string;
};

const pilule =
  "flex min-h-11 cursor-pointer items-center gap-2 rounded-pill border border-line bg-surface px-4 has-[:checked]:border-action has-[:checked]:bg-pale has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-action";

/** Formulaire « Demander mon financement » (FR-034) : prérempli, mensualité indicative recalculée. */
export function FormulaireFinancement({ source, equipements, durees, mention, cabinet, telephone }: Props) {
  const [etat, action, enCours] = useActionState(actionDemandeFinancement, { erreurs: {} } as EtatDemande);
  const s = etat.saisie ?? {};
  const [quantites, setQuantites] = useState<Record<string, number>>(Object.fromEntries(equipements.map((e) => [e.defaultCode, e.quantite])));
  const [duree, setDuree] = useState<number>(Number(s.duree) || durees[durees.length - 1] || 0);
  const total = equipements.reduce<number | null>((acc, e) => {
    const m = e.mensualites.find((x) => x.dureeMois === duree);
    if (acc === null || !m) return null;
    return acc + m.montantHt * (quantites[e.defaultCode] ?? 0);
  }, 0);
  function envoyer(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const d = new FormData(ev.currentTarget);
    startTransition(() => action(d));
  }
  return (
    <form onSubmit={envoyer} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="source" value={source} />
      {etat.message ? <p role="alert" className="ec-box--promo p-3 font-medium">{etat.message}</p> : null}

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-semibold text-ink">Équipements à financer</legend>
        {etat.erreurs.equipements ? <p className="text-small font-medium text-ink">{etat.erreurs.equipements}</p> : null}
        <ul className="flex list-none flex-col gap-2 p-0">
          {equipements.map((e) => (
            <li key={e.defaultCode} className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
              <span className="text-ink">{e.nom}</span>
              <div className="w-28">
                <Champ
                  id={`quantite-${e.defaultCode}`}
                  name={`quantite.${e.defaultCode}`}
                  libelle={`Quantité (${e.nom})`}
                  type="number"
                  min={0}
                  max={50}
                  value={quantites[e.defaultCode] ?? 0}
                  onChange={(ev) => setQuantites({ ...quantites, [e.defaultCode]: Math.max(0, Number(ev.target.value) || 0) })}
                />
              </div>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-semibold text-ink">Durée souhaitée</legend>
        {etat.erreurs.duree ? <p className="text-small font-medium text-ink">{etat.erreurs.duree}</p> : null}
        <div className="flex flex-wrap gap-2">
          {durees.map((d) => (
            <label key={d} className={pilule}>
              <input type="radio" name="duree" value={d} checked={duree === d} onChange={() => setDuree(d)} className="size-5" />
              {d} mois
            </label>
          ))}
        </div>
        <p aria-live="polite" className="ec-box--info p-3">
          {total !== null && total > 0 ? (
            <>
              Mensualité indicative : <strong className="text-ink">{euros(total)} HT / mois</strong> sur {duree} mois.{" "}
            </>
          ) : null}
          <span className="text-small">{mention}</span>
        </p>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 font-semibold text-ink">Votre cabinet</legend>
        <Champ id="cabinet" name="cabinet" libelle="Nom du cabinet" autoComplete="organization" defaultValue={s.cabinet ?? cabinet.nom} erreur={etat.erreurs.cabinet} />
        <Champ id="siret" name="siret" libelle="SIRET (facultatif)" inputMode="numeric" defaultValue={s.siret ?? cabinet.siret} erreur={etat.erreurs.siret} />
        <div className="sm:col-span-2">
          <Champ id="adresse" name="adresse" libelle="Adresse du cabinet" autoComplete="street-address" defaultValue={s.adresse ?? cabinet.adresse} erreur={etat.erreurs.adresse} />
        </div>
        <Champ id="praticiens" name="praticiens" libelle="Nombre de praticiens (facultatif)" type="number" min={1} max={200} defaultValue={s.praticiens ?? ""} erreur={etat.erreurs.praticiens} />
        <Champ id="telephone" name="telephone" libelle="Téléphone (facultatif)" type="tel" autoComplete="tel" defaultValue={s.telephone ?? telephone} erreur={etat.erreurs.telephone} />
      </fieldset>

      <p className="text-small text-muted">Aucun paiement en ligne : nous étudions votre demande et revenons vers vous.</p>
      <div>
        <button type="submit" disabled={enCours} className="ec-btn ec-btn--primary">{enCours ? "Envoi…" : "Envoyer ma demande"}</button>
      </div>
    </form>
  );
}
