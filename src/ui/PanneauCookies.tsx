"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FINALITES, ecrireChoix, type Finalite } from "@/domaine/consentement";
import { enregistrerCookie, useChoixConsentement } from "./cookie-navigateur";

// Bandeau cookies (US3, FR-033 à FR-035, R5) sans service tiers.
// - Mode « information » tant qu'aucune finalité n'est déclarée : informe, « J'ai compris ».
// - Mode « consentement » sinon : « Tout accepter » et « Tout refuser » au même niveau, de même
//   apparence, plus « Personnaliser » ; rien n'est déposé avant le choix.
// Ne bloque pas la lecture de la page. Rouvert par « Gestion des cookies » (événement).

export const EVENEMENT_GESTION = "ec:gestion-cookies";

export function PanneauCookies({ finalites = FINALITES }: { finalites?: Finalite[] }) {
  const { connu, choix } = useChoixConsentement();
  const [rouvert, setRouvert] = useState(false);
  const [detail, setDetail] = useState(false);
  const [coches, setCoches] = useState<Record<string, boolean> | null>(null);
  const titre = useRef<HTMLHeadingElement>(null);
  // Visible à la première visite (choix absent ou expiré) ou quand le visiteur le rouvre. Rendu
  // dès le serveur (choix encore inconnu) pour s'afficher sans attendre le JavaScript ; masqué
  // par la feuille de style si le navigateur a déjà un choix (app/layout.tsx).
  const visible = rouvert || !connu || !choix;

  useEffect(() => {
    const rouvrir = () => {
      setDetail(true);
      setRouvert(true);
    };
    window.addEventListener(EVENEMENT_GESTION, rouvrir);
    return () => window.removeEventListener(EVENEMENT_GESTION, rouvrir);
  }, []);

  useEffect(() => {
    if (visible && connu) titre.current?.focus();
  }, [visible, connu, detail]);

  if (!visible) return null;

  const valeurs = coches ?? choix?.finalites ?? {};
  const enregistrer = (choisies: Record<string, boolean>) => {
    enregistrerCookie(ecrireChoix(choisies));
    setCoches(null);
    setRouvert(false);
    setDetail(false);
  };
  const tout = (valeur: boolean) => enregistrer(Object.fromEntries(finalites.map((f) => [f.cle, valeur])));
  const information = finalites.length === 0;

  return (
    <section
      aria-labelledby="titre-cookies"
      data-panneau-cookies={connu ? undefined : "serveur"}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface shadow"
    >
      <div className="mx-auto flex max-w-page flex-col gap-4 px-4 py-4 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <h2 id="titre-cookies" ref={titre} tabIndex={-1} className="text-body font-semibold focus:outline-none">
            Cookies
          </h2>
          {information ? (
            <p className="text-small text-ink">
              Ce site n’utilise que des cookies nécessaires à son fonctionnement (connexion, mémorisation
              de cette information). Aucun cookie de mesure d’audience ni de publicité.{" "}
              <Link href="/cookies" className="font-medium">En savoir plus</Link>
            </p>
          ) : (
            <p className="text-small text-ink">
              Nous utilisons des cookies nécessaires au fonctionnement du site et, avec votre accord, des
              cookies pour les usages ci-dessous. Vous pouvez changer d’avis à tout moment depuis « Gestion
              des cookies » en bas de page. <Link href="/cookies" className="font-medium">En savoir plus</Link>
            </p>
          )}
          {!information && detail ? (
            <fieldset className="mt-3 flex flex-col gap-2">
              <legend className="sr-only">Choix par usage</legend>
              {finalites.map((f) => (
                <label key={f.cle} className="flex min-h-11 items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-5"
                    checked={valeurs[f.cle] === true}
                    onChange={(e) => setCoches({ ...valeurs, [f.cle]: e.target.checked })}
                  />
                  <span>
                    <span className="block font-medium">{f.libelle}</span>
                    <span className="block text-small text-muted">{f.description}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {information ? (
            <button type="button" className="ec-btn ec-btn--primary" onClick={() => enregistrer({})}>
              J’ai compris
            </button>
          ) : (
            <>
              <button type="button" className="ec-btn ec-btn--secondary" onClick={() => tout(false)}>
                Tout refuser
              </button>
              <button type="button" className="ec-btn ec-btn--secondary" onClick={() => tout(true)}>
                Tout accepter
              </button>
              {detail ? (
                <button type="button" className="ec-btn ec-btn--primary" onClick={() => enregistrer(valeurs)}>
                  Enregistrer mes choix
                </button>
              ) : (
                <button type="button" className="ec-btn ec-btn--secondary" onClick={() => setDetail(true)}>
                  Personnaliser
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
