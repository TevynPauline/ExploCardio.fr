import type { ConnecteurStripe } from "../interfaces";
import { implementationRefusee } from "../../non-livre";

// Emplacement du mode réel (SDK Stripe) : livré par F14 (phase 2).
// Tant qu'il n'est pas livré, chaque opération lève ConfigurationIncomplete.

export function creerStripeReel(variablesManquantes: string[]): ConnecteurStripe {
  return implementationRefusee<ConnecteurStripe>("stripe", variablesManquantes);
}
