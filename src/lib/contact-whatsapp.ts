import { lireParametre } from "@/lib/parametres";
import { modeDuSite } from "@/lib/config";

// Liens de la hotline WhatsApp Business (FR-033 de F01, F09). Le numéro est un paramètre du
// back-office. Le site n'a aucun lien technique avec WhatsApp (F09, FR-002) : il compose un lien
// `tel:` et un lien `wa.me` avec un message pré-rempli. En démonstration, les boutons ouvrent
// une page qui explique que personne n'est contacté : aucun lien vers un vrai numéro (FR-017).

export const PAGE_CONTACT_DEMO = "/demo/contact";

export type LiensContact = {
  numeroAffiche: string;
  appeler: string;
  ecrire: string;
  demonstration: boolean;
};

export type IdentiteMessage = { nom: string; cabinet: string | null; civilite?: string | null; type?: "medecin" | "cabinet" };

const propre = (s: string | null | undefined) => (s ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

/**
 * Message pré-rempli (F09, FR-005, D2) : le nom et le cabinet du client connecté, rien
 * d'autre ; pour un visiteur, le modèle à compléter.
 */
export function messagePrerempli(c: IdentiteMessage | null): string {
  if (!c) return "Bonjour, je suis le Dr …, cabinet …";
  const nom = propre(c.nom);
  const cabinet = propre(c.cabinet);
  if (c.type === "cabinet" && cabinet) return `Bonjour, cabinet ${cabinet}.`;
  const titre = c.civilite === "Pr" ? "le Pr" : "le Dr";
  return `Bonjour, je suis ${titre} ${nom}${cabinet ? `, cabinet ${cabinet}` : ""}.`;
}

/** Liens composés à partir du numéro ; null si aucun numéro n'est renseigné (D7). */
export function composerLiens(numero: string, message: string, demonstration: boolean): LiensContact | null {
  const numeroAffiche = numero.trim();
  if (!numeroAffiche) return null;
  if (demonstration) {
    return { numeroAffiche, appeler: `${PAGE_CONTACT_DEMO}?moyen=appel`, ecrire: `${PAGE_CONTACT_DEMO}?moyen=whatsapp`, demonstration: true };
  }
  const chiffres = numeroAffiche.replace(/[^\d+]/g, "");
  return {
    numeroAffiche,
    appeler: `tel:${chiffres}`,
    ecrire: `https://wa.me/${chiffres.replace(/^\+/, "")}?text=${encodeURIComponent(message)}`,
    demonstration: false,
  };
}

export async function liensContact(messagePersonnalise = "Bonjour, je souhaite de l'aide."): Promise<LiensContact | null> {
  return composerLiens((await lireParametre("contact.whatsapp")) ?? "", messagePersonnalise, modeDuSite() === "demo");
}
