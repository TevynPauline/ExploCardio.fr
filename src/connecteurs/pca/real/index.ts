import type { ConnecteurPca } from "../interfaces";
import { implementationRefusee } from "../../non-livre";

// Emplacement du mode réel (API de provisioning de la plateforme Cloud) : livré par F14 (phase 2).
// Tant qu'il n'est pas livré, chaque opération lève ConfigurationIncomplete.

export function creerPcaReel(variablesManquantes: string[]): ConnecteurPca {
  return implementationRefusee<ConnecteurPca>("pca", variablesManquantes);
}
