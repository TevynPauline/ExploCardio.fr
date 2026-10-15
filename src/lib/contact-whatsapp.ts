import { lireParametre } from "@/lib/parametres";
import { modeDuSite } from "@/lib/config";

// Liens de la hotline WhatsApp Business (FR-033, F09). Le numéro est un paramètre du
// back-office. En démonstration, les boutons ouvrent une page qui explique que personne n'est
// contacté : aucun lien `tel:` ni `wa.me` vers un vrai numéro. F09 utilise obligatoirement ce module.

export const PAGE_CONTACT_DEMO = "/demo/contact";

export type LiensContact = {
  numeroAffiche: string;
  appeler: string;
  ecrire: string;
  demonstration: boolean;
};

export async function liensContact(messagePrerempli = "Bonjour, je souhaite de l'aide."): Promise<LiensContact> {
  const numero = (await lireParametre("contact.whatsapp")) ?? "";
  if (modeDuSite() === "demo") {
    return {
      numeroAffiche: numero,
      appeler: `${PAGE_CONTACT_DEMO}?moyen=appel`,
      ecrire: `${PAGE_CONTACT_DEMO}?moyen=whatsapp`,
      demonstration: true,
    };
  }
  const chiffres = numero.replace(/[^\d+]/g, "");
  return {
    numeroAffiche: numero,
    appeler: `tel:${chiffres}`,
    ecrire: `https://wa.me/${chiffres.replace(/^\+/, "")}?text=${encodeURIComponent(messagePrerempli)}`,
    demonstration: false,
  };
}
