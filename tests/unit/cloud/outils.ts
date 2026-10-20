import { randomUUID } from "node:crypto";
import { vi } from "vitest";
import { creerRegistre } from "@/connecteurs/registre";
import { dbSite } from "@/lib/db/site";
import { compteValide } from "../commande/outils";

export { compteValide, nettoyer } from "../commande/outils";

// Outils des tests de F12 : comptes avec fiche Odoo, emails, journal, sous-mode de la plateforme.

export const HOLTER_CLOUD = "EC-DMS-CS-HOLTER-CLOUD";
export const CARDIOVISION = "EC-DMS-CARDIOVISION-CLOUD";
export const JOUR = 24 * 3600_000;

export const odoo = () => creerRegistre(process.env).odoo();
export const pca = () => creerRegistre(process.env).pca();

/** Sous-mode de la plateforme simulée le temps d'un test (rétabli par vi.unstubAllEnvs). */
export function sousMode(mode: "auto" | "manual") {
  vi.stubEnv("PCA_DEMO_SUBMODE", mode);
}

export async function client() {
  return compteValide();
}

export const emails = (destinataire: string, objet: string) => dbSite().messageDemonstration.count({ where: { destinataire, objet: { contains: objet } } });
export const alertes = (objet: string) => dbSite().messageDemonstration.count({ where: { objet: { contains: objet } } });
export const journal = (accesId: string, action: string) => dbSite().journalAction.count({ where: { objet: accesId, action: `cloud.${action}` } });

/** Référence de source unique (commande, location ou abonnement fictifs). */
export const source = (prefixe = "TEST") => `FICT-${prefixe}-${randomUUID().slice(0, 8)}`;
