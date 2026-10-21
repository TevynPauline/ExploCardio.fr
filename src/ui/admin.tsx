import type { ReactNode } from "react";

// Petits éléments de formulaire du back-office, aux règles de la charte et d'accessibilité.

export const classeChamp = "min-h-11 w-full rounded-sm border border-muted bg-surface px-3 text-ink";

export function ChampAdmin({ id, libelle, aide, children }: { id: string; libelle: string; aide?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-small font-medium text-ink">{libelle}</label>
      {children}
      {aide ? <p id={`${id}-aide`} className="text-small text-muted">{aide}</p> : null}
    </div>
  );
}

export function CaseAdmin({ name, libelle, coche, value = "oui" }: { name: string; libelle: string; coche?: boolean; value?: string }) {
  return (
    <label className="flex min-h-11 items-center gap-3">
      <input type="checkbox" name={name} value={value} defaultChecked={coche} className="size-5" />
      {libelle}
    </label>
  );
}

/** État de publication (F13, US2) : en préparation (visible en aperçu), publié, retiré. */
export function EtatAdmin({ id, etat }: { id: string; etat: "preparation" | "publie" | "retire" }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-small font-medium text-ink">
      État
      <select id={id} name="etat" defaultValue={etat} className={classeChamp}>
        <option value="preparation">En préparation (visible seulement en aperçu)</option>
        <option value="publie">Publié</option>
        <option value="retire">Retiré</option>
      </select>
    </label>
  );
}

/** Valeur d'un champ date-heure local (« 2026-10-15T09:00 »). */
export function valeurDate(d: Date | null): string {
  if (!d) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

/** Rappel sur les écrans à texte libre ou à image (F13, FR-035) : jamais de donnée de patient. */
export function RappelPatient() {
  return <p className="ec-box--info p-3 text-small">Aucune donnée de patient : n’indiquez ni nom, ni information médicale d’un patient dans ces champs ou ces images.</p>;
}
