"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { envoyerDemandeInformatique } from "@/actions/informatique";
import {
  CHAMPS_ETAPES,
  CRENEAUX,
  DELAIS,
  EXAMENS_LOGICIELS,
  INTERETS,
  LOGICIELS,
  PRECISION_MAX,
  PRESTATAIRES,
  SAISIE_VIDE,
  validerEtape,
  type ErreursQuestionnaire,
  type SaisieQuestionnaire,
} from "@/domaine/informatique/questionnaire";

// Questionnaire « Décrire mon besoin » (F27, FR-026 à FR-033) : trois étapes, barre de
// progression, validation à chaque étape, focus sur le titre de l'étape ou sur la première
// erreur, confirmation finale annoncée. Rien n'est enregistré avant l'envoi final.

type Prerempli = { nom: string; email: string; cabinet: string; codePostal: string } | null;

const TITRES = ["Ce qui vous intéresse", "Vos logiciels", "Vous rappeler"] as const;
const MENTION = "Aucune donnée de patient n'est demandée. Vos réponses servent uniquement à vous recontacter.";
const classeChamp = "min-h-11 w-full rounded-sm border border-muted bg-surface px-3 text-ink";
const PIEGE = "site_web";

function Erreur({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={`${id}-erreur`} className="text-small font-medium text-ink">
      <span aria-hidden="true">⚠ </span>
      {message}
    </p>
  ) : null;
}

function Groupe({ id, legende, erreur, children }: { id: string; legende: string; erreur?: string; children: ReactNode }) {
  return (
    <fieldset id={id} tabIndex={-1} aria-describedby={erreur ? `${id}-erreur` : undefined} className="flex flex-col gap-2">
      <legend className="mb-1 text-small font-medium text-ink">{legende}</legend>
      {children}
      <Erreur id={id} message={erreur} />
    </fieldset>
  );
}

