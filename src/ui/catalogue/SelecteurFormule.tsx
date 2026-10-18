"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { VarianteFiche } from "@/domaine/catalogue/fiches";
import { SLUG_FORMULE, type FormuleFiche } from "@/domaine/catalogue/formules";
import { euros } from "@/lib/montants";
import { AjoutPanier } from "./AjoutPanier";
import { Disponibilite } from "./Disponibilite";
import { Prix } from "./Prix";

// Sélecteur de formule de la fiche équipement (F03, US2, FR-011 à FR-017) : le choix de la
// formule et de la configuration met à jour prix, contenu, disponibilité et bouton dans le
// navigateur, sans requête (SC-002), annoncé aux lecteurs d'écran ; l'adresse garde le choix
// pour pouvoir être partagée (US2-8).

const LIBELLE_FORMULE: Record<FormuleFiche, string> = {
  achat: "Acheter",
  mise_a_disposition: "Mise à disposition mensuelle (sans engagement)",
  financement: "Financement longue durée",
};

type Props = {
  nom: string;
  formules: FormuleFiche[];
  variantes: VarianteFiche[];
  contenuPackMad: string | null;
  mentionFinancement: string;
  formuleInitiale: FormuleFiche | null;
  configInitiale: string | null;
};

const classePilule =
  "flex min-h-11 cursor-pointer items-center rounded-pill border border-line bg-surface px-4 text-ink has-[:checked]:border-action has-[:checked]:bg-pale has-[:checked]:font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-action";

function contact(motif: string) {
  return `/qui-sommes-nous?motif=${encodeURIComponent(motif)}#contact`;
}

