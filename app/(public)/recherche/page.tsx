import type { Metadata } from "next";
import Link from "next/link";
import { rechercher } from "@/domaine/recherche/index";
import { FAMILLES } from "@/domaine/familles";
import { euros } from "@/lib/montants";
import { Card, Kicker } from "@/ui";
import { FilAriane } from "@/ui/FilAriane";

export const metadata: Metadata = { title: "Recherche" };

// Page de résultats (US4) : tous les résultats, groupés par type ; chemins alternatifs si
// rien n'est trouvé (FR-013).
export default async function PageRecherche({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const resultat = q.trim().length >= 2 ? await rechercher(q, { maxParGroupe: 100 }) : null;
  return (
    <div className="mx-auto flex max-w-page flex-col gap-6 px-4 py-10">
      <FilAriane etapes={[{ libelle: "Recherche" }]} />
      <Kicker>Recherche</Kicker>
      <h1 className="text-h2 font-light">{q ? `Résultats pour « ${q} »` : "Rechercher"}</h1>
      <form action="/recherche" className="flex max-w-xl gap-2">
        <label htmlFor="q" className="sr-only">Rechercher un produit, une référence ou un service</label>
        <input id="q" name="q" type="search" defaultValue={q} className="min-h-11 w-full rounded-sm border border-muted bg-surface px-3" />
        <button type="submit" className="ec-btn ec-btn--primary">Rechercher</button>
      </form>

      {resultat?.indisponible ? (
        <p role="status" className="ec-box--info p-4">
          La recherche est momentanément indisponible. Utilisez le menu pour parcourir le catalogue.
        </p>
      ) : null}

      {resultat && !resultat.indisponible && resultat.groupes.length === 0 ? (
        <Card>
          <p>Aucun résultat pour cette recherche. Vous pouvez parcourir nos familles de produits ou nous écrire.</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {Object.values(FAMILLES).map((f) => (
              <li key={f.cle}><Link href={f.chemin} className="ec-btn ec-btn--secondary">{f.libelle}</Link></li>
            ))}
            <li><Link href="/qui-sommes-nous#contact" className="ec-btn ec-btn--primary">Nous contacter</Link></li>
          </ul>
        </Card>
      ) : null}

      {resultat?.groupes.map((g) => (
        <section key={g.type} aria-labelledby={`groupe-${g.type}`}>
          <h2 id={`groupe-${g.type}`} className="mb-3 text-h3 font-semibold">{g.libelle}</h2>
          <ul className="flex flex-col divide-y divide-line rounded border border-line bg-surface">
            {g.elements.map((s) => (
              <li key={s.code}>
                <Link href={s.destination} className="flex min-h-11 items-center justify-between gap-4 px-4 py-3 no-underline hover:bg-pale">
                  <span>
                    <span className="block font-medium text-ink">{s.titre}</span>
                    {s.sousTitre ? <span className="block text-small text-muted">{s.sousTitre}</span> : null}
                  </span>
                  {s.prixHt !== null ? <span className="shrink-0 text-ink">{euros(s.prixHt)} HT</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
