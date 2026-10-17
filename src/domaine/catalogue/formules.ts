import type { Formule } from "@/connecteurs/odoo/interfaces";

// Formules d'une fiche et leur nom dans l'adresse (?formule=…, US2-8). Module sans dépendance
// serveur : utilisable par les composants du navigateur.

export type FormuleFiche = Formule;

export const SLUG_FORMULE: Record<FormuleFiche, string> = {
  achat: "achat",
  mise_a_disposition: "mise-a-disposition",
  financement: "financement",
};

export const FORMULE_PAR_SLUG = Object.fromEntries(Object.entries(SLUG_FORMULE).map(([f, s]) => [s, f])) as Record<string, FormuleFiche>;
