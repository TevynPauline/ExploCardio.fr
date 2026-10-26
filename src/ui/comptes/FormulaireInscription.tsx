"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { actionInscription, type EtatInscription } from "@/actions/comptes";
import { Button } from "../Button";
import { Champ } from "../Champ";
import { MESSAGE_HORS_METROPOLE } from "@/domaine/comptes/adresses";
import { ChampsAdresse, ContactHorsMetropole } from "./ChampsAdresse";
import { ReglesMotDePasse } from "./ReglesMotDePasse";

type Props = { specialites: string[]; offreBienvenue: string | null; jeton: string; retour?: string | null; numeroObligatoire?: boolean };

const classeSelect = "min-h-11 rounded-sm border border-muted bg-surface px-3 text-ink";

/** Formulaire d'inscription (US1, FR-001 à FR-009) : erreurs sur les champs, saisie conservée. */
export function FormulaireInscription({ specialites, offreBienvenue, jeton, retour = null, numeroObligatoire = false }: Props) {
  const [etat, action, enCours] = useActionState<EtatInscription, FormData>(actionInscription, { erreurs: {}, saisie: {} });
  const s = etat.saisie;
  const e = etat.erreurs;
  const [livraisonIdentique, setLivraisonIdentique] = useState(s.livraisonIdentique ? s.livraisonIdentique === "oui" : true);
  const [facturationIdentique, setFacturationIdentique] = useState(s.facturationIdentique ? s.facturationIdentique === "oui" : true);
  const [motDePasse, setMotDePasse] = useState("");
  const resume = useRef<HTMLDivElement>(null);
  const nbErreurs = Object.keys(e).length;

  useEffect(() => {
    if (nbErreurs || etat.message) resume.current?.focus();
  }, [etat, nbErreurs]);

  return (
    <form action={action} noValidate className="flex flex-col gap-8">
      <input type="hidden" name="jeton" value={jeton} />
      {retour ? <input type="hidden" name="retour" value={retour} /> : null}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Site web (laissez vide)
          <input type="text" name="site_web" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {nbErreurs || etat.message ? (
        <div ref={resume} tabIndex={-1} role="alert" className="ec-box--promo p-4 font-medium">
          {etat.message ?? `Votre compte n'a pas été créé : ${nbErreurs} champ${nbErreurs > 1 ? "s sont" : " est"} à corriger.`}
        </div>
      ) : null}

      {offreBienvenue ? (
        <p className="ec-box--promo p-4">
          <strong className="font-semibold">Offre de bienvenue : </strong>
          {offreBienvenue}
        </p>
      ) : null}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-h3 font-semibold">Vous</legend>
        <div className="flex flex-col gap-1">
          <label htmlFor="civilite" className="text-small font-medium text-ink">Civilité</label>
          <select id="civilite" name="civilite" defaultValue={s.civilite ?? ""} aria-invalid={e.civilite ? true : undefined} aria-describedby={e.civilite ? "civilite-erreur" : undefined} className={classeSelect}>
            <option value="">Choisissez</option>
            {["Dr", "Pr", "Mme", "M."].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {e.civilite ? <p id="civilite-erreur" className="text-small font-medium text-ink">{e.civilite}</p> : null}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="specialite" className="text-small font-medium text-ink">Spécialité</label>
          <select id="specialite" name="specialite" defaultValue={s.specialite ?? ""} aria-invalid={e.specialite ? true : undefined} aria-describedby={e.specialite ? "specialite-erreur" : undefined} className={classeSelect}>
            <option value="">Choisissez</option>
            {specialites.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          {e.specialite ? <p id="specialite-erreur" className="text-small font-medium text-ink">{e.specialite}</p> : null}
        </div>
        <Champ id="prenom" name="prenom" libelle="Prénom" autoComplete="given-name" defaultValue={s.prenom} erreur={e.prenom} />
        <Champ id="nom" name="nom" libelle="Nom" autoComplete="family-name" defaultValue={s.nom} erreur={e.nom} />
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-h3 font-semibold">Votre exercice</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ
            id="numero"
            name="numero"
            libelle={numeroObligatoire ? "SIRET ou SIREN" : "SIRET ou SIREN (facultatif)"}
            aide={numeroObligatoire ? "14 ou 9 chiffres." : "14 ou 9 chiffres. Sinon, il vous sera demandé à votre première commande."}
            inputMode="numeric"
            defaultValue={s.numero}
            erreur={e.numero}
          />
          <Champ id="cabinet" name="cabinet" libelle="Nom du cabinet ou de la structure" autoComplete="organization" defaultValue={s.cabinet} erreur={e.cabinet} />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-h3 font-semibold">Coordonnées</legend>
        <Champ id="email" name="email" type="email" libelle="Email professionnel" autoComplete="email" defaultValue={s.email} erreur={e.email} />
        <Champ id="telephone" name="telephone" type="tel" libelle="Téléphone" autoComplete="tel" defaultValue={s.telephone} erreur={e.telephone} />
      </fieldset>

      <div className="flex flex-col gap-6">
        <h2 className="text-h3 font-semibold">Adresses</h2>
        <ChampsAdresse prefixe="adresseCabinet" legende="Adresse du cabinet" valeurs={s} erreurs={e} pays={livraisonIdentique} />
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="livraisonIdentique" value="oui" checked={livraisonIdentique} onChange={(ev) => setLivraisonIdentique(ev.target.checked)} className="size-5" />
          Adresse de livraison identique à celle du cabinet
        </label>
        {(e["adresseLivraison.codePostal"] || e["adresseLivraison.pays"]) && livraisonIdentique ? (
          <>
            <p className="text-small font-medium text-ink">{e["adresseLivraison.codePostal"] ?? e["adresseLivraison.pays"]}</p>
            {(e["adresseLivraison.codePostal"] ?? e["adresseLivraison.pays"]) === MESSAGE_HORS_METROPOLE ? <ContactHorsMetropole /> : null}
          </>
        ) : null}
        {!livraisonIdentique ? (
          <ChampsAdresse prefixe="adresseLivraison" legende="Adresse de livraison" valeurs={s} erreurs={e} aideCodePostal="Livraison en France métropolitaine (Corse comprise)." pays />
        ) : null}
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="facturationIdentique" value="oui" checked={facturationIdentique} onChange={(ev) => setFacturationIdentique(ev.target.checked)} className="size-5" />
          Adresse de facturation identique à celle du cabinet
        </label>
        {!facturationIdentique ? <ChampsAdresse prefixe="adresseFacturation" legende="Adresse de facturation" valeurs={s} erreurs={e} /> : null}
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-h3 font-semibold">Mot de passe</legend>
        <Champ
          id="motDePasse"
          name="motDePasse"
          type="password"
          libelle="Mot de passe"
          autoComplete="new-password"
          value={motDePasse}
          onChange={(ev) => setMotDePasse(ev.target.value)}
          aria-describedby="regles-mdp"
          erreur={e.motDePasse}
        />
        <ReglesMotDePasse id="regles-mdp" motDePasse={motDePasse} />
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-h3 font-semibold">Vos choix</legend>
        <label className="flex min-h-11 items-start gap-3">
          <input type="checkbox" name="cguCgv" value="oui" defaultChecked={s.cguCgv === "oui"} aria-invalid={e.cguCgv ? true : undefined} aria-describedby={e.cguCgv ? "cgu-erreur" : undefined} className="mt-1 size-5 shrink-0" />
          <span>
            J’ai lu et j’accepte les <Link href="/cgu">conditions générales d’utilisation</Link> et les{" "}
            <Link href="/cgv">conditions générales de vente</Link> (obligatoire).
          </span>
        </label>
        {e.cguCgv ? <p id="cgu-erreur" className="text-small font-medium text-ink">{e.cguCgv}</p> : null}
        <label className="flex min-h-11 items-start gap-3">
          <input type="checkbox" name="newsletter" value="oui" defaultChecked={s.newsletter === "oui"} className="mt-1 size-5 shrink-0" />
          <span>Je souhaite recevoir la newsletter d’ExploCardio.fr (nouveautés, offres). Je peux me désinscrire à tout moment.</span>
        </label>
      </fieldset>

      <p className="text-small text-muted">
        Vos données servent à gérer votre compte, vos commandes et, si vous l’acceptez, à vous envoyer la newsletter.
        Elles ne concernent que vous : n’indiquez aucune donnée relative à vos patients. Voir notre{" "}
        <Link href="/confidentialite">politique de confidentialité</Link>.
      </p>

      <div>
        <Button type="submit" disabled={enCours}>{enCours ? "Création…" : "Créer mon compte"}</Button>
      </div>
    </form>
  );
}
