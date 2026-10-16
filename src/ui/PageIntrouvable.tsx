import Link from "next/link";
import { FAMILLES } from "@/domaine/familles";
import { Kicker } from "./Kicker";

/** Contenu de la page introuvable (R12) : accueil, recherche, familles de produits. */
export function PageIntrouvable() {
  return (
    <div className="mx-auto flex max-w-page flex-col gap-6 px-4 py-16">
      <Kicker>Page introuvable</Kicker>
      <h1 className="text-display font-light">Cette page n’existe pas</h1>
      <p>L’adresse est peut-être incomplète, ou la page a été déplacée.</p>
      <form action="/recherche" className="flex max-w-xl gap-2">
        <label htmlFor="q-404" className="sr-only">Rechercher un produit, une référence ou un service</label>
        <input id="q-404" name="q" type="search" placeholder="Produit, référence, service…" className="min-h-11 w-full rounded-sm border border-muted bg-surface px-3" />
        <button type="submit" className="ec-btn ec-btn--primary">Rechercher</button>
      </form>
      <ul className="flex flex-wrap gap-2">
        <li><Link href="/" className="ec-btn ec-btn--primary">Accueil</Link></li>
        {Object.values(FAMILLES).map((f) => (
          <li key={f.cle}><Link href={f.chemin} className="ec-btn ec-btn--secondary">{f.libelle}</Link></li>
        ))}
      </ul>
    </div>
  );
}
