"use client";

import { useRef, useState } from "react";
import { MESSAGE_AUCUN_BLOC } from "@/domaine/organisation-accueil";
import { Button } from "@/ui/Button";

type Place = { bloc: string; nom: string; affiche: boolean; remarque: string | null };

const bouton =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-pill border border-line bg-surface px-3 text-small font-medium text-ink hover:bg-pale disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Liste des blocs (F23, FR-014, FR-017) : « Monter » / « Descendre » au clavier, focus conservé
 * sur le bouton du bloc déplacé, nouvelle position annoncée aux lecteurs d'écran.
 */
export function ListeBlocs({ action, places: initiales, modifieLe }: { action: (d: FormData) => Promise<void>; places: Place[]; modifieLe: string }) {
  const [places, setPlaces] = useState(initiales);
  const [annonce, setAnnonce] = useState("");
  const boutons = useRef(new Map<string, HTMLButtonElement | null>());

  const deplacer = (i: number, sens: -1 | 1) => {
    const j = i + sens;
    if (j < 0 || j >= places.length) return;
    const suite = [...places];
    [suite[i], suite[j]] = [suite[j]!, suite[i]!];
    setPlaces(suite);
    const bloc = suite[j]!;
    setAnnonce(`${bloc.nom} : position ${j + 1} sur ${suite.length}.`);
    // Focus sur le même bouton du bloc déplacé, ou sur l'autre s'il est désactivé en bout de liste.
    requestAnimationFrame(() => {
      const voulu = boutons.current.get(`${bloc.bloc}:${sens}`);
      (voulu && !voulu.disabled ? voulu : boutons.current.get(`${bloc.bloc}:${-sens}`))?.focus();
    });
  };

  const aucun = !places.some((p) => p.affiche);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="modifieLe" value={modifieLe} />
      <p className="text-small font-semibold text-ink">En haut : bandeau de démonstration, bandeau promotionnel et menus (fixes)</p>
      <ol className="flex flex-col gap-3">
        {places.map((p, i) => (
          <li key={p.bloc} data-bloc={p.bloc} className="flex flex-wrap items-center gap-3 rounded border border-line bg-surface p-3">
            <input type="hidden" name="bloc" value={p.bloc} />
            <span className="w-6 text-center text-small font-semibold text-muted" aria-hidden="true">
              {i + 1}
            </span>
            <div className="flex min-w-48 flex-1 flex-col gap-1">
              <span className="font-semibold text-ink">{p.nom}</span>
              <label className="flex min-h-11 items-center gap-2 text-small text-ink">
                <input
                  type="checkbox"
                  name="affiche"
                  value={p.bloc}
                  checked={p.affiche}
                  onChange={(e) => setPlaces(places.map((x) => (x.bloc === p.bloc ? { ...x, affiche: e.target.checked } : x)))}
                  className="size-5"
                />
                Affiché sur l’accueil
              </label>
              {p.remarque ? <span className="text-small text-muted">{p.remarque}</span> : null}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                ref={(el) => void boutons.current.set(`${p.bloc}:-1`, el)}
                onClick={() => deplacer(i, -1)}
                disabled={i === 0}
                aria-label={`Monter « ${p.nom} »`}
                className={bouton}
              >
                <span aria-hidden="true">↑</span> Monter
              </button>
              <button
                type="button"
                ref={(el) => void boutons.current.set(`${p.bloc}:1`, el)}
                onClick={() => deplacer(i, 1)}
                disabled={i === places.length - 1}
                aria-label={`Descendre « ${p.nom} »`}
                className={bouton}
              >
                <span aria-hidden="true">↓</span> Descendre
              </button>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-small font-semibold text-ink">En bas : bloc contact (fixe)</p>
      <p role="status" aria-live="polite" className="sr-only">
        {annonce}
      </p>
      {aucun ? (
        <p className="text-small font-semibold text-ink" role="alert">
          {MESSAGE_AUCUN_BLOC}
        </p>
      ) : null}
      <div>
        <Button type="submit">Enregistrer</Button>
      </div>
    </form>
  );
}
