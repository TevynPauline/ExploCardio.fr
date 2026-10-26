import type { Metadata } from "next";
import { dbSite } from "@/lib/db/site";
import { Button, Card, Kicker, Retour } from "@/ui";
import { CaseAdmin, ChampAdmin, classeChamp, RappelPatient } from "@/ui/admin";
import { enregistrerTuile } from "../actions";

export const metadata: Metadata = { title: "Tuiles d'accès rapide" };

const FONDS = [
  { valeur: "pale", libelle: "Eucalyptus pâle" },
  { valeur: "blue-soft", libelle: "Bleu doux" },
  { valeur: "lin", libelle: "Lin" },
  { valeur: "mint", libelle: "Menthe" },
];

// Les 6 tuiles se modifient ; elles ne s'ajoutent ni ne se suppriment (FR-017).
export default async function Tuiles({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const r = await searchParams;
  const tuiles = await dbSite().contenu.findMany({ where: { type: "tuile" }, orderBy: { ordre: "asc" } });
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Contenus</Kicker>
      <h1 className="text-h2 font-light">Tuiles d’accès rapide</h1>
      <Retour {...r} />
      <RappelPatient />
      {tuiles.map((tuile, i) => {
        const image = ((tuile.images as { url: string; texteRemplacement: string }[] | null) ?? [])[0];
        return (
        <Card key={tuile.id}>
          <h2 className="mb-3 text-h3 font-semibold">Tuile {i + 1} : {tuile.titre}</h2>
          <form action={enregistrerTuile} encType="multipart/form-data" className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={tuile.id} />
            <ChampAdmin id={`titre-${tuile.id}`} libelle="Titre (40 caractères au plus)">
              <input id={`titre-${tuile.id}`} name="titre" maxLength={40} defaultValue={tuile.titre} className={classeChamp} />
            </ChampAdmin>
            <ChampAdmin id={`lien-${tuile.id}`} libelle="Lien" aide="Page du site (/…) ou adresse https://">
              <input id={`lien-${tuile.id}`} name="lien" defaultValue={tuile.lien ?? ""} className={classeChamp} />
            </ChampAdmin>
            <div className="sm:col-span-2">
              <ChampAdmin id={`phrase-${tuile.id}`} libelle="Phrase (120 caractères au plus)">
                <input id={`phrase-${tuile.id}`} name="phrase" maxLength={120} defaultValue={tuile.corps} className={classeChamp} />
              </ChampAdmin>
            </div>
            <ChampAdmin id={`badge-${tuile.id}`} libelle="Badge (facultatif)" aide="Par exemple « En préparation »">
              <input id={`badge-${tuile.id}`} name="badge" defaultValue={tuile.badge ?? ""} className={classeChamp} />
            </ChampAdmin>
            <ChampAdmin id={`fond-${tuile.id}`} libelle="Fond">
              <select id={`fond-${tuile.id}`} name="fond" defaultValue={tuile.fond ?? "pale"} className={classeChamp}>
                {FONDS.map((f) => <option key={f.valeur} value={f.valeur}>{f.libelle}</option>)}
              </select>
            </ChampAdmin>
            <ChampAdmin id={`ordre-${tuile.id}`} libelle="Position">
              <input id={`ordre-${tuile.id}`} name="ordre" inputMode="numeric" defaultValue={tuile.ordre} className={classeChamp} />
            </ChampAdmin>
            <ChampAdmin id={`image-${tuile.id}`} libelle="Image (facultative)" aide="Affichée en haut de la tuile, fondue vers le texte. Format conseillé 800 × 500 px ; 2 Mo au plus.">
              <input id={`image-${tuile.id}`} name="image" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="min-h-11" />
            </ChampAdmin>
            <ChampAdmin id={`alt-${tuile.id}`} libelle="Texte de remplacement de l'image" aide="Obligatoire avec une image : décrivez-la en quelques mots.">
              <input id={`alt-${tuile.id}`} name="texteRemplacement" defaultValue={image?.texteRemplacement ?? ""} className={classeChamp} />
            </ChampAdmin>
            {image ? (
              <div className="sm:col-span-2 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- aperçu d'une image téléversée */}
                <img src={image.url} alt={image.texteRemplacement} className="h-16 w-auto rounded-sm" />
                <CaseAdmin name="retirerImage" libelle="Retirer l'image" />
              </div>
            ) : null}
            <div className="flex items-end">
              <Button type="submit" aria-label={`Enregistrer la tuile ${tuile.titre}`}>Enregistrer</Button>
            </div>
          </form>
        </Card>
        );
      })}
    </div>
  );
}
