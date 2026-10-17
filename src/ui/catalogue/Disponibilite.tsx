import type { EtatDisponibilite } from "@/connecteurs/odoo/interfaces";
import { cx } from "../cx";

export function libelleDispo(d: EtatDisponibilite | null): string {
  if (!d) return "Disponibilité momentanément indisponible";
  if (d.etat === "disponible") return "Disponible";
  if (d.etat === "delai") return `Délai ${d.delaiJours} jours`;
  return "Indisponible";
}

/** État de disponibilité lu dans Odoo (FR-030) ; `null` : connecteur injoignable, rien d'affirmé. */
export function Disponibilite({ etat, prefixe, className }: { etat: EtatDisponibilite | null; prefixe?: string; className?: string }) {
  const point = !etat ? "bg-muted" : etat.etat === "disponible" ? "bg-action" : etat.etat === "delai" ? "bg-ink" : "bg-muted";
  return (
    <p className={cx("flex items-center gap-2 text-small text-ink", className)}>
      <span aria-hidden="true" className={cx("inline-block size-2 shrink-0 rounded-full", point)} />
      {prefixe ? `${prefixe} : ` : ""}
      {libelleDispo(etat)}
    </p>
  );
}
