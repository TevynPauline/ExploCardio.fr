import type { Metadata } from "next";
import { dbSite } from "@/lib/db/site";
import { Button, Card, Kicker, Retour } from "@/ui";
import { ChampAdmin, classeChamp, RappelPatient } from "@/ui/admin";
import { ApercuCadres } from "@/ui/ApercuCadres";
import { enregistrerArguments } from "../actions";

export const metadata: Metadata = { title: "Pourquoi préférer ExploCardio.fr" };

// « Pourquoi préférer ExploCardio.fr » (F16, US4, FR-014) : introduction et quatre arguments.
export default async function ArgumentsAccueil({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const r = await searchParams;
  const lignes = await dbSite().contenu.findMany({ where: { type: "argument" } });
  const l = (cle: string) => lignes.find((x) => x.cle === cle);
  const recente = lignes.reduce<Date | null>((m, x) => (!m || x.modifieLe > m ? x.modifieLe : m), null);
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Contenus</Kicker>
      <h1 className="text-h2 font-light">Pourquoi préférer ExploCardio.fr</h1>
      <p className="text-muted">Section de l’accueil placée sous les accès rapides. Les petits schémas sont fixes ; les textes se modifient ici.</p>
      <Retour {...r} />
      <RappelPatient />
      <form action={enregistrerArguments} className="flex flex-col gap-6">
        <input type="hidden" name="modifieLe" value={recente?.toISOString() ?? ""} />
        <Card className="grid gap-3">
          <h2 className="text-h3 font-semibold">Introduction</h2>
          <ChampAdmin id="titre-intro" libelle="Titre de la section (60 caractères au plus)">
            <input id="titre-intro" name="titre-intro" maxLength={60} defaultValue={l("intro")?.titre ?? "Pourquoi préférer ExploCardio.fr"} required className={classeChamp} />
          </ChampAdmin>
          <ChampAdmin id="corps-intro" libelle="Introduction (200 caractères au plus, facultative)">
            <textarea id="corps-intro" name="corps-intro" maxLength={200} rows={2} defaultValue={l("intro")?.corps ?? ""} className={`${classeChamp} py-2`} />
          </ChampAdmin>
        </Card>
        {["1", "2", "3", "4"].map((c) => (
          <Card key={c} className="grid gap-3">
            <h2 className="text-h3 font-semibold">Argument {c}</h2>
            <ChampAdmin id={`titre-${c}`} libelle="Titre (60 caractères au plus)">
              <input id={`titre-${c}`} name={`titre-${c}`} maxLength={60} defaultValue={l(c)?.titre ?? ""} required className={classeChamp} />
            </ChampAdmin>
            <ChampAdmin id={`corps-${c}`} libelle="Phrase (200 caractères au plus)">
              <textarea id={`corps-${c}`} name={`corps-${c}`} maxLength={200} rows={2} defaultValue={l(c)?.corps ?? ""} required className={`${classeChamp} py-2`} />
            </ChampAdmin>
          </Card>
        ))}
        <div><Button type="submit">Enregistrer</Button></div>
      </form>
      <Card>
        <h2 className="mb-3 text-h3 font-semibold">Aperçu de l’accueil</h2>
        <ApercuCadres chemin="/" />
      </Card>
    </div>
  );
}
