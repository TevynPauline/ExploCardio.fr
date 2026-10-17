"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type Props = {
  marques: string[];
  types: { slug: string; libelle: string }[];
  dispos: ("disponible" | "delai" | "indisponible")[];
  valeurs: { marque?: string; type?: string; dispo?: string; tri?: string };
  total: number;
};

const LIBELLES_DISPO = { disponible: "Disponible", delai: "Avec délai", indisponible: "Indisponible" } as const;
const classeChamp = "min-h-11 rounded-sm border border-muted bg-surface px-3 text-ink";

/**
 * Filtres d'une catégorie (FR-007) : dans l'adresse, pour être partageables et fonctionner
 * sans JavaScript (bouton « Appliquer ») ; avec JavaScript, la liste se met à jour dès qu'un
 * choix change. Le nombre de résultats est annoncé ; chaque filtre actif se retire seul.
 */
export function Filtres({ marques, types, dispos, valeurs, total }: Props) {
  const router = useRouter();
  const chemin = usePathname();
  const parametres = useSearchParams();
  const [enCours, demarrer] = useTransition();

  function changer(nom: string, valeur: string) {
    const p = new URLSearchParams(parametres.toString());
    if (valeur) p.set(nom, valeur);
    else p.delete(nom);
    const q = p.toString();
    demarrer(() => router.replace(q ? `${chemin}?${q}` : chemin, { scroll: false }));
  }

  function sans(nom: string) {
    const p = new URLSearchParams(parametres.toString());
    p.delete(nom);
    const q = p.toString();
    return q ? `${chemin}?${q}` : chemin;
  }

  const actifs = [
    valeurs.marque ? { nom: "marque", libelle: `Marque : ${valeurs.marque}` } : null,
    valeurs.type ? { nom: "type", libelle: `Type : ${types.find((t) => t.slug === valeurs.type)?.libelle ?? valeurs.type}` } : null,
    valeurs.dispo ? { nom: "dispo", libelle: LIBELLES_DISPO[valeurs.dispo as keyof typeof LIBELLES_DISPO] ?? valeurs.dispo } : null,
  ].filter((x): x is { nom: string; libelle: string } => Boolean(x));

  return (
    <section aria-labelledby="titre-filtres" className="flex flex-col gap-3">
      <h2 id="titre-filtres" className="sr-only">Filtrer les produits</h2>
      <form method="get" action={chemin} className="flex flex-wrap items-end gap-3">
        {marques.length > 1 ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="filtre-marque" className="text-small font-medium">Marque</label>
            <select id="filtre-marque" name="marque" defaultValue={valeurs.marque ?? ""} onChange={(e) => changer("marque", e.target.value)} className={classeChamp}>
              <option value="">Toutes</option>
              {marques.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        ) : null}
        {types.length > 1 ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="filtre-type" className="text-small font-medium">Type</label>
            <select id="filtre-type" name="type" defaultValue={valeurs.type ?? ""} onChange={(e) => changer("type", e.target.value)} className={classeChamp}>
              <option value="">Tous</option>
              {types.map((t) => <option key={t.slug} value={t.slug}>{t.libelle}</option>)}
            </select>
          </div>
        ) : null}
        {dispos.length > 1 ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="filtre-dispo" className="text-small font-medium">Disponibilité</label>
            <select id="filtre-dispo" name="dispo" defaultValue={valeurs.dispo ?? ""} onChange={(e) => changer("dispo", e.target.value)} className={classeChamp}>
              <option value="">Toutes</option>
              {dispos.map((d) => <option key={d} value={d}>{LIBELLES_DISPO[d]}</option>)}
            </select>
          </div>
        ) : null}
        <div className="flex flex-col gap-1">
          <label htmlFor="filtre-tri" className="text-small font-medium">Trier par</label>
          <select id="filtre-tri" name="tri" defaultValue={valeurs.tri === "prix" ? "prix" : ""} onChange={(e) => changer("tri", e.target.value)} className={classeChamp}>
            <option value="">Notre sélection</option>
            <option value="prix">Prix croissant</option>
          </select>
        </div>
        <noscript>
          <button type="submit" className="ec-btn ec-btn--secondary">Appliquer</button>
        </noscript>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        <p role="status" aria-live="polite" aria-busy={enCours} className="font-medium text-ink">
          {total} {total > 1 ? "produits" : "produit"}
        </p>
        {actifs.map((a) => (
          <Link key={a.nom} href={sans(a.nom)} scroll={false} className="ec-btn ec-btn--secondary min-h-11 text-small" aria-label={`Retirer le filtre ${a.libelle}`}>
            {a.libelle} <span aria-hidden="true">×</span>
          </Link>
        ))}
        {actifs.length > 1 ? (
          <Link href={chemin} scroll={false} className="min-h-11 content-center text-small">Tout retirer</Link>
        ) : null}
      </div>
    </section>
  );
}
