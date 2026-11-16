"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Colonne, EntreeNavigation, Lien } from "@/domaine/navigation";
import { IconeChevron, IconeFermer, IconeMenu } from "./icones";

/**
 * Menu replié pour mobile et tablette (FR-007, F27) : même contenu que sur ordinateur, en
 * listes dépliables (entrée, puis colonne ; le niveau 3 s'affiche sous son niveau 2). Fenêtre modale native (<dialog>) : focus retenu, Échap pour fermer, fond inerte,
 * défilement de la page bloqué.
 */
export function MenuMobile({ entrees, liensSecondaires }: { entrees: EntreeNavigation[]; liensSecondaires: Lien[] }) {
  const dialogue = useRef<HTMLDialogElement>(null);
  const [deplie, setDeplie] = useState<string | null>(null);
  const [colonne, setColonne] = useState<string | null>(null);

  const ouvrir = () => {
    dialogue.current?.showModal();
    document.documentElement.style.overflow = "hidden";
  };
  const fermer = () => dialogue.current?.close();

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={ouvrir}
        aria-haspopup="dialog"
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-pill px-2 text-small font-medium text-ink hover:bg-pale"
      >
        <IconeMenu />
        <span className="sr-only sm:not-sr-only">Menu</span>
      </button>
      <dialog
        ref={dialogue}
        aria-label="Menu"
        onClose={() => {
          document.documentElement.style.overflow = "";
        }}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-surface p-0 text-ink backdrop:bg-dark/40"
      >
        <div className="flex items-center justify-between border-b border-line px-4">
          <span className="text-h3 font-semibold">Menu</span>
          <button type="button" onClick={fermer} className="inline-flex size-11 items-center justify-center rounded-pill hover:bg-pale">
            <IconeFermer />
            <span className="sr-only">Fermer le menu</span>
          </button>
        </div>
        <nav aria-label="Navigation principale" className="px-4 pb-8">
          <ul>
            {entrees.map((e) => {
              const ouvert = deplie === e.cle;
              return (
                <li key={e.cle} className="border-b border-line">
                  <button
                    type="button"
                    aria-expanded={ouvert}
                    aria-controls={`mobile-${e.cle}`}
                    onClick={() => setDeplie(ouvert ? null : e.cle)}
                    className="flex min-h-14 w-full items-center justify-between text-left font-medium"
                  >
                    {e.libelle}
                    <IconeChevron className={ouvert ? "rotate-180" : ""} />
                  </button>
                  <ul id={`mobile-${e.cle}`} hidden={!ouvert} className="pb-3 pl-3">
                    {e.colonnes.map((c, i) => (
                      <ColonneMobile
                        key={c.titre}
                        id={`mobile-${e.cle}-${i}`}
                        colonne={c}
                        ouverte={colonne === `${e.cle}-${i}`}
                        basculer={() => setColonne(colonne === `${e.cle}-${i}` ? null : `${e.cle}-${i}`)}
                        fermer={fermer}
                      />
                    ))}
                    {e.carte ? (
                      <li>
                        <Link href={e.carte.bouton.href} onClick={fermer} className="flex min-h-11 items-center font-medium text-action">
                          {e.carte.bouton.libelle}
                        </Link>
                      </li>
                    ) : null}
                    <li>
                      <Link href={e.lienFinal?.href ?? e.href} onClick={fermer} className="flex min-h-11 items-center font-medium text-action">
                        {e.lienFinal?.libelle ?? "Tout voir"}
                      </Link>
                    </li>
                  </ul>
                </li>
              );
            })}
            {liensSecondaires.map((l) => (
              <li key={l.href} className="border-b border-line">
                <Link href={l.href} onClick={fermer} className="flex min-h-14 items-center font-medium">
                  {l.libelle}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </dialog>
    </div>
  );
}

/** Colonne d'un panneau : titre dépliable, liens de niveau 2 et, dessous, leurs niveaux 3. */
function ColonneMobile({ id, colonne, ouverte, basculer, fermer }: { id: string; colonne: Colonne; ouverte: boolean; basculer: () => void; fermer: () => void }) {
  if (!colonne.liens.length) {
    return colonne.href ? (
      <li>
        <Link href={colonne.href} onClick={fermer} className="flex min-h-11 items-center text-ink">
          {colonne.titre}
        </Link>
      </li>
    ) : null;
  }
  return (
    <li>
      <button type="button" aria-expanded={ouverte} aria-controls={id} onClick={basculer} className="flex min-h-11 w-full items-center justify-between text-left text-ink">
        {colonne.titre}
        <IconeChevron className={ouverte ? "rotate-180" : ""} />
      </button>
      <ul id={id} hidden={!ouverte} className="pb-2 pl-3">
        {colonne.liens.map((l) => (
          <li key={l.href + l.libelle}>
            <Link href={l.href} onClick={fermer} className={`flex min-h-11 items-center text-ink ${l.enGras ? "font-semibold" : ""}`}>
              {l.libelle}
            </Link>
            {l.sousLiens.length ? (
              <ul className="pl-3">
                {l.sousLiens.map((s) => (
                  <li key={s.href}>
                    <Link href={s.href} onClick={fermer} className="flex min-h-11 items-center text-small text-muted">
                      {s.libelle}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
        {colonne.href ? (
          <li>
            <Link href={colonne.href} onClick={fermer} className="flex min-h-11 items-center text-small font-medium text-action">
              Tout voir : {colonne.titre}
            </Link>
          </li>
        ) : null}
      </ul>
    </li>
  );
}
