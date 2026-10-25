"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { EntreeNavigation } from "@/domaine/navigation";
import { IconeChevron, IconeFermer, IconeMenu } from "./icones";

/**
 * Menu replié pour mobile et tablette (FR-007) : même contenu que sur ordinateur, en
 * accordéons. Fenêtre modale native (<dialog>) : focus retenu, Échap pour fermer, fond inerte,
 * défilement de la page bloqué.
 */
export function MenuMobile({ entrees }: { entrees: EntreeNavigation[] }) {
  const dialogue = useRef<HTMLDialogElement>(null);
  const [deplie, setDeplie] = useState<string | null>(null);

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
                    {[...e.sousCategories, ...e.produitsPhares.map((p) => ({ libelle: p.libelle, href: p.href })), ...e.liensRapides].map((l) => (
                      <li key={`${l.href}-${l.libelle}`}>
                        <Link href={l.href} onClick={fermer} className="flex min-h-11 items-center text-ink">
                          {l.libelle}
                        </Link>
                      </li>
                    ))}
                    <li>
                      <Link href={e.href} onClick={fermer} className="flex min-h-11 items-center font-medium text-action">
                        Tout voir
                      </Link>
                    </li>
                  </ul>
                </li>
              );
            })}
          </ul>
        </nav>
      </dialog>
    </div>
  );
}
