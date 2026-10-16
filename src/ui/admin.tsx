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

/** Valeur d'un champ date-heure local (« 2026-10-15T09:00 »). */
export function valeurDate(d: Date | null): string {
  if (!d) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
