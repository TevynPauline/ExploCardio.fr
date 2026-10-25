import Link from "next/link";

// Fil d'Ariane commun (F16, FR-003, FR-004) : place de la page dans le site, pas l'historique du
// navigateur. « Accueil » est ajouté en tête ; la dernière étape est la page courante. Sur
// téléphone, un seul lien « ‹ Rubrique parente » pour tenir sur une ligne.

export type EtapeFil = { libelle: string; href?: string };

export function FilAriane({ etapes }: { etapes: EtapeFil[] }) {
  const toutes: EtapeFil[] = [{ libelle: "Accueil", href: "/" }, ...etapes];
  const parent = [...toutes.slice(0, -1)].reverse().find((e) => e.href);
  return (
    <nav aria-label="Fil d’Ariane" className="text-small">
      {parent ? (
        <Link href={parent.href!} className="inline-flex min-h-11 items-center gap-1 sm:hidden">
          <span aria-hidden="true">‹</span> {parent.libelle}
        </Link>
      ) : null}
      <ol className="hidden flex-wrap items-center gap-x-2 sm:flex">
        {toutes.map((e, i) => {
          const derniere = i === toutes.length - 1;
          return (
            <li key={`${e.libelle}-${i}`} className="flex items-center gap-2">
              {derniere || !e.href ? (
                <span aria-current={derniere ? "page" : undefined} className="inline-flex min-h-11 items-center text-muted">{e.libelle}</span>
              ) : (
                <Link href={e.href} className="inline-flex min-h-11 items-center">{e.libelle}</Link>
              )}
              {derniere ? null : <span aria-hidden="true" className="text-muted">›</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
