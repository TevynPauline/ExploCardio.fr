import type { Metadata } from "next";
import { dbSite } from "@/lib/db/site";
import { Button, Card, Kicker, Retour } from "@/ui";
import { ChampAdmin, classeChamp } from "@/ui/admin";
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
      {tuiles.map((tuile, i) => (
        <Card key={tuile.id}>
          <h2 className="mb-3 text-h3 font-semibold">Tuile {i + 1} : {tuile.titre}</h2>
          <form action={enregistrerTuile} className="grid gap-3 sm:grid-cols-2">
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
            <div className="flex items-end">
              <Button type="submit" aria-label={`Enregistrer la tuile ${tuile.titre}`}>Enregistrer</Button>
            </div>
          </form>
        </Card>
      ))}
    </div>
  );
}
