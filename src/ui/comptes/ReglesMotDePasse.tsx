"use client";

import { REGLES_MOT_DE_PASSE } from "@/domaine/comptes/motdepasse";

/** Règles du mot de passe cochées en direct (FR-008) ; le résumé est annoncé poliment. */
export function ReglesMotDePasse({ id, motDePasse }: { id: string; motDePasse: string }) {
  const remplies = REGLES_MOT_DE_PASSE.filter((r) => r.test(motDePasse)).length;
  return (
    <div id={id} className="text-small">
      <p className="text-muted">Votre mot de passe doit contenir :</p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {REGLES_MOT_DE_PASSE.map((r) => {
          const ok = r.test(motDePasse);
          return (
            <li key={r.cle} className={ok ? "font-medium text-ink" : "text-muted"}>
              <span aria-hidden="true">{ok ? "✓ " : "○ "}</span>
              {r.libelle}
              <span className="sr-only">{ok ? " : respecté" : " : manquant"}</span>
            </li>
          );
        })}
      </ul>
      <p aria-live="polite" className="sr-only">
        {motDePasse ? `${remplies} règle${remplies > 1 ? "s" : ""} sur ${REGLES_MOT_DE_PASSE.length} respectée${remplies > 1 ? "s" : ""}.` : ""}
      </p>
    </div>
  );
}
