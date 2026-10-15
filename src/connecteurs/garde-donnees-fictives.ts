import type { NomConnecteur } from "@/lib/config";
import { DemoDataRejected } from "./erreurs";
import type { ControleAvantAppel } from "./journal";

// Aucune donnée de la base de démonstration ne doit atteindre un service réel (FR-017, SC-012).
// Une donnée est fictive si elle porte `estFictif: true`, si c'est une référence de la base de
// démonstration (préfixe « FICT- ») ou une adresse des comptes de démonstration.

export const PREFIXE_REFERENCE_FICTIVE = "FICT-";
export const DOMAINE_EMAILS_DEMO = "@demo.explocardio.test";

export function estDonneeFictive(valeur: unknown, profondeur = 0): boolean {
  if (profondeur > 8 || valeur === null || valeur === undefined) return false;
  if (typeof valeur === "string") {
    return (
      valeur.startsWith(PREFIXE_REFERENCE_FICTIVE) ||
      valeur.toLowerCase().endsWith(DOMAINE_EMAILS_DEMO)
    );
  }
  if (valeur instanceof Date || valeur instanceof Uint8Array) return false;
  if (Array.isArray(valeur)) return valeur.some((v) => estDonneeFictive(v, profondeur + 1));
  if (typeof valeur === "object") {
    const objet = valeur as Record<string, unknown>;
    if (objet.estFictif === true) return true;
    return Object.values(objet).some((v) => estDonneeFictive(v, profondeur + 1));
  }
  return false;
}

/** Contrôle placé devant chaque implémentation réelle. */
export function controleDonneesFictives(connecteur: NomConnecteur): ControleAvantAppel {
  return (_operation, args) => {
    if (estDonneeFictive(args)) {
      console.error(`[garde] donnée de démonstration bloquée vers ${connecteur}`);
      throw new DemoDataRejected(connecteur);
    }
  };
}
