import type { Metadata } from "next";
import { dbSite } from "@/lib/db/site";
import { Button, Card, Kicker, Retour } from "@/ui";
import { CaseAdmin, ChampAdmin, classeChamp, EtatAdmin, RappelPatient, valeurDate } from "@/ui/admin";
import { ApercuCadres } from "@/ui/ApercuCadres";
import { deplacerVignette, enregistrerVignette, supprimerVignette } from "../actions";

export const metadata: Metadata = { title: "Carrousel de l’accueil" };

type Vignette = {
  id: string;
  cle: string | null;
  titre: string;
  corps: string;
  lien: string | null;
  libelleLien: string | null;
  fond: string | null;
  etat: "preparation" | "publie" | "retire";
  debut: Date | null;
  fin: Date | null;
  images: unknown;
  modifieLe: Date;
};

const FONDS: Record<string, string> = { pale: "Eucalyptus pâle", "blue-soft": "Bleu doux", lin: "Lin", mint: "Menthe" };

function FormulaireVignette({ v }: { v?: Vignette }) {
  const p = v?.id ?? "nouvelle";
  const image = ((v?.images as { url: string; texteRemplacement: string }[] | null) ?? [])[0];
  return (
    <form action={enregistrerVignette} encType="multipart/form-data" className="grid gap-3 sm:grid-cols-2">
      {v ? <input type="hidden" name="id" value={v.id} /> : null}
      <div className="sm:col-span-2">
        <ChampAdmin id={`titre-${p}`} libelle="Titre (60 caractères au plus)">
          <input id={`titre-${p}`} name="titre" maxLength={60} defaultValue={v?.titre} required className={classeChamp} />
        </ChampAdmin>
      </div>
      <div className="sm:col-span-2">
        <ChampAdmin id={`phrase-${p}`} libelle="Phrase (140 caractères au plus)">
          <textarea id={`phrase-${p}`} name="phrase" maxLength={140} rows={2} defaultValue={v?.corps} required className={`${classeChamp} py-2`} />
        </ChampAdmin>
      </div>
      <ChampAdmin id={`libelle-${p}`} libelle="Texte du bouton (facultatif, 30 caractères)">
        <input id={`libelle-${p}`} name="libelleLien" maxLength={30} defaultValue={v?.libelleLien ?? ""} className={classeChamp} />
      </ChampAdmin>
      <ChampAdmin id={`lien-${p}`} libelle="Lien du bouton" aide="Page du site (/…), fiche produit ou adresse https://">
        <input id={`lien-${p}`} name="lien" defaultValue={v?.lien ?? ""} className={classeChamp} />
      </ChampAdmin>
      <ChampAdmin id={`debut-${p}`} libelle="Début (facultatif)">
        <input id={`debut-${p}`} name="debut" type="datetime-local" defaultValue={valeurDate(v?.debut ?? null)} className={classeChamp} />
      </ChampAdmin>
      <ChampAdmin id={`fin-${p}`} libelle="Fin (facultative)">
        <input id={`fin-${p}`} name="fin" type="datetime-local" defaultValue={valeurDate(v?.fin ?? null)} className={classeChamp} />
      </ChampAdmin>
      <ChampAdmin id={`fond-${p}`} libelle="Fond sans image">
        <select id={`fond-${p}`} name="fond" defaultValue={v?.fond ?? "pale"} className={classeChamp}>
          {Object.entries(FONDS).map(([c, l]) => <option key={c} value={c}>{l}</option>)}
        </select>
      </ChampAdmin>
      <ChampAdmin id={`image-${p}`} libelle="Image (facultative)" aide="Format conseillé 1 600 × 640 px ; PNG, JPEG, WebP ou SVG, 2 Mo au plus">
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
      <input type="hidden" name="modifieLe" value={v?.modifieLe?.toISOString() ?? ""} />
      <EtatAdmin id={`etat-${p}`} etat={v?.etat ?? "preparation"} />
      <div className="flex items-end">
        <Button type="submit">{v ? "Enregistrer" : "Créer la vignette"}</Button>
      </div>
    </form>
  );
}

// Carrousel de l'accueil (F16, US3, FR-012, FR-013) : vignettes dans l'ordre d'affichage.
export default async function Carrousel({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const r = await searchParams;
  const vignettes = await dbSite().contenu.findMany({ where: { type: "vignette" }, orderBy: [{ ordre: "asc" }, { creeLe: "asc" }] });
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Contenus</Kicker>
      <h1 className="text-h2 font-light">Carrousel de l’accueil</h1>
      <p className="text-muted">
        Offres, informations du moment, produits phares : une vignette s’affiche si elle est publiée et dans sa période. La vignette de l’offre de bienvenue
        disparaît d’elle-même si l’offre est désactivée (Paramètres → Offre de bienvenue).
      </p>
      <Retour {...r} />
      <RappelPatient />
      <Card>
        <h2 className="mb-3 text-h3 font-semibold">Nouvelle vignette</h2>
        <FormulaireVignette />
      </Card>
      {vignettes.map((v, i) => (
        <Card key={v.id}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-h3 font-semibold">
              {i + 1}. {v.titre}
              {v.cle === "offre-bienvenue" ? <span className="text-small font-normal text-muted"> · offre de bienvenue</span> : null}
            </h2>
            <div className="flex gap-2">
              <form action={deplacerVignette}>
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="sens" value="haut" />
                <Button type="submit" variante="secondaire" disabled={i === 0}>Monter<span className="sr-only"> « {v.titre} »</span></Button>
              </form>
              <form action={deplacerVignette}>
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="sens" value="bas" />
                <Button type="submit" variante="secondaire" disabled={i === vignettes.length - 1}>Descendre<span className="sr-only"> « {v.titre} »</span></Button>
              </form>
            </div>
          </div>
          <FormulaireVignette v={v} />
          {v.cle === "offre-bienvenue" ? null : (
            <form action={supprimerVignette} className="mt-3">
              <input type="hidden" name="id" value={v.id} />
              <Button type="submit" variante="secondaire">Supprimer cette vignette</Button>
            </form>
          )}
        </Card>
      ))}
      <Card>
        <h2 className="mb-3 text-h3 font-semibold">Aperçu de l’accueil</h2>
        <ApercuCadres chemin="/" />
      </Card>
    </div>
  );
}
