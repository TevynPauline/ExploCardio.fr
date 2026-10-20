import { dbSite } from "@/lib/db/site";

// Paramètres de fonctionnement du site (principe VI), modifiables dans le back-office (F13).
// Les règles commerciales n'y figurent jamais : elles sont dans Odoo (base fictive en phase 1).

export const PARAMETRES_PAR_DEFAUT = {
  /** Nombre d'échecs successifs d'une tâche avant alerte à l'administrateur (T018). */
  "file_attente.seuil_alerte": "5",
  /** F05 : calendrier de livraison et rappels des locations (D3, D6). */
  "livraison.jours_non_livres": "[]",
  "livraison.zones_sans_lendemain": '["20"]',
  "livraison.delai_zones_jours": "2",
  "location.rappel_echeance_jours": "3",
  "location.rappel_retour_jours": "2",
  /** F06 : bons au panier (D1) et rappels de fidélité (D2). */
  "fidelite.bons_au_panier": "true",
  "fidelite.rappel_droits_jours": "7",
  "fidelite.rappel_expiration_jours": "30",
  // F09 : horaires de réponse de la ligne WhatsApp (jours 1 = lundi à 7 = dimanche) et
  // fermetures exceptionnelles [{ du, au, motif }] ; jours fériés calculés (D1).
  "contact.horaires": '{"1":[["09:00","18:00"]],"2":[["09:00","18:00"]],"3":[["09:00","18:00"]],"4":[["09:00","18:00"]],"5":[["09:00","18:00"]],"6":[],"7":[]}',
  "contact.fermetures": "[]",
  /** F12 : plateforme Cloud (D6), délai de grâce et rappels (D1). */
  "cloud.url_plateforme": "/demo/plateforme-cloud",
  "cloud.delai_grace_jours": "30",
  "cloud.rappel_periode_jours": "30",
  "cloud.rappel_fin_jours": "7",
  "cloud.aide_premiere_connexion": "Votre accès est ouvert : utilisez le lien « Accéder à la plateforme ». Lors de votre première connexion, la plateforme vous envoie une invitation par email pour créer votre mot de passe ; ExploCardio.fr ne le connaît jamais. Besoin d'aide pour le paramétrage ? Écrivez-nous sur WhatsApp.",
  /** F10 : scénarios (D5), fréquence et plages d'envoi (D6), expéditeur ; niveaux d'impayés dans Odoo (D4). */
  "emailing.reappro.actif": "true",
  "emailing.reappro.avance_jours": "7",
  "emailing.reappro.commandes_min": "3",
  "emailing.reappro.ecart_max_pct": "50",
  "emailing.panier.actif": "true",
  "emailing.panier.delai_heures": "24",
  "emailing.alerte_bons.actif": "true",
  "emailing.alerte_droits.actif": "true",
  "emailing.impayes.actif": "true",
  "emailing.frequence_max": "2",
  "emailing.frequence_jours": "7",
  "emailing.plage_debut": "8",
  "emailing.plage_fin": "19",
  "emailing.expediteur_nom": "ExploCardio.fr",
  "emailing.alerte_panne_minutes": "30",
} as const;

export type CleParametre = keyof typeof PARAMETRES_PAR_DEFAUT | (string & {});

export async function lireParametre(cle: CleParametre, defaut?: string): Promise<string | null> {
  const p = await dbSite().parametre.findUnique({ where: { cle } });
  if (p) return p.valeur;
  return (PARAMETRES_PAR_DEFAUT as Record<string, string>)[cle] ?? defaut ?? null;
}

export async function lireParametreEntier(cle: CleParametre, defaut: number): Promise<number> {
  const v = Number.parseInt((await lireParametre(cle)) ?? "", 10);
  return Number.isFinite(v) ? v : defaut;
}

/** Modifie un paramètre et conserve l'historique (auteur, date, ancienne et nouvelle valeur). */
export async function ecrireParametre(cle: string, valeur: string, auteurId: string | null): Promise<void> {
  await dbSite().$transaction(async (tx) => {
    const avant = await tx.parametre.findUnique({ where: { cle } });
    await tx.parametre.upsert({ where: { cle }, create: { cle, valeur }, update: { valeur } });
    await tx.historiqueParametre.create({
      data: { cle, auteurId, ancienneValeur: avant?.valeur ?? null, nouvelleValeur: valeur },
    });
  });
}
