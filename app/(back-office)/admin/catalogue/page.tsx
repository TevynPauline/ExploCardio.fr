import type { Metadata } from "next";
import Link from "next/link";
import { aCompleter, listerPourAdmin, type LigneAdmin } from "@/domaine/catalogue/administration";
import { FAMILLES } from "@/domaine/familles";
import { euros } from "@/lib/montants";
import { Kicker } from "@/ui";
import { classeChamp } from "@/ui/admin";

export const metadata: Metadata = { title: "Catalogue" };

const ETATS: Record<LigneAdmin["etat"], string> = {
  a_rediger: "À rédiger",
  preparation: "En préparation",
  publie: "Publié",
  retire: "Retiré",
  orphelin: "Absent d'Odoo",
};

const CATEGORIES = Object.values(FAMILLES).map((f) => ({ code: f.categorie, libelle: f.libelle }));

// Liste des articles d'Odoo et de l'état de leurs contenus (F03, US6).
export default async function Catalogue({ searchParams }: { searchParams: Promise<{ categorie?: string; q?: string; etat?: string }> }) {
  const { categorie, q, etat } = await searchParams;
  const { lignes, odooIndisponible } = await listerPourAdmin();
  const texte = (q ?? "").trim().toLowerCase();
  const visibles = lignes.filter(
    (l) =>
      (!categorie || l.article?.categorie === categorie) &&
      (!etat || l.etat === etat) &&
      (!texte || `${l.reference} ${l.article?.nom ?? ""} ${l.article?.marque ?? ""}`.toLowerCase().includes(texte)),
  );
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Catalogue</Kicker>
      <h1 className="text-h2 font-light">Produits du catalogue</h1>
      <p className="max-w-prose text-muted">
        Les produits, configurations, prix, stocks et références se gèrent dans Odoo. Ici, vous rédigez ce qui les présente sur le site
        (textes, photos, documents, compatibilités) et vous les publiez.
      </p>
      <p className="flex flex-wrap gap-4">
        <Link href="/admin/catalogue/sous-categories" className="ec-btn ec-btn--secondary">Types (filtres des catégories)</Link>
        <Link href="/admin/catalogue/services" className="ec-btn ec-btn--secondary">Pages services et financement</Link>
      </p>
      {odooIndisponible ? (
        <p role="alert" className="ec-box--promo p-4 font-medium">Odoo est momentanément injoignable : seuls les contenus du site sont affichés.</p>
      ) : null}
      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="filtre-categorie" className="text-small font-medium">Catégorie</label>
          <select id="filtre-categorie" name="categorie" defaultValue={categorie ?? ""} className={classeChamp}>
            <option value="">Toutes</option>
            {CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.libelle}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="filtre-etat" className="text-small font-medium">État</label>
          <select id="filtre-etat" name="etat" defaultValue={etat ?? ""} className={classeChamp}>
            <option value="">Tous</option>
            {Object.entries(ETATS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="filtre-q" className="text-small font-medium">Rechercher</label>
          <input id="filtre-q" name="q" defaultValue={q ?? ""} className={classeChamp} />
        </div>
        <button type="submit" className="ec-btn ec-btn--secondary">Filtrer</button>
      </form>
      <p role="status" className="text-small text-muted">{visibles.length} produit{visibles.length > 1 ? "s" : ""}</p>
      {/* Zone défilante atteignable au clavier sur petit écran (WCAG 2.1.1). */}
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tableau des produits">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Produits et état de leurs contenus</caption>
          <thead>
            <tr className="border-b border-line text-small text-muted">
              <th scope="col" className="py-2 pr-4 font-medium">Produit</th>
              <th scope="col" className="py-2 pr-4 font-medium">Catégorie</th>
              <th scope="col" className="py-2 pr-4 font-medium">Prix HT (Odoo)</th>
              <th scope="col" className="py-2 pr-4 font-medium">Contenu</th>
              <th scope="col" className="py-2 font-medium">Ce qui manque</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((l) => (
              <tr key={l.reference} className="border-b border-line align-top">
                <th scope="row" className="py-2 pr-4 font-normal">
                  <Link href={`/admin/catalogue/${encodeURIComponent(l.reference)}`} className="inline-flex min-h-11 items-center font-medium">
                    {l.article ? `${l.article.marque} ${l.article.nom}` : l.reference}
                  </Link>
                  <span className="block text-small text-muted">Réf. {l.reference}</span>
                </th>
                <td className="py-2 pr-4">{CATEGORIES.find((c) => c.code === l.article?.categorie)?.libelle ?? "—"}</td>
                <td className="py-2 pr-4">{l.article ? euros(Math.min(...l.article.variantes.map((v) => v.prixHt))) : "—"}</td>
                <td className="py-2 pr-4">{ETATS[l.etat]}</td>
                <td className="py-2">{aCompleter(l).join(", ") || "Rien"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
