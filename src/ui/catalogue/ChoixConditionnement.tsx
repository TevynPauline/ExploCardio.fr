"use client";

import Link from "next/link";
import { useState } from "react";
import type { VarianteFiche } from "@/domaine/catalogue/fiches";
import { prixPourQuantite } from "@/domaine/catalogue/prix";
import { euros } from "@/lib/montants";
import { AjoutPanier } from "./AjoutPanier";
import { Disponibilite } from "./Disponibilite";
import { Prix } from "./Prix";

// Fiche consommable (F03, US3, FR-022 à FR-024) : conditionnement, quantité, prix unitaire et
// par lot, paliers dégressifs, total mis à jour sans rechargement, ajout rapide.

const classePilule =
  "flex min-h-11 cursor-pointer items-center rounded-pill border border-line bg-surface px-4 text-ink has-[:checked]:border-action has-[:checked]:bg-pale has-[:checked]:font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-action";

export function ChoixConditionnement({ variantes, configInitiale }: { variantes: VarianteFiche[]; configInitiale: string | null }) {
  const [code, setCode] = useState(variantes.some((v) => v.defaultCode === configInitiale) ? configInitiale! : variantes[0]!.defaultCode);
  const [saisie, setSaisie] = useState("1");
  const variante = variantes.find((v) => v.defaultCode === code) ?? variantes[0]!;
  const quantite = Math.min(999, Math.max(1, Math.trunc(Number(saisie)) || 1));
  const prix = prixPourQuantite(variante, quantite);
  const dispo = variante.achat;
  const parLot = variante.quantiteParLot > 1;

  return (
    <div className="flex flex-col gap-5">
      {variantes.length > 1 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-semibold text-ink">Conditionnement</legend>
          <div className="flex flex-wrap gap-2">
            {variantes.map((v) => (
              <label key={v.defaultCode} className={classePilule}>
                <input type="radio" name="conditionnement" value={v.defaultCode} checked={code === v.defaultCode} onChange={() => setCode(v.defaultCode)} className="sr-only" />
                {v.configuration ?? "À l’unité"}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="ec-card flex flex-col gap-3">
        <Prix ht={variante.prixHt} tauxTva={variante.tauxTva} taille="grand" periode={parLot ? `le lot de ${variante.quantiteParLot}` : undefined} />
        {parLot ? <p className="text-small text-muted">Soit {euros(Math.round(variante.prixHt / variante.quantiteParLot))} HT l’unité.</p> : null}
        <p className="text-small text-muted">Réf. {variante.referenceFabricant ?? variante.defaultCode}</p>
        {variante.paliers.length ? (
          <div>
            <p className="font-semibold text-ink">Prix dégressifs</p>
            <ul className="list-none p-0 text-small">
              {variante.paliers.map((p) => (
                <li key={p.quantiteMin}>
                  À partir de {p.quantiteMin} : {euros(p.prixHt)} HT {parLot ? "le lot" : "l’unité"}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <label className="flex max-w-40 flex-col gap-1 text-small font-medium">
          Quantité{parLot ? " (lots)" : ""}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            className="min-h-11 rounded-sm border border-muted bg-surface px-3 text-ink"
          />
        </label>
        <div aria-live="polite" className="flex flex-col gap-1" data-testid="total-consommable">
          <p className="text-ink">
            Prix appliqué : <span className="font-semibold">{euros(prix.prixLotHt)} HT</span> {parLot ? "le lot" : "l’unité"}
            {prix.palier ? ` (prix dégressif dès ${prix.palier.quantiteMin})` : ""}
          </p>
          <Prix ht={prix.totalHt} tauxTva={variante.tauxTva} className="text-ink" />
        </div>
        <Disponibilite etat={dispo} />
        {dispo?.etat === "disponible" && variante.quantiteDisponible !== null && quantite > variante.quantiteDisponible ? (
          <p role="status" className="text-small text-ink">
            {variante.quantiteDisponible} disponible{variante.quantiteDisponible > 1 ? "s" : ""} immédiatement ;{" "}
            {variante.delaiReassortJours ? `le reste sous ${variante.delaiReassortJours} jours.` : "le reste n’est pas disponible pour le moment."}
          </p>
        ) : null}
        {dispo?.etat === "delai" ? <p className="text-small text-muted">Commandable : expédié sous {dispo.delaiJours} jours.</p> : null}
        {dispo && dispo.etat !== "indisponible" ? (
          <AjoutPanier key={`${variante.defaultCode}-${quantite}`} defaultCode={variante.defaultCode} quantite={quantite} prixAffiche={prix.prixLotHt === variante.prixHt ? variante.prixHt : undefined} />
        ) : (
          <Link href="/qui-sommes-nous?motif=Information%20produit#contact" className="ec-btn ec-btn--secondary self-start">Nous contacter</Link>
        )}
      </div>
    </div>
  );
}
