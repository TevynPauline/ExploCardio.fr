import type { ScenarioEmail } from "@generated/site/client";
import { urlDuSite } from "@/emails/charte";
import type { PiedPreferences } from "@/emails/Gabarit";
import { RAISONS } from "./catalogue";
import { PREFERENCE_DU_SCENARIO } from "./decision";
import { signerJeton } from "./jetons";

// Liens sans connexion des emails de service et commerciaux (F10, D8, FR-023, FR-041).

/** Ce que coupe la désinscription en un clic : la newsletter, ou le type de service concerné. */
export function objetDesinscription(scenario: ScenarioEmail | null): string {
  if (!scenario || scenario === "campagne") return "newsletter";
  return PREFERENCE_DU_SCENARIO[scenario] ?? "newsletter";
}

export function lienPreferences(email: string): string {
  return urlDuSite(`/preferences/${signerJeton(email)}`);
}

/** Adresse de désinscription en un clic (POST, RFC 8058), annoncée par l'en-tête List-Unsubscribe. */
export function lienDesinscriptionUnClic(email: string, scenario: ScenarioEmail | null): string {
  return urlDuSite(`/api/emails/desinscription?j=${encodeURIComponent(signerJeton(email))}&objet=${objetDesinscription(scenario)}`);
}

/** Lien « Se désinscrire » du corps de l'email : page de confirmation sans connexion. */
export function lienDesinscription(email: string, scenario: ScenarioEmail | null): string {
  return urlDuSite(`/preferences/${signerJeton(email)}?desinscrire=${objetDesinscription(scenario)}`);
}

export function piedPreferences(email: string, scenario: ScenarioEmail): PiedPreferences {
  return {
    raison: RAISONS[scenario] ?? "",
    preferences: lienPreferences(email),
    desinscription: scenario === "campagne" ? lienDesinscription(email, scenario) : undefined,
  };
}
