import { describe } from "vitest";
import { creerRegistre } from "@/connecteurs/registre";
import { modeDuConnecteur, variablesManquantes, type NomConnecteur } from "@/lib/config";

// Harnais des tests de contrat (FR-006, SC-004, SC-011) : une même suite s'exécute contre
// l'implémentation désignée par CONNECTOR_*. En mode réel (phase 3, F15), la suite est ignorée
// tant que les identifiants de test du service ne sont pas fournis.

export function suiteDeContrat(
  connecteur: NomConnecteur,
  titre: string,
  corps: (contexte: { registre: ReturnType<typeof creerRegistre>; mode: "demo" | "real" }) => void,
) {
  const mode = modeDuConnecteur(connecteur);
  const ignoree = mode === "real" && variablesManquantes(connecteur).length > 0;
  const registre = creerRegistre(process.env);
  (ignoree ? describe.skip : describe)(`[contrat ${connecteur} · ${mode}] ${titre}`, () =>
    corps({ registre, mode }),
  );
}

/** Clé d'idempotence unique pour un test. */
export function cleDeTest(prefixe: string): string {
  return `test-${prefixe}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
