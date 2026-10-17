import type { Metadata } from "next";
import Link from "next/link";
import { FAMILLES } from "@/domaine/familles";
import { dbSite } from "@/lib/db/site";
import { sessionCourante } from "@/lib/roles";
import { Card, Kicker, Retour } from "@/ui";
import { classeChamp } from "@/ui/admin";
import { actionSousCategorie } from "../actions";

export const metadata: Metadata = { title: "Types du catalogue" };

// Types (sous-catégories servant de filtre) de chaque catégorie (F03, FR-036, FR-007).
export default async function SousCategories({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const retour = await searchParams;
  const [liste, comptes, session] = await Promise.all([
    dbSite().sousCategorie.findMany({ orderBy: [{ categorie: "asc" }, { ordre: "asc" }] }),
    dbSite().contenuProduit.groupBy({ by: ["sousCategorieId"], _count: true }),
    sessionCourante(),
  ]);
  const admin = (session?.user as { role?: string } | undefined)?.role === "admin";
  const nombre = new Map(comptes.map((c) => [c.sousCategorieId, c._count]));
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Catalogue</Kicker>
      <h1 className="text-h2 font-light">Types (filtres des catégories)</h1>
      <p><Link href="/admin/catalogue" className="inline-flex min-h-11 items-center">Retour à la liste</Link></p>
      <Retour {...retour} />
      {Object.values(FAMILLES).map((f) => {
        const types = liste.filter((s) => s.categorie === f.categorie);
        return (
          <Card key={f.cle} className="flex flex-col gap-3">
            <h2 className="text-h3 font-semibold">{f.libelle}</h2>
            {types.length ? (
              <ul className="flex list-none flex-col gap-2 p-0">
                {types.map((s, i) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3">
                    <span className="min-w-48">
                      {s.libelle} <span className="text-small text-muted">({nombre.get(s.id) ?? 0} produit{(nombre.get(s.id) ?? 0) > 1 ? "s" : ""})</span>
                    </span>
                    {admin ? (
                      <form action={actionSousCategorie} className="flex flex-wrap gap-2">
                        <input type="hidden" name="id" value={s.id} />
                        {i > 0 ? <button type="submit" name="action" value="monter" className="ec-btn ec-btn--secondary" aria-label={`Monter ${s.libelle}`}>Monter</button> : null}
                        {i < types.length - 1 ? <button type="submit" name="action" value="descendre" className="ec-btn ec-btn--secondary" aria-label={`Descendre ${s.libelle}`}>Descendre</button> : null}
                        <button type="submit" name="action" value="supprimer" className="ec-btn ec-btn--secondary" aria-label={`Supprimer ${s.libelle}`}>Supprimer</button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">Aucun type : le filtre « Type » n’est pas proposé dans cette catégorie.</p>
            )}
            {admin ? (
              <form action={actionSousCategorie} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="action" value="creer" />
                <input type="hidden" name="categorie" value={f.categorie} />
                <div className="flex flex-col gap-1">
                  <label htmlFor={`nouveau-${f.cle}`} className="text-small font-medium">Nouveau type</label>
                  <input id={`nouveau-${f.cle}`} name="libelle" className={classeChamp} />
                </div>
                <button type="submit" className="ec-btn ec-btn--primary">Ajouter</button>
              </form>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
