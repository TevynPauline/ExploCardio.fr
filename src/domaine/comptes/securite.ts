import { createHmac, randomUUID } from "node:crypto";
import { demanderEnvoi } from "@/domaine/emailing/envoi";
import { dbSite } from "@/lib/db/site";
import type { EmailRendu } from "@/emails/modeles";

// Journal de sécurité et échecs de connexion (F02, FR-032, FR-034, FR-035, R5).

export type EvenementSecurite =
  | "connexion"
  | "deconnexion"
  | "echec_connexion"
  | "blocage"
  | "mot_de_passe_modifie"
  | "email_change_demande"
  | "email_modifie"
  | "double_authentification_activee"
  | "double_authentification_desactivee";

export async function journaliserSecurite(evenement: EvenementSecurite, utilisateurId: string | null, detail: Record<string, unknown> = {}) {
  await dbSite().journalAction.create({
    data: {
      auteurId: utilisateurId,
      auteur: utilisateurId ? "titulaire du compte" : "anonyme",
      action: `securite.${evenement}`,
      objet: utilisateurId,
      detail: JSON.parse(JSON.stringify(detail)),
    },
  });
}

/** Envoie un email au titulaire (événements sensibles, FR-035). */
export async function notifier(destinataire: string, email: EmailRendu, declencheur: string) {
  await demanderEnvoi({ modele: email.modele, destinataire, rendu: email, declencheur, cle: `securite:${declencheur}:${randomUUID()}` });
}

export const MAX_ECHECS = 5;
export const FENETRE_ECHECS_MS = 15 * 60_000;
export const DUREE_BLOCAGE_MS = 15 * 60_000;

export function empreinteEmail(email: string): string {
  return createHmac("sha256", `echec:${process.env.AUTH_SECRET ?? ""}`).update(email.trim().toLowerCase()).digest("base64url").slice(0, 32);
}

/**
 * Compte un échec de connexion pour l'email donné. Au 5ᵉ échec en 15 minutes, le compte (s'il
 * existe) est bloqué 15 minutes ; renvoie l'utilisateur bloqué pour qu'il soit prévenu.
 */
export async function compterEchec(email: string, maintenant = new Date()): Promise<{ bloque: boolean; utilisateur: { id: string; email: string } | null }> {
  const cle = empreinteEmail(email);
  const ligne = await dbSite().echecConnexion.findUnique({ where: { cle } });
  const nouvelleFenetre = !ligne || maintenant.getTime() - ligne.premierEchec.getTime() > FENETRE_ECHECS_MS;
  const compte = nouvelleFenetre ? 1 : ligne!.compte + 1;
  await dbSite().echecConnexion.upsert({
    where: { cle },
    create: { cle, premierEchec: maintenant, compte },
    update: nouvelleFenetre ? { premierEchec: maintenant, compte } : { compte },
  });
  const utilisateur = await dbSite().utilisateur.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true, email: true } });
  await journaliserSecurite("echec_connexion", utilisateur?.id ?? null);
  if (compte < MAX_ECHECS || !utilisateur) return { bloque: false, utilisateur };
  await dbSite().utilisateur.update({ where: { id: utilisateur.id }, data: { bloqueJusqua: new Date(maintenant.getTime() + DUREE_BLOCAGE_MS) } });
  await dbSite().echecConnexion.delete({ where: { cle } });
  await journaliserSecurite("blocage", utilisateur.id);
  return { bloque: true, utilisateur };
}

export async function reussiteConnexion(email: string, utilisateurId: string) {
  await dbSite().echecConnexion.deleteMany({ where: { cle: empreinteEmail(email) } });
  await journaliserSecurite("connexion", utilisateurId);
}

export async function estBloque(email: string, maintenant = new Date()): Promise<boolean> {
  const u = await dbSite().utilisateur.findUnique({ where: { email: email.trim().toLowerCase() }, select: { bloqueJusqua: true } });
  return Boolean(u?.bloqueJusqua && u.bloqueJusqua > maintenant);
}
