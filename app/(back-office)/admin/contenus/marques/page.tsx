import type { Metadata } from "next";
import { dbSite } from "@/lib/db/site";
import { Button, Card, Kicker, Retour } from "@/ui";
import { CaseAdmin, ChampAdmin, classeChamp, RappelPatient } from "@/ui/admin";
import { enregistrerMarque } from "../actions";

export const metadata: Metadata = { title: "Marques" };

type Marque = { id: string; nom: string; logo: string | null; familles: string[]; ordre: number; visible: boolean };

const FAMILLES = [
  ["holter-ecg", "Holter ECG"],
  ["mapa", "Holter tensionnel / MAPA"],
  ["effort", "Épreuve d'effort"],
] as const;

function FormulaireMarque({ m }: { m?: Marque }) {
  const p = m?.id ?? "nouvelle";
  return (
    <form action={enregistrerMarque} encType="multipart/form-data" className="grid gap-3 sm:grid-cols-2">
      {m ? <input type="hidden" name="id" value={m.id} /> : null}
      <ChampAdmin id={`nom-${p}`} libelle="Nom">
        <input id={`nom-${p}`} name="nom" defaultValue={m?.nom} required className={classeChamp} />
      </ChampAdmin>
      <ChampAdmin id={`ordre-${p}`} libelle="Position">
        <input id={`ordre-${p}`} name="ordre" inputMode="numeric" defaultValue={m?.ordre ?? 0} className={classeChamp} />
      </ChampAdmin>
      <fieldset className="sm:col-span-2">
        <legend className="text-small font-medium">Familles</legend>
        <div className="flex flex-wrap gap-x-6">
          {FAMILLES.map(([valeur, libelle]) => (
            <CaseAdmin key={valeur} name="familles" value={valeur} libelle={libelle} coche={m?.familles.includes(valeur)} />
          ))}
        </div>
      </fieldset>
      <ChampAdmin id={`logo-${p}`} libelle="Logo (facultatif)" aide="Sans logo, le nom s'affiche en texte. PNG, JPEG, WebP ou SVG, 2 Mo au plus.">
        <input id={`logo-${p}`} name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="min-h-11" />
      </ChampAdmin>
      <div className="flex flex-col justify-end">
        {m?.logo ? <CaseAdmin name="retirerLogo" libelle="Retirer le logo" /> : null}
        <CaseAdmin name="visible" libelle="Affichée sur l'accueil" coche={m ? m.visible : true} />
      </div>
      <div><Button type="submit">{m ? "Enregistrer" : "Ajouter la marque"}</Button></div>
    </form>
  );
}

export default async function Marques({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const r = await searchParams;
  const marques = await dbSite().marque.findMany({ orderBy: { ordre: "asc" } });
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Contenus</Kicker>
      <h1 className="text-h2 font-light">Marques</h1>
      <Retour {...r} />
      <RappelPatient />
      {marques.map((m) => (
        <Card key={m.id}>
          <FormulaireMarque m={m} />
        </Card>
      ))}
      <Card>
        <h2 className="mb-3 text-h3 font-semibold">Nouvelle marque</h2>
        <FormulaireMarque />
      </Card>
    </div>
  );
}
