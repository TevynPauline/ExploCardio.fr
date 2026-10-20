// Lecture de la configuration (contracts/common.md, « Sélection du mode »).
// Aucune variable de service réel n'est exigée en mode démonstration (FR-038).

export type NomConnecteur = "odoo" | "stripe" | "pca" | "emailing";
export type ModeConnecteur = "demo" | "real";
export type ModeSite = "demo" | "prod";

export const CONNECTEURS: readonly NomConnecteur[] = ["odoo", "stripe", "pca", "emailing"];

const variableDeMode: Record<NomConnecteur, string> = {
  odoo: "CONNECTOR_ODOO",
  stripe: "CONNECTOR_STRIPE",
  pca: "CONNECTOR_PCA",
  emailing: "CONNECTOR_EMAILING",
};

/** Variables exigées par chaque connecteur en mode réel (F14 les utilisera). */
export const VARIABLES_MODE_REEL: Record<NomConnecteur, readonly string[]> = {
  odoo: ["ODOO_URL", "ODOO_DATABASE", "ODOO_USER", "ODOO_API_KEY"],
  stripe: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  pca: ["PCA_API_URL", "PCA_API_KEY"],
  emailing: ["EMAILING_API_KEY"],
};

type Env = Record<string, string | undefined>;

export function modeDuSite(env: Env = process.env): ModeSite {
  return env.SITE_MODE === "prod" ? "prod" : "demo";
}

/** Mode d'un connecteur : `demo` par défaut ; toute autre valeur que `real` vaut `demo`. */
export function modeDuConnecteur(nom: NomConnecteur, env: Env = process.env): ModeConnecteur {
  return env[variableDeMode[nom]] === "real" ? "real" : "demo";
}

export function variablesManquantes(nom: NomConnecteur, env: Env = process.env): string[] {
  return VARIABLES_MODE_REEL[nom].filter((v) => !env[v]);
}

export function sousModePcaDemo(env: Env = process.env): "auto" | "manual" {
  return env.PCA_DEMO_SUBMODE === "manual" ? "manual" : "auto";
}

/** Sous-mode de la plateforme réelle (F12, FR-019), choisi au branchement (F14). */
export function sousModePcaReel(env: Env = process.env): "auto" | "manual" {
  return env.PCA_SUBMODE === "manual" ? "manual" : "auto";
}