export function SelecteurFormule({ nom, formules, variantes, contenuPackMad, mentionFinancement, formuleInitiale, configInitiale }: Props) {
  const [formule, setFormule] = useState<FormuleFiche>(formuleInitiale && formules.includes(formuleInitiale) ? formuleInitiale : formules[0]!);
  // Sans offre de mise à disposition détaillée (logiciel Cloud), la formule mensuelle est un
  // abonnement au prix de l'article.
  const abonnement = !variantes.some((v) => v.offreMad);
  const possibles = useMemo(
    () => (formule === "mise_a_disposition" && !abonnement ? variantes.filter((v) => v.offreMad) : variantes),
    [formule, variantes, abonnement],
  );
  const [config, setConfig] = useState<string>(
    possibles.some((v) => v.defaultCode === configInitiale) ? configInitiale! : possibles[0]!.defaultCode,
  );
  const variante = possibles.find((v) => v.defaultCode === config) ?? possibles[0]!;

  // Adresse partageable : ?formule=…&config=…
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("formule", SLUG_FORMULE[formule]);
    if (possibles.length > 1) url.searchParams.set("config", variante.defaultCode);
    else url.searchParams.delete("config");
    window.history.replaceState(window.history.state, "", url);
  }, [formule, variante.defaultCode, possibles.length]);

  function choisirFormule(f: FormuleFiche) {
    setFormule(f);
    const liste = f === "mise_a_disposition" && !abonnement ? variantes.filter((v) => v.offreMad) : variantes;
    if (!liste.some((v) => v.defaultCode === config)) setConfig(liste[0]!.defaultCode);
  }

  const dispo = formule === "mise_a_disposition" ? variante.miseADisposition : variante.achat;

  return (
    <div className="flex flex-col gap-5">
      {formules.length > 1 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-semibold text-ink">Votre formule</legend>
          <div className="flex flex-wrap gap-2">
            {formules.map((f) => (
              <label key={f} className={classePilule}>
                <input type="radio" name="formule" value={f} checked={formule === f} onChange={() => choisirFormule(f)} className="sr-only" />
                {LIBELLE_FORMULE[f]}
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="font-semibold text-ink">{LIBELLE_FORMULE[formules[0]!]}</p>
      )}

      {possibles.length > 1 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-semibold text-ink">Configuration</legend>
          <div className="flex flex-wrap gap-2">
            {possibles.map((v) => (
              <label key={v.defaultCode} className={classePilule}>
                <input type="radio" name="configuration" value={v.defaultCode} checked={variante.defaultCode === v.defaultCode} onChange={() => setConfig(v.defaultCode)} className="sr-only" />
                {v.configuration ?? "Standard"}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div aria-live="polite" className="ec-card flex flex-col gap-3" data-testid="panneau-formule">
        {formule === "achat" ? (
          <>
            <Prix ht={variante.prixHt} tauxTva={variante.tauxTva} taille="grand" />
            {variante.prixHt < variante.prixCatalogueHt ? (
              <p className="text-small text-muted">Votre prix ; prix public : {euros(variante.prixCatalogueHt)} HT.</p>
            ) : null}
            <p className="text-small text-muted">Réf. {variante.referenceFabricant ?? variante.defaultCode}</p>
            <Disponibilite etat={dispo} />
            {dispo && dispo.etat !== "indisponible" ? (
              <AjoutPanier key={variante.defaultCode} defaultCode={variante.defaultCode} prixAffiche={variante.prixHt} />
            ) : (
              <Link href={contact("Information produit")} className="ec-btn ec-btn--secondary self-start">Nous contacter</Link>
            )}
          </>
        ) : null}

        {formule === "mise_a_disposition" && variante.offreMad ? (
          <>
            <Prix ht={variante.offreMad.premierMoisHt} tauxTva={variante.tauxTva} periode="le premier mois" taille="grand" />
            <Prix ht={variante.offreMad.moisSuivantsHt} tauxTva={variante.tauxTva} periode="/ mois ensuite" />
            <p className="text-small text-muted">Sans engagement : vous arrêtez quand vous le souhaitez.</p>
            {contenuPackMad ? (
              <div>
                <p className="font-semibold text-ink">Le pack comprend</p>
                <p>{contenuPackMad}</p>
              </div>
            ) : null}
            {variante.kitRequis ? (
              <p>
                Kit d’accessoires requis à la première commande : {variante.kitRequis.nom} ({euros(variante.kitRequis.prixHt)} HT).
              </p>
            ) : null}
            <Disponibilite etat={dispo} />
            {dispo && dispo.etat !== "indisponible" ? (
              <AjoutPanier
                key={`mad-${variante.defaultCode}`}
                defaultCode={variante.defaultCode}
                formule="mise_a_disposition"
                prixAffiche={variante.offreMad.premierMoisHt}
                libelle="Ajouter la mise à disposition au panier"
              />
            ) : (
              <Link href={contact("Mise à disposition")} className="ec-btn ec-btn--secondary self-start">Nous contacter</Link>
            )}
          </>
        ) : null}

        {formule === "mise_a_disposition" && !variante.offreMad ? (
          <>
            <Prix ht={variante.prixHt} tauxTva={variante.tauxTva} periode="/ mois" taille="grand" />
            <p className="text-small text-muted">Abonnement mensuel, sans engagement : vous arrêtez quand vous le souhaitez.</p>
            {contenuPackMad ? <p>{contenuPackMad}</p> : null}
            <Link href={contact("Mise à disposition")} className="ec-btn ec-btn--primary self-start">Demander l’accès</Link>
          </>
        ) : null}

        {formule === "financement" ? (
          <>
            <p className="font-semibold text-ink">Mensualités indicatives pour {nom}{variante.configuration ? ` (${variante.configuration})` : ""}</p>
            <ul className="flex list-none flex-col gap-1 p-0">
              {variante.mensualites.map((m, i) => (
                <li key={m.dureeMois} className="flex flex-wrap justify-between gap-x-4 border-b border-line py-2 last:border-0">
                  <span className="text-ink">Sur {m.dureeMois} mois</span>
                  <Prix ht={m.montantHt} tauxTva={variante.tauxTva} periode="/ mois" aPartirDe={i === 0 && m.source === "calcul"} />
                </li>
              ))}
            </ul>
            <p className="text-small text-muted">{mentionFinancement}</p>
            <Link href={`/financement/demande?article=${encodeURIComponent(variante.defaultCode)}`} className="ec-btn ec-btn--primary self-start">Demander mon financement</Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
