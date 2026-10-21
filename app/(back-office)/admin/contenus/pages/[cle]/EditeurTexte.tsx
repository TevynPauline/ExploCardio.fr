"use client";

import { useActionState } from "react";
import { actionBrouillonPage, type EtatBrouillon } from "../actions";

// Éditeur du texte d'une page (F13, US2, D9) : si l'enregistrement est refusé, l'explication
// s'affiche et la saisie reste dans la zone de texte.

const zone = "min-h-[28rem] w-full rounded-sm border border-muted bg-surface p-3 font-mono text-small text-ink focus-visible:border-action focus-visible:outline-2 focus-visible:outline-action";

export function EditeurTexte({ nom, modifieLe, texte }: { nom: string; modifieLe: string; texte: string }) {
  const [etat, action, enCours] = useActionState<EtatBrouillon, FormData>(actionBrouillonPage, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      {etat.erreur ? <p role="alert" className="ec-box--promo p-4 font-medium text-ink">{etat.erreur}</p> : null}
      <input type="hidden" name="nom" value={nom} />
      <input type="hidden" name="modifieLe" value={modifieLe} />
      <label htmlFor="texte" className="text-small font-medium text-ink">Texte de la page</label>
      <textarea key={etat.texte ?? "initial"} id="texte" name="texte" className={zone} defaultValue={etat.texte ?? texte} required />
      <div>
        <button type="submit" disabled={enCours} className="ec-btn ec-btn--primary">Enregistrer le brouillon</button>
      </div>
    </form>
  );
}
