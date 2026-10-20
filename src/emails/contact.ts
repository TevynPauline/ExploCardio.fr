import { lireReglagesHoraires, resumeHoraires } from "@/domaine/contact/horaires";
import { liensContact, messagePrerempli } from "@/lib/contact-whatsapp";
import { urlDuSite } from "./charte";

// Bloc de contact du pied des emails transactionnels (F09, FR-003, US1-7) : numéro, horaires,
// lien « Écrire sur WhatsApp » (page de démonstration en phase 1). Null sans numéro renseigné.

export type ContactEmail = { numero: string; horaires: string; ecrire: string } | null;

export async function contactEmail(): Promise<ContactEmail> {
  const [liens, { horaires }] = await Promise.all([liensContact(messagePrerempli(null)), lireReglagesHoraires()]);
  if (!liens) return null;
  return { numero: liens.numeroAffiche, horaires: resumeHoraires(horaires), ecrire: liens.ecrire.startsWith("/") ? urlDuSite(liens.ecrire) : liens.ecrire };
}
