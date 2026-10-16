"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { euros } from "@/lib/montants";
import { IconeFermer, IconeRecherche } from "./icones";

// Recherche instantanée de l'en-tête (US4, contracts/recherche.md) : champ en « combobox »
// WAI-ARIA, suggestions groupées par type dès 2 caractères, prix HT, Entrée pour la page
// de résultats. Attente de 150 ms après la frappe ; la requête précédente est annulée.

type Suggestion = { code: string; titre: string; sousTitre: string; destination: string; prixHt: number | null };
type Groupe = { type: string; libelle: string; elements: Suggestion[] };
type Reponse = { groupes: Groupe[]; indisponible: boolean };

export function Recherche() {
  const router = useRouter();
  const id = useId();
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [derniereReponse, setReponse] = useState<Reponse | null>(null);
  const [actif, setActif] = useState(-1);
  const champ = useRef<HTMLInputElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  const zone = useRef<HTMLDivElement>(null);

  // Sous 2 caractères, aucune suggestion n'est affichée (la dernière réponse est ignorée).
  const reponse = saisie.trim().length >= 2 ? derniereReponse : null;
  const elements = reponse?.groupes.flatMap((g) => g.elements) ?? [];

  useEffect(() => {
    if (ouvert) champ.current?.focus();
  }, [ouvert]);

  useEffect(() => {
    const q = saisie.trim();
    if (q.length < 2) return;
    const controle = new AbortController();
    const minuteur = window.setTimeout(async () => {
      try {
        const r = await fetch(`/api/recherche?q=${encodeURIComponent(q)}`, { signal: controle.signal });
        setReponse((await r.json()) as Reponse);
        setActif(-1);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setReponse({ groupes: [], indisponible: true });
      }
    }, 150);
    return () => {
      window.clearTimeout(minuteur);
      controle.abort();
    };
  }, [saisie]);

  useEffect(() => {
    if (!ouvert) return;
    const auClic = (e: PointerEvent) => {
      if (zone.current && !zone.current.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener("pointerdown", auClic);
    return () => document.removeEventListener("pointerdown", auClic);
  }, [ouvert]);

  const fermer = () => {
    setOuvert(false);
    bouton.current?.focus();
  };

  const aller = (destination: string) => {
    setOuvert(false);
    setSaisie("");
    router.push(destination);
  };

  const auClavier = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActif((i) => Math.min(i + 1, elements.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActif((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      e.preventDefault();
      fermer();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const choisi = elements[actif];
      if (choisi) aller(choisi.destination);
      else if (saisie.trim().length >= 2) aller(`/recherche?q=${encodeURIComponent(saisie.trim())}`);
    }
  };

  const nombre = elements.length;
  const annonce =
    saisie.trim().length < 2 || !reponse
      ? ""
      : reponse.indisponible
        ? "La recherche est momentanément indisponible."
        : nombre === 0
          ? "Aucun résultat."
          : `${nombre} suggestion${nombre > 1 ? "s" : ""}.`;

  let rang = -1;
  return (
    <div ref={zone}>
      <button
        ref={bouton}
        type="button"
        onClick={() => setOuvert(!ouvert)}
        aria-expanded={ouvert}
        aria-controls={`${id}-panneau`}
        className="inline-flex size-11 items-center justify-center rounded-pill text-ink hover:bg-pale"
      >
        <IconeRecherche />
        <span className="sr-only">Rechercher</span>
      </button>
      <div id={`${id}-panneau`} hidden={!ouvert} className="absolute inset-x-0 top-full z-50">
        <div className="mx-auto max-w-page px-4">
          <div className="mt-2 rounded-lg border border-line bg-surface p-4 shadow">
            <div className="flex items-center gap-2">
              <label htmlFor={`${id}-champ`} className="sr-only">
                Rechercher un produit, une référence ou un service
              </label>
              <input
                ref={champ}
                id={`${id}-champ`}
                type="search"
                role="combobox"
                aria-expanded={nombre > 0}
                aria-controls={`${id}-liste`}
                aria-autocomplete="list"
                aria-activedescendant={actif >= 0 ? `${id}-option-${actif}` : undefined}
                autoComplete="off"
                placeholder="Produit, référence, service…"
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                onKeyDown={auClavier}
                className="min-h-11 w-full rounded-sm border border-muted bg-surface px-3 text-body text-ink"
              />
              <button type="button" onClick={fermer} className="inline-flex size-11 shrink-0 items-center justify-center rounded-pill hover:bg-pale">
                <IconeFermer />
                <span className="sr-only">Fermer la recherche</span>
              </button>
            </div>
            <p role="status" className="sr-only">
              {annonce}
            </p>
            <div id={`${id}-liste`} role="listbox" aria-label="Suggestions" className="mt-3 max-h-[60vh] overflow-y-auto">
              {reponse?.groupes.map((g) => (
                <div key={g.type} role="group" aria-labelledby={`${id}-g-${g.type}`} className="mb-3">
                  <p id={`${id}-g-${g.type}`} className="mb-1 text-small font-semibold text-muted">
                    {g.libelle}
                  </p>
                  {g.elements.map((s) => {
                    rang++;
                    const position = rang;
                    return (
                      <div
                        key={s.code}
                        id={`${id}-option-${position}`}
                        role="option"
                        aria-selected={actif === position}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => aller(s.destination)}
                        className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-sm px-2 py-1 ${actif === position ? "bg-pale" : "hover:bg-pale"}`}
                      >
                        <span className="min-w-0">
                          <span className="block font-medium text-ink">{s.titre}</span>
                          {s.sousTitre ? <span className="block text-small text-muted">{s.sousTitre}</span> : null}
                        </span>
                        {s.prixHt !== null ? (
                          <span className="shrink-0 text-small text-ink">{euros(s.prixHt)} HT</span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            {saisie.trim().length >= 2 && reponse && nombre === 0 ? (
              <p className="text-muted">
                {reponse.indisponible
                  ? "La recherche est momentanément indisponible. Utilisez le menu pour parcourir le catalogue."
                  : "Aucun résultat. Appuyez sur Entrée pour voir les familles de produits et nous contacter."}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
