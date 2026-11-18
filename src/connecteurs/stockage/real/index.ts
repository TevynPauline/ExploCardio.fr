import { implementationRefusee } from "../../non-livre";
import type { ConnecteurStockage } from "../interfaces";

// Mode réel du stockage : Scaleway Object Storage (F26, lot 2). Configuration incomplète ou
// compartiment incohérent avec l'environnement → ConfigurationIncomplete à chaque appel, sans
// jamais basculer en démonstration (FR-003).

type Env = Record<string, string | undefined>;

export function creerStockageReel(manquantes: string[], env: Env): ConnecteurStockage {
  void env; // utilisé par le client Scaleway (lot 2)
  // Lot 2 : client Scaleway. D'ici là, le mode réel n'est pas livré.
  return implementationRefusee<ConnecteurStockage>("stockage", manquantes);
}
