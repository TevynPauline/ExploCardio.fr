import type { Metadata } from "next";
import { dbSite } from "@/lib/db/site";
import { Button, Card, Kicker, Retour } from "@/ui";
import { CaseAdmin, ChampAdmin, classeChamp, valeurDate } from "@/ui/admin";
import { enregistrerActualite, supprimerActualite } from "../actions";

export const metadata: Metadata = { title: "Actualités" };

type Actu = {
  id: string;
  titre: string;
  corps: string;
  lien: string | null;
  typeActualite: string | null;
  etat: string;
  publieLe: Date | null;
  images: unknown;
};

function FormulaireActualite({ a }: { a?: Actu }) {
  const p = a?.id ?? "nouvelle";
  const image = ((a?.images as { url: string; texteRemplacement: string }[] | null) ?? [])[0];
  return (
    <form action={enregistrerActualite} encType="multipart/form-data" className="grid gap-3 sm:grid-cols-2">
      {a ? <input type="hidden" name="id" value={a.id} /> : null}
      <div className="sm:col-span-2">
        <ChampAdmin id={`titre-${p}`} libelle="Titre">
          <input id={`titre-${p}`} name="titre" maxLength={90} defaultValue={a?.titre} required className={classeChamp} />
        </ChampAdmin>
      </div>
      <div className="sm:col-span-2">
        <ChampAdmin id={`texte-${p}`} libelle="Texte court (300 caractères au plus)">
          <textarea id={`texte-${p}`} name="texte" maxLength={300} rows={3} defaultValue={a?.corps} required className={`${classeChamp} py-2`} />
        </ChampAdmin>
      </div>
      <ChampAdmin id={`type-${p}`} libelle="Type">
        <select id={`type-${p}`} name="typeActualite" defaultValue={a?.typeActualite ?? "actualite"} className={classeChamp}>
          <option value="actualite">Actualité</option>
          <option value="nouveau_produit">Nouveau produit</option>
          <option value="nouvelle_offre">Nouvelle offre</option>
        </select>
      </ChampAdmin>
      <ChampAdmin id={`date-${p}`} libelle="Date affichée">
        <input id={`date-${p}`} name="publieLe" type="datetime-local" defaultValue={valeurDate(a?.publieLe ?? null)} className={classeChamp} />
      </ChampAdmin>
      <ChampAdmin id={`lien-${p}`} libelle="Lien (facultatif)" aide="Page du site (/…) ou adresse https://">
        <input id={`lien-${p}`} name="lien" defaultValue={a?.lien ?? ""} className={classeChamp} />
      </ChampAdmin>
      <ChampAdmin id={`image-${p}`} libelle="Image (facultative)" aide="PNG, JPEG, WebP ou SVG, 2 Mo au plus">
        <input id={`image-${p}`} name="image" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="min-h-11" />
      </ChampAdmin>
      <div className="sm:col-span-2">
        <ChampAdmin id={`alt-${p}`} libelle="Texte de remplacement de l'image" aide="Obligatoire avec une image : décrivez-la en quelques mots.">
          <input id={`alt-${p}`} name="texteRemplacement" defaultValue={image?.texteRemplacement ?? ""} className={classeChamp} />
        </ChampAdmin>
      </div>
      {image ? (
        <div className="sm:col-span-2 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- aperçu d'une image téléversée */}
          <img src={image.url} alt={image.texteRemplacement} className="h-16 w-auto rounded-sm" />
          <CaseAdmin name="retirerImage" libelle="Retirer l'image" />
        </div>
      ) : null}
      <CaseAdmin name="publie" libelle="Publiée" coche={a ? a.etat === "publie" : true} />
      <div className="flex items-end">
        <Button type="submit">{a ? "Enregistrer" : "Créer l'actualité"}</Button>
      </div>
    </form>
  );
}

// Actualités (FR-024, FR-036) : les plus récentes d'abord ; section masquée s'il n'y en a aucune.
export default async function Actualites({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const r = await searchParams;
  const actus = await dbSite().contenu.findMany({ where: { type: "actualite" }, orderBy: [{ publieLe: "desc" }, { creeLe: "desc" }] });
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Contenus</Kicker>
      <h1 className="text-h2 font-light">Actualités</h1>
      <Retour {...r} />
      <Card>
        <h2 className="mb-3 text-h3 font-semibold">Nouvelle actualité</h2>
        <FormulaireActualite />
      </Card>
      {actus.map((a) => (
        <Card key={a.id}>
          <FormulaireActualite a={a} />
          <form action={supprimerActualite} className="mt-3">
            <input type="hidden" name="id" value={a.id} />
            <Button type="submit" variante="secondaire">Supprimer cette actualité</Button>
          </form>
        </Card>
      ))}
    </div>
  );
}
