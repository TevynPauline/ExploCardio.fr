import Link from "next/link";
import type { EntreeNavigation } from "@/domaine/navigation";
import { euros } from "@/lib/montants";
import { Dots } from "../Dots";

/**
 * Méga-menu sobre (FR-004) : moins haut et moins large que la page ; sous-catégories,
 * produits phares, liens rapides. Prix affichés HT.
 */
export function MegaMenu({
  entree,
  visible,
  surNavigation,
}: {
  entree: EntreeNavigation;
  visible: boolean;
  surNavigation: () => void;
}) {
  return (
    <div
      id={`megamenu-${entree.cle}`}
      hidden={!visible}
      className={visible ? "absolute inset-x-0 top-full hidden lg:block" : "hidden"}
    >
      <div className="mx-auto max-w-page px-4">
        <div className="mt-2 max-h-[70vh] overflow-y-auto rounded-lg border border-line bg-surface p-6 shadow">
          <div className="grid grid-cols-3 gap-8">
            <section aria-labelledby={`mm-sc-${entree.cle}`}>
              <h2 id={`mm-sc-${entree.cle}`} className="ec-kicker mb-3">
                <Dots />
                {entree.libelle}
              </h2>
              <ul className="flex flex-col">
                {entree.sousCategories.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} onClick={surNavigation} className="inline-flex min-h-11 items-center text-ink hover:text-action">
                      {l.libelle}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href={entree.href} onClick={surNavigation} className="inline-flex min-h-11 items-center font-medium text-action">
                    Tout voir
                  </Link>
                </li>
              </ul>
            </section>
            {entree.produitsPhares.length ? (
              <section aria-labelledby={`mm-pp-${entree.cle}`}>
                <h2 id={`mm-pp-${entree.cle}`} className="mb-3 text-small font-semibold text-muted">
                  Produits phares
                </h2>
                <ul className="flex flex-col gap-1">
                  {entree.produitsPhares.map((p) => (
                    <li key={p.href}>
                      <Link href={p.href} onClick={surNavigation} className="flex min-h-11 flex-col justify-center rounded-sm px-2 py-1 hover:bg-pale">
                        <span className="font-medium text-ink">{p.libelle}</span>
                        <span className="text-small text-muted">
                          {p.sousTitre} · à partir de {euros(p.prixHt)} HT
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {entree.liensRapides.length ? (
              <section aria-labelledby={`mm-lr-${entree.cle}`}>
                <h2 id={`mm-lr-${entree.cle}`} className="mb-3 text-small font-semibold text-muted">
                  Liens rapides
                </h2>
                <ul className="flex flex-col">
                  {entree.liensRapides.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} onClick={surNavigation} className="inline-flex min-h-11 items-center text-ink hover:text-action">
                        {l.libelle}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
