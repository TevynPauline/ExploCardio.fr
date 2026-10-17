"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import { classeChamp } from "@/ui/admin";
import { actionEnregistrerContenu, type EtatContenu } from "../actions";

type Valeurs = {
  reference: string;
  slug: string;
  sousCategorieId: string;
  ordre: string;
  descriptionCourte: string;
  caracteristiques: string;
  contenuCoffret: string;
  contenuPackMad: string;
  logicielAssocie: string;
  garantie: string;
  compatibilites: string;
  produitsAssocies: string;
  photos: { chemin: string; texteRemplacement: string }[];
  documents: { chemin: string; titre: string; type: string; octets: number }[];
};

const initial: EtatContenu = { erreurs: {} };

function Champ({ id, libelle, aide, erreur, children }: { id: string; libelle: string; aide?: string; erreur?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-small font-medium text-ink">{libelle}</label>
      {children}
      {aide ? <p id={`${id}-aide`} className="text-small text-muted">{aide}</p> : null}
      {erreur ? <p id={`${id}-erreur`} className="text-small font-medium text-ink">{erreur}</p> : null}
    </div>
  );
}

/** Formulaire des contenus d'un produit (F03, US6) : la saisie reste affichée en cas d'erreur. */
export function FormulaireContenu({ v, sousCategories, madProposee }: { v: Valeurs; sousCategories: { id: string; libelle: string }[]; madProposee: boolean }) {
  const [etat, action, enCours] = useActionState(actionEnregistrerContenu, initial);
  const router = useRouter();
  const formulaire = useRef<HTMLFormElement>(null);
  // Après un enregistrement réussi : données relues (photos, documents) et fichiers vidés.
  useEffect(() => {
    if (!etat.ok) return;
    formulaire.current?.querySelectorAll<HTMLInputElement>('input[type="file"], input[name="nouvellePhotoTexte"], input[name="nouveauDocumentTitre"]').forEach((i) => (i.value = ""));
    router.refresh();
  }, [etat, router]);

  // Envoi sans la remise à zéro automatique de React 19 : la saisie reste affichée.
  function envoyer(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const donnees = new FormData(ev.currentTarget);
    startTransition(() => action(donnees));
  }
  const e = etat.erreurs;
  const decrit = (id: string, aide: boolean) => [aide ? `${id}-aide` : null, e[id] ? `${id}-erreur` : null].filter(Boolean).join(" ") || undefined;
  const zone = `${classeChamp} py-2`;
  return (
    <form ref={formulaire} onSubmit={envoyer} className="flex flex-col gap-4">
      <input type="hidden" name="reference" value={v.reference} />
      {etat.message ? <p role="alert" className="ec-box--promo p-3 font-medium">{etat.message}</p> : null}
      {etat.ok ? <p role="status" className="ec-box--info p-3">{etat.ok}</p> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Champ id="slug" libelle="Adresse de la fiche" aide="Lettres, chiffres et tirets. L'ancienne adresse reste redirigée." erreur={e.slug}>
          <input id="slug" name="slug" defaultValue={v.slug} aria-describedby={decrit("slug", true)} aria-invalid={Boolean(e.slug)} className={classeChamp} />
        </Champ>
        <Champ id="sousCategorieId" libelle="Type (filtre)" erreur={e.sousCategorieId}>
          <select id="sousCategorieId" name="sousCategorieId" defaultValue={v.sousCategorieId} aria-describedby={decrit("sousCategorieId", false)} className={classeChamp}>
            <option value="">Aucun</option>
            {sousCategories.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
          </select>
        </Champ>
        <Champ id="ordre" libelle="Ordre d'affichage" erreur={e.ordre}>
          <input id="ordre" name="ordre" inputMode="numeric" defaultValue={v.ordre} aria-describedby={decrit("ordre", false)} aria-invalid={Boolean(e.ordre)} className={classeChamp} />
        </Champ>
      </div>
      <Champ id="descriptionCourte" libelle="Description courte (obligatoire pour publier)" aide="Une ou deux phrases orientées bénéfices, 400 caractères au plus." erreur={e.descriptionCourte}>
        <textarea id="descriptionCourte" name="descriptionCourte" rows={3} maxLength={400} defaultValue={v.descriptionCourte} aria-describedby={decrit("descriptionCourte", true)} className={zone} />
      </Champ>
      <Champ id="caracteristiques" libelle="Caractéristiques techniques" aide="Une par ligne : « Libellé : valeur »." erreur={e.caracteristiques}>
        <textarea id="caracteristiques" name="caracteristiques" rows={5} defaultValue={v.caracteristiques} aria-describedby={decrit("caracteristiques", true)} className={zone} />
      </Champ>
      <Champ id="contenuCoffret" libelle="Contenu du coffret">
        <textarea id="contenuCoffret" name="contenuCoffret" rows={3} defaultValue={v.contenuCoffret} className={zone} />
      </Champ>
      {madProposee ? (
        <Champ id="contenuPackMad" libelle="Contenu du pack de mise à disposition">
          <textarea id="contenuPackMad" name="contenuPackMad" rows={2} defaultValue={v.contenuPackMad} className={zone} />
        </Champ>
      ) : (
        <input type="hidden" name="contenuPackMad" value={v.contenuPackMad} />
      )}
      <Champ id="logicielAssocie" libelle="Logiciel associé">
        <textarea id="logicielAssocie" name="logicielAssocie" rows={3} defaultValue={v.logicielAssocie} className={zone} />
      </Champ>
      <Champ id="garantie" libelle="Garantie">
        <textarea id="garantie" name="garantie" rows={2} defaultValue={v.garantie} className={zone} />
      </Champ>
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ id="compatibilites" libelle="Compatibilités ajoutées" aide="Références d'Odoo, séparées par des virgules ; s'ajoutent à celles d'Odoo." erreur={e.compatibilites}>
          <input id="compatibilites" name="compatibilites" defaultValue={v.compatibilites} aria-describedby={decrit("compatibilites", true)} aria-invalid={Boolean(e.compatibilites)} className={classeChamp} />
        </Champ>
        <Champ id="produitsAssocies" libelle="Produits associés" aide="Références d'Odoo, séparées par des virgules." erreur={e.produitsAssocies}>
          <input id="produitsAssocies" name="produitsAssocies" defaultValue={v.produitsAssocies} aria-describedby={decrit("produitsAssocies", true)} aria-invalid={Boolean(e.produitsAssocies)} className={classeChamp} />
        </Champ>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-semibold text-ink">Photos</legend>
        {e.photos ? <p role="alert" className="text-small font-medium">{e.photos}</p> : null}
        {v.photos.map((p, i) => (
          <div key={p.chemin} className="flex flex-wrap items-end gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- aperçu d'une photo téléversée */}
            <img src={p.chemin} alt={p.texteRemplacement} className="h-16 w-auto rounded-sm" />
            <Champ id={`textePhoto-${i}`} libelle={`Texte de remplacement de la photo ${i + 1}`}>
              <input id={`textePhoto-${i}`} name="textePhoto" defaultValue={p.texteRemplacement} className={classeChamp} />
            </Champ>
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" name="photoRetiree" value={p.chemin} className="size-5" /> Retirer
            </label>
          </div>
        ))}
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ id="nouvellePhoto" libelle="Ajouter une photo" aide="PNG, JPEG ou WebP, 2 Mo au plus." erreur={e.fichiers}>
            <input id="nouvellePhoto" name="nouvellePhoto" type="file" accept="image/png,image/jpeg,image/webp" aria-describedby={decrit("nouvellePhoto", true)} className="min-h-11" />
          </Champ>
          <Champ id="nouvellePhotoTexte" libelle="Texte de remplacement de la nouvelle photo" aide="Obligatoire : décrivez la photo en quelques mots.">
            <input id="nouvellePhotoTexte" name="nouvellePhotoTexte" aria-describedby="nouvellePhotoTexte-aide" className={classeChamp} />
          </Champ>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-semibold text-ink">Documents (PDF)</legend>
        {v.documents.map((d) => (
          <label key={d.chemin} className="flex min-h-11 items-center gap-2">
            <input type="checkbox" name="documentRetire" value={d.chemin} className="size-5" /> Retirer « {d.titre} »
          </label>
        ))}
        <div className="grid gap-3 sm:grid-cols-3">
          <Champ id="nouveauDocument" libelle="Ajouter un document" aide="PDF, 10 Mo au plus.">
            <input id="nouveauDocument" name="nouveauDocument" type="file" accept="application/pdf" aria-describedby="nouveauDocument-aide" className="min-h-11" />
          </Champ>
          <Champ id="nouveauDocumentTitre" libelle="Titre du document">
            <input id="nouveauDocumentTitre" name="nouveauDocumentTitre" className={classeChamp} />
          </Champ>
          <Champ id="nouveauDocumentType" libelle="Type">
            <select id="nouveauDocumentType" name="nouveauDocumentType" className={classeChamp}>
              <option value="notice">Notice</option>
              <option value="fiche_technique">Fiche technique</option>
            </select>
          </Champ>
        </div>
      </fieldset>
      <div>
        <button type="submit" disabled={enCours} className="ec-btn ec-btn--primary">{enCours ? "Enregistrement…" : "Enregistrer le contenu"}</button>
      </div>
    </form>
  );
}
