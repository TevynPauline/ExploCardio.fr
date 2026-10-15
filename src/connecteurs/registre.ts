import {
  CONNECTEURS,
  modeDuConnecteur,
  variablesManquantes,
  type ModeConnecteur,
  type NomConnecteur,
} from "@/lib/config";
import { controleDonneesFictives } from "./garde-donnees-fictives";
import { envelopper, type ControleAvantAppel } from "./journal";
import { controlePanne } from "./panne-simulee";
import { DOMAINES_ODOO, type ConnecteurOdoo } from "./odoo/interfaces";
import type { ConnecteurStripe } from "./stripe/interfaces";
import type { ConnecteurPca } from "./pca/interfaces";
import type { ConnecteurEmailing } from "./emailing/interfaces";
import { creerOdooDemo } from "./odoo/demo";
import { creerOdooReel } from "./odoo/real";
import { creerStripeDemo } from "./stripe/demo";
import { creerStripeReel } from "./stripe/real";
import { creerPcaDemo } from "./pca/demo";
import { creerPcaReel } from "./pca/real";
import { creerEmailingDemo } from "./emailing/demo";
import { creerEmailingReel } from "./emailing/real";

// Registre des connecteurs : SEUL point d'accès aux services externes (principe III, FR-003).
// Il choisit l'implémentation de chaque connecteur selon CONNECTOR_* (défaut : demo).
// Un connecteur réel incomplet lève ConfigurationIncomplete et ne bascule jamais en
// démonstration (FR-007).

type Connecteurs = {
  odoo: ConnecteurOdoo;
  stripe: ConnecteurStripe;
  pca: ConnecteurPca;
  emailing: ConnecteurEmailing;
};

type Env = Record<string, string | undefined>;

function controles(nom: NomConnecteur, mode: ModeConnecteur): ControleAvantAppel[] {
  return mode === "demo" ? [controlePanne(nom)] : [controleDonneesFictives(nom)];
}

function construire<K extends NomConnecteur>(nom: K, env: Env): Connecteurs[K] {
  const mode = modeDuConnecteur(nom, env);
  const manquantes = mode === "real" ? variablesManquantes(nom, env) : [];
  const options = { connecteur: nom, mode, controles: controles(nom, mode) };

  if (nom === "odoo") {
    const brut = mode === "demo" ? creerOdooDemo() : creerOdooReel(manquantes);
    const enveloppe = Object.fromEntries(
      DOMAINES_ODOO.map((domaine) => [
        domaine,
        envelopper(brut[domaine], { ...options, operationPrefixe: domaine }),
      ]),
    );
    return enveloppe as unknown as Connecteurs[K];
  }
  const fabriques = {
    stripe: () => (mode === "demo" ? creerStripeDemo() : creerStripeReel(manquantes)),
    pca: () => (mode === "demo" ? creerPcaDemo() : creerPcaReel(manquantes)),
    emailing: () => (mode === "demo" ? creerEmailingDemo() : creerEmailingReel(manquantes)),
  } as const;
  const brut = fabriques[nom as Exclude<NomConnecteur, "odoo">]();
  return envelopper(brut as object, options) as Connecteurs[K];
}

let instances: Partial<Connecteurs> = {};

function obtenir<K extends NomConnecteur>(nom: K): Connecteurs[K] {
  instances[nom] ??= construire(nom, process.env);
  return instances[nom] as Connecteurs[K];
}

export const registre = {
  odoo: () => obtenir("odoo"),
  stripe: () => obtenir("stripe"),
  pca: () => obtenir("pca"),
  emailing: () => obtenir("emailing"),
  /** Mode actif de chaque connecteur (affichage dans le back-office uniquement). */
  modes: (): Record<NomConnecteur, ModeConnecteur> =>
    Object.fromEntries(CONNECTEURS.map((n) => [n, modeDuConnecteur(n)])) as Record<
      NomConnecteur,
      ModeConnecteur
    >,
};

/** Construit un registre isolé à partir d'un environnement donné (tests). */
export function creerRegistre(env: Env) {
  const locales: Partial<Connecteurs> = {};
  const get = <K extends NomConnecteur>(nom: K) =>
    (locales[nom] ??= construire(nom, env)) as Connecteurs[K];
  return {
    odoo: () => get("odoo"),
    stripe: () => get("stripe"),
    pca: () => get("pca"),
    emailing: () => get("emailing"),
  };
}

/** Oublie les instances (tests et changement de configuration). */
export function reinitialiserRegistre() {
  instances = {};
}
