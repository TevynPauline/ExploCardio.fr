import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import type { Anomalie, CodeAnomalie } from "@/connecteurs/odoo/interfaces";

// Rapport de contrôle des données Odoo (F14, FR-027) : ce qui manque dans Odoo pour que le site
// affiche les produits. Liste de travail pour l'équipe et Régis ; export CSV.

export const LIBELLES_ANOMALIE: Record<CodeAnomalie, string> = {
  SANS_REFERENCE: "Référence interne manquante",
  REFERENCE_EN_DOUBLE: "Référence interne en double",
  SANS_PRIX: "Prix de vente manquant",
  SANS_TVA: "Taxe de vente (TVA) manquante",
  CATEGORIE_NON_RELIEE: "Catégorie non reliée à une rubrique du site",
  PROPRIETE_MANQUANTE: "Propriété produit manquante",
  OFFRE_INCOMPLETE: "Offre de mise à disposition incomplète",
  SANS_NUMERO_SERIE: "Aucun appareil (numéro de série) en stock",
  REGLE_PRIX_NON_GEREE: "Règle de prix non prise en charge par le site",
  CLIENT_SANS_SIRET: "Client sans SIRET",
  SIRET_EN_DOUBLE: "SIRET en double",
};

export const LIBELLES_OBJET: Record<Anomalie["objet"], string> = {
  article: "Produit",
  variante: "Variante",
  categorie: "Catégorie",
  regle_prix: "Liste de prix",
  client: "Client",
};

export type RapportControle =
  | { disponible: true; anomalies: Anomalie[]; bloquantes: number; aCompleter: number; mode: "demo" | "real" }
  | { disponible: false; mode: "demo" | "real" };

export async function lireRapportControle(): Promise<RapportControle> {
  const mode = registre.modes().odoo;
  try {
    const anomalies = await registre.odoo().catalogue.controlerDonnees();
    const bloquantes = anomalies.filter((a) => a.bloquant).length;
    return { disponible: true, anomalies, bloquantes, aCompleter: anomalies.length - bloquantes, mode };
  } catch (e) {
    if (estErreurConnecteur(e)) return { disponible: false, mode };
    throw e;
  }
}

function cellule(v: string): string {
  return /[";\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** CSV : séparateur « ; », UTF-8 avec BOM (ouverture directe dans Excel). */
export function csvControle(anomalies: Anomalie[]): string {
  const entete = "Objet;Référence;Nom;Anomalie;Détail;Bloquant";
  const corps = anomalies.map((a) =>
    [LIBELLES_OBJET[a.objet], a.reference, a.nom, LIBELLES_ANOMALIE[a.code], a.detail ?? "", a.bloquant ? "Oui" : "Non"].map(cellule).join(";"),
  );
  return `﻿${[entete, ...corps].join("\r\n")}\r\n`;
}
