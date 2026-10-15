import type { Metadata } from "next";
import { ecranDemonstration } from "@/connecteurs/demonstration";
import { saisieDepuisCentimes } from "@/lib/montants";
import { Button, Kicker, Retour } from "@/ui";
import { modifierOffreMad, modifierPrix } from "../actions";

export const metadata: Metadata = { title: "Prix de démonstration" };

const champ = "min-h-11 w-32 rounded-sm border border-muted bg-surface px-2 text-right";

export default async function Prix({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const resultat = await searchParams;
  const { variantes } = await ecranDemonstration.apercu();
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Démonstration</Kicker>
      <h1 className="text-h2 font-light">Prix</h1>
      <p className="text-muted">Prix HT inventés. Une modification est visible sur le site dans les secondes qui suivent.</p>
      <Retour {...resultat} />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Prix HT des articles de démonstration</caption>
          <thead>
            <tr className="border-b border-line text-small text-muted">
              <th scope="col" className="py-2 pr-4 font-medium">Article</th>
              <th scope="col" className="py-2 pr-4 font-medium">Référence</th>
              <th scope="col" className="py-2 pr-4 font-medium">Prix HT (€)</th>
              <th scope="col" className="py-2 font-medium">Mise à disposition (€ HT)</th>
            </tr>
          </thead>
          <tbody>
            {variantes.map((v) => {
              const libelle = `${v.modele.marque} ${v.modele.nom}${v.configuration ? ` — ${v.configuration}` : ""}`;
              return (
                <tr key={v.defaultCode} className="border-b border-line align-top">
                  <th scope="row" className="py-2 pr-4 font-normal">{libelle}</th>
                  <td className="py-2 pr-4 text-small">{v.defaultCode}</td>
                  <td className="py-2 pr-4">
                    <form action={modifierPrix} className="flex items-center gap-2">
                      <input type="hidden" name="defaultCode" value={v.defaultCode} />
                      <label className="sr-only" htmlFor={`prix-${v.defaultCode}`}>Prix HT de {libelle}</label>
                      <input id={`prix-${v.defaultCode}`} name="prix" inputMode="decimal" defaultValue={saisieDepuisCentimes(v.prixHtCentimes)} className={champ} />
                      <Button type="submit" variante="secondaire" aria-label={`Enregistrer le prix de ${libelle}`}>Enregistrer</Button>
                    </form>
                  </td>
                  <td className="py-2">
                    {v.offreMad ? (
                      <form action={modifierOffreMad} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="defaultCode" value={v.defaultCode} />
                        <label className="text-small" htmlFor={`m1-${v.defaultCode}`}>1er mois</label>
                        <input id={`m1-${v.defaultCode}`} name="premierMois" inputMode="decimal" defaultValue={saisieDepuisCentimes(v.offreMad.premierMoisCentimes)} className={champ} />
                        <label className="text-small" htmlFor={`ms-${v.defaultCode}`}>mois suivants</label>
                        <input id={`ms-${v.defaultCode}`} name="moisSuivants" inputMode="decimal" defaultValue={saisieDepuisCentimes(v.offreMad.moisSuivantsCentimes)} className={champ} />
                        <Button type="submit" variante="secondaire" aria-label={`Enregistrer la mise à disposition de ${libelle}`}>Enregistrer</Button>
                      </form>
                    ) : (
                      <span className="text-small text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
