import type { Metadata } from "next";
import { dbSite } from "@/lib/db/site";
import { ARGUMENTS_ANIMATION, LONGUEURS_ANIMATION as L, textesAnimation } from "@/domaine/textes-animation";
import { Button, Card, Kicker, Retour } from "@/ui";
import { ChampAdmin, classeChamp, RappelPatient } from "@/ui/admin";
import { ApercuCadres } from "@/ui/ApercuCadres";
import { enregistrerAnimation } from "../actions";

export const metadata: Metadata = { title: "Animation de l'accueil" };

// Animation « Les trois temps » (F20, US4, FR-017, FR-022) : phrase d'accroche, trois mots et cinq
// arguments de l'image finale.
export default async function AnimationAccueil({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const r = await searchParams;
  const lignes = await dbSite().contenu.findMany({ where: { type: "argument" } });
  const textes = textesAnimation(lignes);
  const recente = lignes.reduce<Date | null>((m, x) => (!m || x.modifieLe > m ? x.modifieLe : m), null);
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Contenus</Kicker>
      <h1 className="text-h2 font-light">Animation de l’accueil</h1>
      <p className="text-muted">
        Animation d’ouverture de l’accueil : les trois points du logo portent chacun un mot, puis se referment sur le logo et la phrase d’accroche, titre
        principal de la page, avec les cinq arguments et le bouton « Voir l’offre ». Les formes et le mouvement sont fixes ; les textes se modifient ici.
      </p>
      <Retour {...r} />
      <RappelPatient />
      <form action={enregistrerAnimation} className="flex flex-col gap-6">
        <input type="hidden" name="modifieLe" value={recente?.toISOString() ?? ""} />
        <Card className="grid gap-3">
          <h2 className="text-h3 font-semibold">Phrase d’accroche</h2>
          <ChampAdmin id="accroche" libelle="Phrase d’accroche (80 caractères au plus)">
            <input id="accroche" name="accroche" maxLength={80} defaultValue={textes.accroche} required className={classeChamp} />
          </ChampAdmin>
        </Card>
        <Card className="grid gap-3 sm:grid-cols-3">
          <h2 className="text-h3 font-semibold sm:col-span-3">Les trois mots</h2>
          {textes.mots.map((mot, i) => (
            <ChampAdmin key={i} id={`mot-${i + 1}`} libelle={`Mot ${i + 1} (16 caractères au plus)`}>
              <input id={`mot-${i + 1}`} name={`mot-${i + 1}`} maxLength={16} defaultValue={mot} required className={classeChamp} />
            </ChampAdmin>
          ))}
        </Card>
        <Card className="grid gap-3">
          <h2 className="text-h3 font-semibold">Les cinq arguments</h2>
          <p className="text-small text-muted">
            Chacun apparaît sous la bulle de son mot pendant l’animation, puis est rappelé dans l’image finale avec la pastille de couleur du point.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {ARGUMENTS_ANIMATION.map((a, i) => (
              <ChampAdmin key={a.cle} id={a.cle} libelle={`Argument ${i + 1} — ${textes.mots[a.mot]} (${L.argument} caractères au plus)`}>
                <input id={a.cle} name={a.cle} maxLength={L.argument} defaultValue={textes.arguments[i]} required className={classeChamp} />
              </ChampAdmin>
            ))}
          </div>
        </Card>
        <div><Button type="submit">Enregistrer</Button></div>
      </form>
      <Card>
        <h2 className="mb-3 text-h3 font-semibold">Aperçu de l’accueil</h2>
        <ApercuCadres chemin="/" />
      </Card>
    </div>
  );
}
