import { compteConnecte } from "@/domaine/comptes/session";
import { dbSite } from "@/lib/db/site";
import { liensContact, messagePrerempli, type LiensContact } from "@/lib/contact-whatsapp";
import { etatReponse, lireReglagesHoraires, resumeHoraires, type EtatReponse } from "./horaires";

// Contact WhatsApp affiché partout (F09, R1) : numéro, horaires, état, liens avec le message
// pré-rempli du client connecté (nom et cabinet seulement, FR-005).

export type Contact = { liens: LiensContact | null; horaires: string; etat: EtatReponse; message: string };

/** Message pré-rempli du compte connecté (ou modèle pour un visiteur). */
export async function messageDuVisiteur(): Promise<string> {
  const session = await compteConnecte();
  if (!session) return messagePrerempli(null);
  const c = await dbSite().compteClient.findUnique({ where: { id: session.id }, include: { utilisateur: true } });
  if (!c) return messagePrerempli(null);
  return messagePrerempli({ nom: c.utilisateur.name, cabinet: c.nomCabinet, civilite: c.utilisateur.civilite, type: c.type === "structure" ? "cabinet" : "medecin" });
}

export async function contactAffiche(maintenant = new Date()): Promise<Contact> {
  const [message, { horaires, fermetures }] = await Promise.all([messageDuVisiteur(), lireReglagesHoraires()]);
  return { liens: await liensContact(message), horaires: resumeHoraires(horaires), etat: etatReponse(horaires, fermetures, maintenant), message };
}
