import type { Metadata } from "next";
import { dbSite } from "@/lib/db/site";
import { Button, Card, Kicker, Retour } from "@/ui";
import { ChampAdmin, classeChamp } from "@/ui/admin";
import { ajouterElementMenu, supprimerElementMenu } from "../actions";

export const metadata: Metadata = { title: "Menus" };

const ENTREES = [
  ["holter_ecg", "Holter ECG"],
  ["holter_tensionnel", "Holter tensionnel"],
  ["epreuve_effort", "Épreuve d'effort"],
  ["accessoires", "Accessoires & consommables"],
  ["services", "Services"],
  ["financement", "Financement"],
  ["qui_sommes_nous", "Qui sommes-nous / Contact"],
] as const;

// Produits phares et liens rapides des méga-menus ; les sous-catégories viennent du catalogue.
export default async function Menus({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const r = await searchParams;
  const elements = await dbSite().elementMenu.findMany({ orderBy: [{ entree: "asc" }, { type: "asc" }, { ordre: "asc" }] });
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Contenus</Kicker>
      <h1 className="text-h2 font-light">Menus</h1>
      <p className="text-muted">Sans produit phare choisi, le menu présente les premiers équipements de la famille.</p>
      <Retour {...r} />
      {ENTREES.map(([cle, libelle]) => {
        const liste = elements.filter((e) => e.entree === cle);
        return (
          <Card key={cle}>
            <h2 className="mb-3 text-h3 font-semibold">{libelle}</h2>
            {liste.length ? (
              <ul className="mb-4 flex flex-col gap-2">
                {liste.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>{e.type === "produit_phare" ? `Produit phare : ${e.defaultCode}` : `Lien rapide : ${e.libelle} → ${e.lien}`}</span>
                    <form action={supprimerElementMenu}>
                      <input type="hidden" name="id" value={e.id} />
                      <Button type="submit" variante="secondaire">Retirer</Button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <form action={ajouterElementMenu} className="flex flex-col gap-2">
                <input type="hidden" name="entree" value={cle} />
                <input type="hidden" name="type" value="produit_phare" />
                <ChampAdmin id={`ref-${cle}`} libelle="Ajouter un produit phare (référence)">
                  <input id={`ref-${cle}`} name="reference" placeholder="EC-DMS-3004L" className={classeChamp} />
                </ChampAdmin>
                <div><Button type="submit" variante="secondaire">Ajouter le produit</Button></div>
              </form>
              <form action={ajouterElementMenu} className="flex flex-col gap-2">
                <input type="hidden" name="entree" value={cle} />
                <input type="hidden" name="type" value="lien_rapide" />
                <ChampAdmin id={`lib-${cle}`} libelle="Ajouter un lien rapide : libellé">
                  <input id={`lib-${cle}`} name="libelle" className={classeChamp} />
                </ChampAdmin>
                <ChampAdmin id={`lien-${cle}`} libelle="Lien">
                  <input id={`lien-${cle}`} name="lien" placeholder="/financement" className={classeChamp} />
                </ChampAdmin>
                <div><Button type="submit" variante="secondaire">Ajouter le lien</Button></div>
              </form>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
