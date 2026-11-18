import { regionStockage } from "@/lib/config";
import { implementationRefusee } from "../../non-livre";
import type { ConnecteurStockage } from "../interfaces";
import { creerClientStockage, creerEnvoiScaleway, type EnvoiS3 } from "./client";

// Mode réel du stockage : Scaleway Object Storage (F26, contracts/stockage.md). Configuration
// incomplète ou compartiment incohérent avec l'environnement → ConfigurationIncomplete à chaque
// appel, sans jamais basculer en démonstration (FR-003).

type Env = Record<string, string | undefined>;

export function creerStockageReel(manquantes: string[], env: Env, options: { envoyer?: EnvoiS3 } = {}): ConnecteurStockage {
  if (manquantes.length) return implementationRefusee<ConnecteurStockage>("stockage", manquantes);
  const region = regionStockage(env);
  // La région compose l'adresse du service : seul un code de région Scaleway est admis.
  if (!/^[a-z]{2}-[a-z]{3}$/.test(region)) return implementationRefusee<ConnecteurStockage>("stockage", ["STOCKAGE_REGION"]);
  const compartiment = env.STOCKAGE_COMPARTIMENT!;
  const envoyer =
    options.envoyer ??
    creerEnvoiScaleway({ compartiment, region, cleAcces: env.STOCKAGE_CLE_ACCES!, cleSecrete: env.STOCKAGE_CLE_SECRETE! });
  return creerClientStockage(compartiment, envoyer);
}
