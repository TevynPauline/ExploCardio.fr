import Link from "next/link";
import type { EntreeNavigation } from "@/domaine/navigation";

/**
 * Méga-menu sobre (FR-004, F27) : un seul panneau à colonnes. Titre de colonne, liens de niveau 2
 * (en gras s'ils ont des sous-niveaux) et liens de niveau 3 plus discrets ; encadré d'appel
 * facultatif ; lien de fin. Aucun motif « trois points » devant les titres (FR-003).
 */
export function MegaMenu({
  entree,
  visible,
  surNavigation,
  surSurvol,
  surSortie,
}: {
  entree: EntreeNavigation;
  visible: boolean;
  surNavigation: () => void;
  /** Souris sur le panneau : il reste ouvert ; dès qu'elle en sort, il se referme. */
  surSurvol?: () => void;
  surSortie?: () => void;
}) {
  const colonnes = entree.colonnes.length + (entree.carte ? 1 : 0);
  return (
    <div id={`megamenu-${entree.cle}`} hidden={!visible} className={visible ? "absolute inset-x-0 top-full hidden lg:block" : "hidden"}>
      <div className="mx-auto max-w-page px-4">
        <div onMouseEnter={surSurvol} onMouseLeave={surSortie} className="mt-2 max-h-[70vh] overflow-y-auto rounded-lg border border-line bg-surface p-6 shadow">
          <div className="grid gap-8" style={{ gridTemplateColumns: `repeat(${Math.max(colonnes, 1)}, minmax(0, 1fr))` }}>
            {entree.colonnes.map((c, i) => (
              <section key={c.titre} aria-labelledby={`mm-${entree.cle}-${i}`}>
                <h2 id={`mm-${entree.cle}-${i}`} className="ec-kicker mb-1">
                  {c.href ? (
                    <Link href={c.href} onClick={surNavigation} className="inline-flex min-h-11 items-center hover:text-action">
                      {c.titre}
                    </Link>
                  ) : (
                    <span className="inline-flex min-h-11 items-center">{c.titre}</span>
                  )}
                </h2>
                <ul className="flex flex-col">
                  {c.liens.map((l) => (
                    <li key={l.href + l.libelle}>
                      <Link
                        href={l.href}
                        onClick={surNavigation}
                        className={`inline-flex min-h-11 items-center text-ink hover:text-action hover:underline ${l.enGras ? "font-semibold" : ""}`}
                      >
                        {l.libelle}
                      </Link>
                      {l.sousLiens.length ? (
                        <ul className="mb-1 flex flex-col pl-3">
                          {l.sousLiens.map((s) => (
                            <li key={s.href}>
                              <Link href={s.href} onClick={surNavigation} className="inline-flex min-h-11 items-center text-small text-muted hover:text-action hover:underline">
                                {s.libelle}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {entree.carte ? (
              <section aria-labelledby={`mm-${entree.cle}-carte`} className="flex flex-col gap-2 self-start rounded-lg bg-pale p-5">
                <h2 id={`mm-${entree.cle}-carte`} className="font-semibold text-ink">
                  {entree.carte.titre}
                </h2>
                <p className="text-small text-ink">{entree.carte.texte}</p>
                <Link href={entree.carte.bouton.href} onClick={surNavigation} className="ec-btn ec-btn--primary self-start">
                  {entree.carte.bouton.libelle}
                </Link>
              </section>
            ) : null}
          </div>
          {entree.lienFinal ? (
            <p className="mt-4 border-t border-line pt-3">
              <Link href={entree.lienFinal.href} onClick={surNavigation} className="inline-flex min-h-11 items-center font-semibold text-action underline underline-offset-2">
                {entree.lienFinal.libelle}
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
