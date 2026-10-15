import { ConfigurationIncomplete } from "./erreurs";
import type { NomConnecteur } from "@/lib/config";

/**
 * Implémentation dont chaque opération lève ConfigurationIncomplete : sert d'emplacement au
 * mode réel tant que F14 ne l'a pas livré, et au mode réel dont la configuration est
 * incomplète (FR-007). Elle ne bascule jamais en démonstration.
 */
export function implementationRefusee<T extends object>(
  connecteur: NomConnecteur,
  variablesManquantes: string[],
): T {
  return new Proxy({} as T, {
    get(_cible, propriete) {
      if (typeof propriete !== "string" || propriete === "then") return undefined;
      return async () => {
        throw new ConfigurationIncomplete(connecteur, variablesManquantes);
      };
    },
  });
}
