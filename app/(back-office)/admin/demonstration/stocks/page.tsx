import type { Metadata } from "next";
import { ecranDemonstration } from "@/connecteurs/demonstration";
import { Button, Kicker, Retour } from "@/ui";
import { modifierStock } from "../actions";

export const metadata: Metadata = { title: "Stocks de démonstration" };

const champ = "min-h-11 rounded-sm border border-muted bg-surface px-2";

export default async function Stocks({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const resultat = await searchParams;
  const { variantes } = await ecranDemonstration.apercu();
  const stockables = variantes.filter((v) => v.modele.type !== "logiciel" && v.modele.type !== "service");
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Démonstration</Kicker>
      <h1 className="text-h2 font-light">Stocks</h1>
      <p className="text-muted">
        Quand la quantité est épuisée, l’article passe en « délai X jours » ou « indisponible ».
      </p>
      <Retour {...resultat} />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Stocks des articles de démonstration</caption>
          <thead>
            <tr className="border-b border-line text-small text-muted">
              <th scope="col" className="py-2 pr-4 font-medium">Article</th>
              <th scope="col" className="py-2 font-medium">Stock</th>
            </tr>
          </thead>
          <tbody>
            {stockables.map((v) => {
              const libelle = `${v.modele.marque} ${v.modele.nom}${v.configuration ? ` — ${v.configuration}` : ""}`;
              const id = v.defaultCode;
              return (
                <tr key={id} className="border-b border-line align-top">
                  <th scope="row" className="py-2 pr-4 font-normal">
                    {libelle}
                    <span className="block text-small text-muted">{id}</span>
                  </th>
                  <td className="py-2">
                    <form action={modifierStock} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="defaultCode" value={id} />
                      <label className="text-small" htmlFor={`q-${id}`}>Quantité</label>
                      <input id={`q-${id}`} name="quantite" inputMode="numeric" defaultValue={v.stock?.quantite ?? 0} className={`${champ} w-20 text-right`} />
                      <label className="text-small" htmlFor={`e-${id}`}>Si épuisé</label>
                      <select id={`e-${id}`} name="etatHorsStock" defaultValue={v.stock?.etatHorsStock === "indisponible" ? "indisponible" : "delai"} className={champ}>
                        <option value="delai">délai</option>
                        <option value="indisponible">indisponible</option>
                      </select>
                      <label className="text-small" htmlFor={`d-${id}`}>Délai (jours)</label>
                      <input id={`d-${id}`} name="delaiJours" inputMode="numeric" defaultValue={v.stock?.delaiJours ?? ""} className={`${champ} w-20 text-right`} />
                      <Button type="submit" variante="secondaire" aria-label={`Enregistrer le stock de ${libelle}`}>Enregistrer</Button>
                    </form>
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