function Choix({ nom, valeur, choisi, libelle, aide, type, onChange }: { nom: string; valeur: string; choisi: boolean; libelle: string; aide?: string; type: "radio" | "checkbox"; onChange: () => void }) {
  return (
    <label className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border-2 p-3 ${choisi ? "border-action bg-pale" : "border-line bg-surface"}`}>
      <input type={type} name={nom} value={valeur} checked={choisi} onChange={onChange} className="mt-1 size-5 shrink-0" />
      <span>
        <span className="font-medium text-ink">{libelle}</span>
        {aide ? <span className="block text-small text-muted">{aide}</span> : null}
      </span>
    </label>
  );
}

export function Questionnaire({ jeton, prerempli }: { jeton: string; prerempli: Prerempli }) {
  const [etape, setEtape] = useState<0 | 1 | 2>(0);
  const [s, setS] = useState<SaisieQuestionnaire>({ ...SAISIE_VIDE, ...(prerempli ?? {}) });
  const [erreurs, setErreurs] = useState<ErreursQuestionnaire>({});
  const [message, setMessage] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);
  const [enCours, demarrer] = useTransition();
  const titre = useRef<HTMLHeadingElement>(null);
  const confirmation = useRef<HTMLDivElement>(null);
  const piege = useRef<HTMLInputElement>(null);

  const maj = (p: Partial<SaisieQuestionnaire>) => setS((x) => ({ ...x, ...p }));
  const e = (cle: string) => erreurs[cle];
  const decrit = (cle: string) => (erreurs[cle] ? `${cle.replace(".", "-")}-erreur` : undefined);

  const focaliserErreur = (es: ErreursQuestionnaire, n: 0 | 1 | 2) => {
    const premier = CHAMPS_ETAPES[n]!.find((c) => es[c]);
    if (premier) window.requestAnimationFrame(() => document.getElementById(premier.replace(".", "-"))?.focus());
  };
  const allerA = (n: 0 | 1 | 2) => {
    setEtape(n);
    setErreurs({});
    window.requestAnimationFrame(() => titre.current?.focus());
  };
  const suivant = () => {
    const es = validerEtape(etape, s);
    setErreurs(es);
    if (Object.keys(es).length) return focaliserErreur(es, etape);
    if (etape < 2) allerA((etape + 1) as 0 | 1 | 2);
    else envoyer();
  };
  const envoyer = () => {
    setMessage(null);
    demarrer(async () => {
      const r = await envoyerDemandeInformatique(s, jeton, piege.current?.value ?? "");
      if (r.ok) {
        setEnvoye(true);
        window.requestAnimationFrame(() => confirmation.current?.focus());
      } else if ("erreurs" in r) {
        setEtape(r.etape);
        setErreurs(r.erreurs);
        focaliserErreur(r.erreurs, r.etape);
      } else {
        setMessage(
          r.motif === "limite"
            ? "Trop de demandes envoyées depuis cet appareil. Réessayez dans une heure ou appelez-nous."
            : "Votre demande n'a pas pu être envoyée. Patientez quelques secondes puis réessayez.",
        );
      }
    });
  };

  if (envoye) {
    return (
      <div ref={confirmation} tabIndex={-1} role="status" className="flex flex-col gap-2 rounded-lg bg-pale p-6">
        <p className="text-h3 font-semibold text-ink">Merci, votre demande est bien reçue.</p>
        <p className="text-ink">Nous vous appelons sur le créneau choisi pour préciser votre besoin.</p>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        suivant();
      }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <h3 ref={titre} tabIndex={-1} className="text-h3 font-semibold">
          Étape {etape + 1} sur 3 · {TITRES[etape]}
        </h3>
        <div aria-hidden="true" className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-1 flex-1 rounded-pill ${i <= etape ? "bg-action" : "bg-line"}`} />
          ))}
        </div>
      </div>
      {message ? (
        <p role="alert" className="ec-box--promo p-3 font-medium">
          {message}
        </p>
      ) : null}

      {etape === 0 ? (
        <>
          <Groupe id="interets" legende="Ce qui vous intéresse (plusieurs choix possibles)" erreur={e("interets")}>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(INTERETS).map(([v, x]) => (
                <Choix
                  key={v}
                  type="checkbox"
                  nom="interets"
                  valeur={v}
                  choisi={s.interets.includes(v)}
                  libelle={x.libelle}
                  aide={x.aide}
                  onChange={() => maj({ interets: s.interets.includes(v) ? s.interets.filter((i) => i !== v) : [...s.interets, v] })}
                />
              ))}
            </div>
          </Groupe>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="medecins" className="text-small font-medium">
                Médecins au cabinet
              </label>
              <input id="medecins" inputMode="numeric" value={s.medecins} onChange={(x) => maj({ medecins: x.target.value })} aria-invalid={Boolean(e("medecins"))} aria-describedby={decrit("medecins")} className={classeChamp} />
              <Erreur id="medecins" message={e("medecins")} />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="postes" className="text-small font-medium">
                Nombre de postes informatiques
              </label>
              <input id="postes" inputMode="numeric" value={s.postes} onChange={(x) => maj({ postes: x.target.value })} aria-invalid={Boolean(e("postes"))} aria-describedby={decrit("postes")} className={classeChamp} />
              <Erreur id="postes" message={e("postes")} />
            </div>
            <Groupe id="secretariat" legende="Secrétariat sur place" erreur={e("secretariat")}>
              <div className="flex gap-3">
                {(["oui", "non"] as const).map((v) => (
                  <Choix key={v} type="radio" nom="secretariat" valeur={v} choisi={s.secretariat === v} libelle={v === "oui" ? "Oui" : "Non"} onChange={() => maj({ secretariat: v })} />
                ))}
              </div>
            </Groupe>
          </div>
        </>
      ) : null}

      {etape === 1 ? (
        <>
          {(Object.keys(EXAMENS_LOGICIELS) as (keyof typeof EXAMENS_LOGICIELS)[]).map((k) => (
            <div key={k} className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label htmlFor={`logiciels-${k}`} className="text-small font-medium">
                  Logiciel utilisé pour : {EXAMENS_LOGICIELS[k]}
                </label>
                <select
                  id={`logiciels-${k}`}
                  value={s.logiciels[k]}
                  onChange={(x) => maj({ logiciels: { ...s.logiciels, [k]: x.target.value } })}
                  aria-invalid={Boolean(e(`logiciels.${k}`))}
                  aria-describedby={decrit(`logiciels.${k}`)}
                  className={classeChamp}
                >
                  <option value="">Choisissez</option>
                  {Object.entries(LOGICIELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <Erreur id={`logiciels-${k}`} message={e(`logiciels.${k}`)} />
              </div>
              {s.logiciels[k] === "autre" ? (
                <div className="flex flex-col gap-1">
                  <label htmlFor={`precisions-${k}`} className="text-small font-medium">
                    Lequel ?
                  </label>
                  <input
                    id={`precisions-${k}`}
                    maxLength={PRECISION_MAX}
                    value={s.precisions[k]}
                    onChange={(x) => maj({ precisions: { ...s.precisions, [k]: x.target.value } })}
                    aria-invalid={Boolean(e(`precisions.${k}`))}
                    aria-describedby={decrit(`precisions.${k}`)}
                    className={classeChamp}
                  />
                  <Erreur id={`precisions-${k}`} message={e(`precisions.${k}`)} />
                </div>
              ) : null}
            </div>
          ))}
          <Groupe id="prestataireActuel" legende="Le cabinet a-t-il déjà un prestataire informatique ?" erreur={e("prestataireActuel")}>
            <div className="grid gap-3 sm:grid-cols-3">
              {Object.entries(PRESTATAIRES).map(([v, l]) => (
                <Choix key={v} type="radio" nom="prestataireActuel" valeur={v} choisi={s.prestataireActuel === v} libelle={l} onChange={() => maj({ prestataireActuel: v })} />
              ))}
            </div>
          </Groupe>
        </>
      ) : null}

      {etape === 2 ? (
        <>
          <Groupe id="delai" legende="Votre délai" erreur={e("delai")}>
            <div className="grid gap-3 sm:grid-cols-3">
              {Object.entries(DELAIS).map(([v, l]) => (
                <Choix key={v} type="radio" nom="delai" valeur={v} choisi={s.delai === v} libelle={l} onChange={() => maj({ delai: v })} />
              ))}
            </div>
          </Groupe>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["nom", "Nom et prénom", "name", "text"],
                ["cabinet", "Cabinet", "organization", "text"],
                ["codePostal", "Code postal du cabinet", "postal-code", "text"],
                ["email", "Adresse e-mail", "email", "email"],
                ["telephone", "Téléphone", "tel", "tel"],
              ] as const
            ).map(([cle, libelle, auto, type]) => (
              <div key={cle} className="flex flex-col gap-1">
                <label htmlFor={cle} className="text-small font-medium">
                  {libelle}
                </label>
                <input
                  id={cle}
                  type={type}
                  autoComplete={auto}
                  value={s[cle]}
                  onChange={(x) => maj({ [cle]: x.target.value } as Partial<SaisieQuestionnaire>)}
                  aria-invalid={Boolean(e(cle))}
                  aria-describedby={decrit(cle)}
                  className={classeChamp}
                />
                <Erreur id={cle} message={e(cle)} />
              </div>
            ))}
          </div>
          <Groupe id="creneau" legende="Quand préférez-vous être rappelé ?" erreur={e("creneau")}>
            <div className="grid gap-3 sm:grid-cols-3">
              {Object.entries(CRENEAUX).map(([v, l]) => (
                <Choix key={v} type="radio" nom="creneau" valeur={v} choisi={s.creneau === v} libelle={l} onChange={() => maj({ creneau: v })} />
              ))}
            </div>
          </Groupe>
          <div className="flex flex-col gap-1">
            <label className="flex min-h-11 items-start gap-3">
              <input
                id="consentement"
                type="checkbox"
                checked={s.consentement}
                onChange={(x) => maj({ consentement: x.target.checked })}
                aria-invalid={Boolean(e("consentement"))}
                aria-describedby={decrit("consentement")}
                className="mt-1 size-5 shrink-0"
              />
              <span className="text-ink">J’accepte qu’ExploCardio.fr utilise ces informations pour me recontacter au sujet de ma demande.</span>
            </label>
            <Erreur id="consentement" message={e("consentement")} />
          </div>
        </>
      ) : null}

      {/* Champ piège invisible (anti-robots, FR-033). */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor={PIEGE}>Ne pas remplir</label>
        <input ref={piege} id={PIEGE} name={PIEGE} tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {etape > 0 ? (
          <button type="button" onClick={() => allerA((etape - 1) as 0 | 1 | 2)} className="ec-btn ec-btn--secondary">
            Retour
          </button>
        ) : (
          <span className="text-small text-muted">Ensuite : vos logiciels, puis vos coordonnées</span>
        )}
        <button type="submit" disabled={enCours} className="ec-btn ec-btn--primary">
          {etape < 2 ? "Continuer" : enCours ? "Envoi…" : "Envoyer ma demande"}
        </button>
      </div>
      <p className="flex items-center gap-2 text-small text-muted">
        <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-sage" />
        {MENTION}
      </p>
    </form>
  );
}
