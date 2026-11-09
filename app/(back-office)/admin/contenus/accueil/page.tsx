import type { Metadata } from "next";
import { dbSite } from "@/lib/db/site";
import { ARGUMENTS_ANIMATION, LONGUEURS_ANIMATION as L, textesAnimation } from "@/domaine/textes-animation";
import { Button, Card, Kicker, Retour } from "@/ui";
import { ChampAdmin, classeChamp, RappelPatient } from "@/ui/admin";
import { ApercuCadres } from "@/ui/ApercuCadres";
import { CLES_RAISONS, LONGUEURS_RAISONS as LR, textesRaisons } from "@/domaine/textes-raisons";
import { enregistrerAnimation, enregistrerRaisons } from "../actions";

export const metadata: Metadata = { title: "Textes de l'accueil" };

// Textes de l'accueil : animation « Les trois temps » (F20, US4, FR-017, FR-022) — phrase
// d'accroche, trois mots et cinq arguments — et six cartes « Pourquoi choisir » (F23, US4, FR-011).
export default async function AnimationAccueil({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const r = await searchParams;
  const tout = await dbSite().contenu.findMany({ where: { type: "argument" } });
  const estRaison = (cle: string | null) => (CLES_RAISONS as readonly (string | null)[]).includes(cle);
  const lignes = tout.filter((x) => !estRaison(x.cle));
  const lignesRaisons = tout.filter((x) => estRaison(x.cle));
  const textes = textesAnimation(lignes);
  const raisons = textesRaisons(lignesRaisons);
  const plusRecente = (l: typeof tout) => l.reduce<Date | null>((m, x) => (!m || x.modifieLe > m ? x.modifieLe : m), null);
  const recente = plusRecente(lignes);
  const recenteRaisons = plusRecente(lignesRaisons);
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Contenus</Kicker>
      <h1 className="text-h2 font-light">Textes de l’accueil</h1>
      <h2 className="text-h3 font-semibold">Animation d’ouverture</h2>
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
        <div><Button type="submit">Enregistrer l’animation</Button></div>
      </form>
      <h2 id="pourquoi" className="text-h3 font-semibold">Pourquoi choisir ExploCardio.fr ?</h2>
      <p className="text-muted">
        Six cartes, chacune avec un schéma fixe (il change avec le site, pas ici), un titre et une phrase. Les cartes 3 et 4 sont à confirmer avec
        Régis (assistance et points de fidélité).
      </p>
      <form action={enregistrerRaisons} className="flex flex-col gap-6">
        <input type="hidden" name="modifieLe" value={recenteRaisons?.toISOString() ?? ""} />
        {CLES_RAISONS.map((cle, i) => (
          <Card key={cle} className="grid gap-3">
            <h3 className="font-semibold">Carte {i + 1}</h3>
            <ChampAdmin id={`${cle}-titre`} libelle={`Titre (${LR.titre} caractères au plus)`}>
              <input id={`${cle}-titre`} name={`${cle}-titre`} maxLength={LR.titre} defaultValue={raisons[i]!.titre} required className={classeChamp} />
            </ChampAdmin>
            <ChampAdmin id={`${cle}-phrase`} libelle={`Phrase (${LR.phrase} caractères au plus)`}>
              <textarea id={`${cle}-phrase`} name={`${cle}-phrase`} maxLength={LR.phrase} rows={2} defaultValue={raisons[i]!.phrase} required className={`${classeChamp} py-2`} />
            </ChampAdmin>
          </Card>
        ))}
        <div><Button type="submit">Enregistrer les cartes</Button></div>
      </form>
      <Card>
        <h2 className="mb-3 text-h3 font-semibold">Aperçu de l’accueil</h2>
        <ApercuCadres chemin="/" />
      </Card>
    </div>
  );
}
