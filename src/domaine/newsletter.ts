import { createHash, randomBytes } from "node:crypto";
import { demanderEnvoi } from "@/domaine/emailing/envoi";
import { synchroniserContact } from "@/domaine/emailing/preferences";
import { dbSite } from "@/lib/db/site";
import { emailConfirmationNewsletter } from "@/emails/modeles";
import { urlDuSite } from "@/emails/charte";

// Newsletter à double consentement (F01, FR-028, R7) : l'inscription n'est effective qu'après
// le clic sur le lien reçu par email. Seule l'empreinte du jeton est conservée.

import { TEXTE_CONSENTEMENT_COURT } from "@/ui/textes-newsletter";

/** Texte exact présenté au visiteur, conservé avec son consentement. */
export const TEXTE_CONSENTEMENT = TEXTE_CONSENTEMENT_COURT;
export const VALIDITE_JOURS = 7;
const RENVOI_MIN_MS = 10 * 60_000;

const empreinteJeton = (jeton: string) => createHash("sha256").update(jeton).digest("hex");

/** Demande d'inscription. La réponse est la même dans tous les cas (aucune divulgation). */
export async function demanderInscription(emailSaisi: string, maintenant = new Date()): Promise<void> {
  const email = emailSaisi.trim().toLowerCase();
  const existante = await dbSite().inscriptionNewsletter.findUnique({ where: { email } });
  if (existante?.etat === "confirmee") return;
  if (existante?.etat === "en_attente" && maintenant.getTime() - existante.demandeeLe.getTime() < RENVOI_MIN_MS) return;

  const jeton = randomBytes(24).toString("base64url");
  await dbSite().inscriptionNewsletter.upsert({
    where: { email },
    create: { email, empreinteJeton: empreinteJeton(jeton), textePresente: TEXTE_CONSENTEMENT, demandeeLe: maintenant },
    update: { etat: "en_attente", empreinteJeton: empreinteJeton(jeton), textePresente: TEXTE_CONSENTEMENT, demandeeLe: maintenant, confirmeeLe: null },
  });
  const lien = urlDuSite(`/newsletter/confirmation?jeton=${jeton}`);
  const contenu = await emailConfirmationNewsletter(lien);
  await demanderEnvoi({ modele: contenu.modele, destinataire: email, rendu: contenu, declencheur: "inscription à la newsletter", cle: `newsletter:${email}:${empreinteJeton(jeton).slice(0, 16)}` });
}

export type ResultatConfirmation = "confirmee" | "expiree" | "inconnue";

export async function confirmerInscription(jeton: string, maintenant = new Date()): Promise<ResultatConfirmation> {
  const inscription = await dbSite().inscriptionNewsletter.findUnique({ where: { empreinteJeton: empreinteJeton(jeton) } });
  if (!inscription) return "inconnue";
  if (inscription.etat === "confirmee") return "confirmee";
  if (inscription.etat !== "en_attente") return "inconnue";
  if (maintenant.getTime() - inscription.demandeeLe.getTime() > VALIDITE_JOURS * 86_400_000) {
    await dbSite().inscriptionNewsletter.update({ where: { id: inscription.id }, data: { etat: "expiree" } });
    return "expiree";
  }
  // Le même jeton (renouvelé) sert ensuite au lien de désinscription des envois.
  await dbSite().$transaction([
    dbSite().inscriptionNewsletter.update({ where: { id: inscription.id }, data: { etat: "confirmee", confirmeeLe: maintenant } }),
    dbSite().consentement.create({
      data: { email: inscription.email, objet: "newsletter", etat: true, origine: "pied de page (double consentement)", textePresente: inscription.textePresente },
    }),
  ]);
  await synchroniserContact(inscription.email, { newsletter: true });
  return "confirmee";
}

export async function desinscrire(jeton: string, maintenant = new Date()): Promise<boolean> {
  const inscription = await dbSite().inscriptionNewsletter.findUnique({ where: { empreinteJeton: empreinteJeton(jeton) } });
  if (!inscription || inscription.etat === "desinscrite") return Boolean(inscription);
  await dbSite().$transaction([
    dbSite().inscriptionNewsletter.update({ where: { id: inscription.id }, data: { etat: "desinscrite", desinscriteLe: maintenant } }),
    dbSite().consentement.create({
      data: { email: inscription.email, objet: "newsletter", etat: false, origine: "lien de désinscription", textePresente: "Désinscription de la newsletter" },
    }),
  ]);
  await synchroniserContact(inscription.email, { newsletter: false });
  return true;
}
