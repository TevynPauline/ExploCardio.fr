import type { ConnecteurEmailing } from "../interfaces";
import { implementationRefusee } from "../../non-livre";

// Emplacement du mode réel (API de l'outil d'emailing) : livré par F14 (phase 2).
// Tant qu'il n'est pas livré, chaque opération lève ConfigurationIncomplete.

export function creerEmailingReel(variablesManquantes: string[]): ConnecteurEmailing {
  return implementationRefusee<ConnecteurEmailing>("emailing", variablesManquantes);
}
