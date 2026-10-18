"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import { actionNombreArticles } from "@/actions/panier";
import type { EntreeNavigation } from "@/domaine/navigation";
import { authClient } from "@/lib/auth-client";
import { Logo } from "../Logo";
import { IconeChevron, IconeCompte, IconePanier } from "./icones";
import { MegaMenu } from "./MegaMenu";
import { MenuMobile } from "./MenuMobile";
import { Recherche } from "./Recherche";

// Barre de navigation fixe (FR-001 à FR-007, R2). Chaque entrée est un bouton qui déplie son
// méga-menu (modèle « bouton + panneau », aria-expanded), et non un menu d'application.
// Ouverture : survol (après 150 ms), clic, toucher, clavier (Entrée, Espace, flèche bas).
// Fermeture : Échap (focus rendu à l'entrée), clic à l'extérieur, sortie de la zone.

const DELAI_SURVOL_MS = 150;

type Props = { entrees: EntreeNavigation[]; articlesPanier: number };

/** Événement émis après une modification du panier (ajout, quantité, suppression). */
export const EVENEMENT_PANIER = "ec:panier";

export function BarreNavigation({ entrees, articlesPanier: initial }: Props) {
  // Pastille du panier lue après l'affichage : les pages restent statiques (F04).
  const [articlesPanier, setArticlesPanier] = useState(initial);
  const chemin = usePathname();
  useEffect(() => {
    let actif = true;
    const relire = () => actionNombreArticles().then((n) => actif && setArticlesPanier(n)).catch(() => undefined);
    relire();
    window.addEventListener(EVENEMENT_PANIER, relire);
    return () => {
      actif = false;
      window.removeEventListener(EVENEMENT_PANIER, relire);
    };
  }, [chemin]);
  const [ouvert, setOuvert] = useState<string | null>(null);
  // Lu dans le navigateur : les pages restent statiques (rapides) pour tous les visiteurs.
  const { data: session } = authClient.useSession();
  const lienCompte = session ? "/mon-compte" : "/connexion";
  const zone = useRef<HTMLDivElement>(null);
  const boutons = useRef<Record<string, HTMLButtonElement | null>>({});
  const minuteur = useRef<number | null>(null);

  const annulerMinuteur = () => {
    if (minuteur.current) window.clearTimeout(minuteur.current);
    minuteur.current = null;
  };

  const fermer = useCallback((rendreFocus: boolean) => {
    setOuvert((actuel) => {
      if (rendreFocus && actuel) boutons.current[actuel]?.focus();
      return null;
    });
  }, []);

  // Clic à l'extérieur, Échap n'importe où
  useEffect(() => {
    if (!ouvert) return;
    const auClic = (e: PointerEvent) => {
      if (zone.current && !zone.current.contains(e.target as Node)) fermer(false);
    };
    const auClavier = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") fermer(true);
    };
    document.addEventListener("pointerdown", auClic);
    document.addEventListener("keydown", auClavier);
    return () => {
      document.removeEventListener("pointerdown", auClic);
      document.removeEventListener("keydown", auClavier);
    };
  }, [ouvert, fermer]);

  const surEntree = (cle: string) => {
    annulerMinuteur();
    minuteur.current = window.setTimeout(() => setOuvert(cle), DELAI_SURVOL_MS);
  };
  const surSortie = () => {
    annulerMinuteur();
    minuteur.current = window.setTimeout(() => setOuvert(null), DELAI_SURVOL_MS);
  };

  const auClavierEntree = (e: KeyboardEvent<HTMLButtonElement>, cle: string) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOuvert(cle);
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLAnchorElement>(`#megamenu-${cle} a`)?.focus();
      });
    }
  };

  const entreeOuverte = entrees.find((e) => e.cle === ouvert);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div ref={zone} onMouseLeave={surSortie} onMouseEnter={annulerMinuteur} className="relative">
        <div className="mx-auto flex max-w-page items-center gap-2 px-4 sm:gap-4">
          <Link href="/" aria-label="ExploCardio.fr, accueil" className="inline-flex min-h-14 min-w-0 shrink items-center">
            <span className="sm:hidden">
              <Logo hauteur={22} priority />
            </span>
            <span className="hidden sm:inline">
              <Logo hauteur={28} priority />
            </span>
          </Link>
          <div className="ml-auto flex shrink-0 items-center sm:gap-1">
            <Recherche />
            <Link
              href="/panier"
              aria-label={articlesPanier > 0 ? `Panier, ${articlesPanier} article${articlesPanier > 1 ? "s" : ""}` : "Panier, vide"}
              className="relative inline-flex size-11 items-center justify-center rounded-pill text-ink hover:bg-pale"
            >
              <IconePanier />
              {articlesPanier > 0 ? (
                <span aria-hidden="true" className="absolute right-0.5 top-0.5 min-w-5 rounded-pill bg-action px-1 text-center text-kicker font-semibold text-white">
                  {articlesPanier}
                </span>
              ) : null}
            </Link>
            <Link
              href={lienCompte}
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-pill px-2 text-small font-medium text-ink hover:bg-pale"
            >
              <IconeCompte />
              <span className="hidden lg:inline">Mon compte / Connexion</span>
              <span className="sr-only lg:hidden">Mon compte / Connexion</span>
            </Link>
            <MenuMobile entrees={entrees} />
          </div>
        </div>

        {/* Ordinateur : les sept entrées sur une seconde ligne, pour qu'elles tiennent toutes. */}
        <nav aria-label="Navigation principale" className="hidden border-t border-line xl:block">
          <ul className="mx-auto flex max-w-page flex-wrap items-center justify-center gap-x-2 px-4">
            {entrees.map((e) => (
              <li key={e.cle} onMouseEnter={() => surEntree(e.cle)}>
                <button
                  ref={(el) => {
                    boutons.current[e.cle] = el;
                  }}
                  type="button"
                  aria-expanded={ouvert === e.cle}
                  aria-controls={`megamenu-${e.cle}`}
                  onClick={() => {
                    annulerMinuteur();
                    setOuvert(ouvert === e.cle ? null : e.cle);
                  }}
                  onKeyDown={(ev) => auClavierEntree(ev, e.cle)}
                  className="inline-flex min-h-12 items-center gap-1 whitespace-nowrap px-2 text-small font-medium text-ink aria-expanded:text-action"
                >
                  {e.libelle}
                  <IconeChevron className={ouvert === e.cle ? "rotate-180" : ""} />
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {entrees.map((e) => (
          <MegaMenu key={e.cle} entree={e} visible={entreeOuverte?.cle === e.cle} surNavigation={() => setOuvert(null)} />
        ))}
      </div>
    </header>
  );
}
