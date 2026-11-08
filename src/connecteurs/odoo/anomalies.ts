import type { Anomalie } from "./interfaces";

/** Bloquantes d'abord, puis par objet et référence : ordre stable, identique dans les deux modes (F14). */
export function trierAnomalies(anomalies: Anomalie[]): Anomalie[] {
  return [...anomalies].sort(
    (a, b) =>
      Number(b.bloquant) - Number(a.bloquant) ||
      a.objet.localeCompare(b.objet) ||
      a.reference.localeCompare(b.reference, "fr") ||
      a.code.localeCompare(b.code),
  );
}
