import type { ConnecteurOdoo } from "../interfaces";
import { DOMAINES_ODOO } from "../interfaces";
import { implementationRefusee } from "../../non-livre";

// Emplacement du mode réel d'Odoo (API externe JSON-RPC) : livré par F14 (phase 2).
// Tant qu'il n'est pas livré, chaque opération lève ConfigurationIncomplete.

export function creerOdooReel(variablesManquantes: string[]): ConnecteurOdoo {
  return Object.fromEntries(
    DOMAINES_ODOO.map((domaine) => [domaine, implementationRefusee("odoo", variablesManquantes)]),
  ) as unknown as ConnecteurOdoo;
}
