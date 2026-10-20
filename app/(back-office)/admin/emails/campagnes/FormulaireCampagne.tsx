import type { Campagne } from "@generated/site/client";
import { TYPES_CAMPAGNE } from "@/domaine/emailing/campagnes";
import { Button, Champ } from "@/ui";

// Saisie d'une campagne (F10, D7) : type, objet, titre, texte (lignes vides = paragraphes),
// lien vers une page du site. Aucune variable : le même texte pour tous les abonnés.

const zone = "min-h-40 w-full rounded-sm border border-muted bg-surface px-3 py-2 text-body text-ink focus-visible:border-action focus-visible:outline-2 focus-visible:outline-action";
const select = "min-h-11 w-full max-w-full rounded-sm border border-muted bg-surface px-2";

export function FormulaireCampagne({ action, campagne, bouton }: { action: (d: FormData) => Promise<void>; campagne?: Campagne; bouton: string }) {
  return (
    <form action={action} className="flex flex-col gap-3">
      {campagne ? <input type="hidden" name="id" value={campagne.id} /> : null}
      <label className="flex flex-col gap-1 text-small font-medium text-ink">
        Type
        <select name="type" className={select} defaultValue={campagne?.type ?? "promotion"}>
          {Object.entries(TYPES_CAMPAGNE).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </label>
      <Champ id="campagne-objet" name="objet" libelle="Objet de l’email" maxLength={120} required defaultValue={campagne?.objet} />
      <Champ id="campagne-titre" name="titre" libelle="Titre affiché dans l’email" maxLength={120} required defaultValue={campagne?.titre} />
      <label htmlFor="campagne-texte" className="text-small font-medium text-ink">Texte (une ligne vide sépare deux paragraphes)</label>
      <textarea id="campagne-texte" name="texte" className={zone} required minLength={20} maxLength={4000} defaultValue={campagne?.texte} />
      <Champ id="campagne-lien" name="lien" libelle="Lien (une page du site, facultatif)" placeholder="/accessoires-consommables" defaultValue={campagne?.lien ?? ""} />
      <Champ id="campagne-libelle" name="libelleLien" libelle="Texte du bouton" placeholder="Voir les consommables" maxLength={60} defaultValue={campagne?.libelleLien ?? ""} />
      <div><Button type="submit">{bouton}</Button></div>
    </form>
  );
}
