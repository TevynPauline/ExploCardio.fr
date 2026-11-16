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

/** Variables exigées par chaque connecteur en mode réel. */
export const VARIABLES_MODE_REEL: Record<NomConnecteur, readonly string[]> = {
  // F14 : ODOO_ENVIRONNEMENT vaut « recette » (copie neutralisée) ou « production ».
  odoo: ["ODOO_URL", "ODOO_DATABASE", "ODOO_USER", "ODOO_API_KEY", "ODOO_ENVIRONNEMENT"],
  // F24 : STRIPE_ENVIRONNEMENT vaut « recette » (clés de test) ou « production » (clés live).
  stripe: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_ENVIRONNEMENT"],
  pca: ["PCA_API_URL", "PCA_API_KEY"],
  // F25 : EMAILING_ENVIRONNEMENT vaut « recette » (envois limités aux adresses autorisées) ou « production ».
  emailing: ["EMAILING_API_KEY", "EMAILING_ENVIRONNEMENT"],
};

type Env = Record<string, string | undefined>;

export function modeDuSite(env: Env = process.env): ModeSite {
  return env.SITE_MODE === "prod" ? "prod" : "demo";
}

/** Mode d'un connecteur : `demo` par défaut ; toute autre valeur que `real` vaut `demo`. */
export function modeDuConnecteur(nom: NomConnecteur, env: Env = process.env): ModeConnecteur {
  return env[variableDeMode[nom]] === "real" ? "real" : "demo";
}

/** Valeurs admises de certaines variables : une autre valeur compte comme manquante. */
const VALEURS_ADMISES: Record<string, readonly string[]> = {
  ODOO_ENVIRONNEMENT: ["recette", "production"],
  EMAILING_ENVIRONNEMENT: ["recette", "production"],
  STRIPE_ENVIRONNEMENT: ["recette", "production"],
};

export function variablesManquantes(nom: NomConnecteur, env: Env = process.env): string[] {
  const manquantes = VARIABLES_MODE_REEL[nom].filter((v) => {
    const valeur = env[v];
    if (!valeur) return true;
    const admises = VALEURS_ADMISES[v];
    return admises ? !admises.includes(valeur) : false;
  });
  // F24 (FR-004) : clé de test en recette, clé live en production ; sinon, clé comptée manquante.
  if (nom === "stripe" && prefixeCleIncoherent(env) && !manquantes.includes("STRIPE_SECRET_KEY")) {
    manquantes.push("STRIPE_SECRET_KEY");
  }
  // F25 : en recette, la liste des adresses autorisées est obligatoire.
  if (nom === "emailing" && environnementEmailing(env) === "recette" && !adressesAutorisees(env).length) {
    manquantes.push("EMAILING_ADRESSES_AUTORISEES");
  }
  return manquantes;
}

export type EnvironnementOdoo = "recette" | "production";

/** Environnement d'Odoo déclaré (F14, R8) ; `null` s'il est absent ou invalide. */
export function environnementOdoo(env: Env = process.env): EnvironnementOdoo | null {
  const v = env.ODOO_ENVIRONNEMENT;
  return v === "recette" || v === "production" ? v : null;
}

export function sousModePcaDemo(env: Env = process.env): "auto" | "manual" {
  return env.PCA_DEMO_SUBMODE === "manual" ? "manual" : "auto";
}

/** Sous-mode de la plateforme réelle (F12, FR-019), choisi au branchement (F14). */
export function sousModePcaReel(env: Env = process.env): "auto" | "manual" {
  return env.PCA_SUBMODE === "manual" ? "manual" : "auto";
}

export type EnvironnementEmailing = "recette" | "production";

/** Environnement de l'outil d'envoi déclaré (F25, R8) ; `null` s'il est absent ou invalide. */
export function environnementEmailing(env: Env = process.env): EnvironnementEmailing | null {
  const v = env.EMAILING_ENVIRONNEMENT;
  return v === "recette" || v === "production" ? v : null;
}

/**
 * Adresses autorisées sur le site de recette (F25, FR-016) : adresses exactes ou domaines
 * (« @exemple.fr »), séparés par des virgules ; minuscules, espaces retirés.
 */
export function adressesAutorisees(env: Env = process.env): string[] {
  return (env.EMAILING_ADRESSES_AUTORISEES ?? "")
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);
}

export type EnvironnementStripe = "recette" | "production";

/** Environnement de Stripe déclaré (F24, R2) ; `null` s'il est absent ou invalide. */
export function environnementStripe(env: Env = process.env): EnvironnementStripe | null {
  const v = env.STRIPE_ENVIRONNEMENT;
  return v === "recette" || v === "production" ? v : null;
}

/**
 * F24 (FR-004) : clé Stripe incohérente avec l'environnement — clé live sur la recette ou clé
 * de test sur le site public. Seulement en mode réel, avec une clé et un environnement valides.
 */
export function cleStripeIncoherente(env: Env = process.env): boolean {
  return env.CONNECTOR_STRIPE === "real" && prefixeCleIncoherent(env);
}

function prefixeCleIncoherent(env: Env): boolean {
  const environnement = environnementStripe(env);
  const cle = env.STRIPE_SECRET_KEY ?? "";
  if (!environnement || !cle) return false;
  const test = /^(sk|rk)_test_/.test(cle);
  const live = /^(sk|rk)_live_/.test(cle);
  return environnement === "recette" ? !test : !live;
}
