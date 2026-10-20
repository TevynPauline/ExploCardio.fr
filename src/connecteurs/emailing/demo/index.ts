import { dbSite } from "@/lib/db/site";
import { NotFound, OperationRefusee } from "../../erreurs";
import type { ConnecteurEmailing, EmailClient, NotificationEquipe, SuiviEnvoi } from "../interfaces";

// Connecteur emailing de démonstration (FR-029, contracts/emailing.md) :
// AUCUN email ni SMS réel. Chaque message est enregistré dans la boîte de démonstration du
// back-office, avec son rendu. La remise est simulée : « remis », ou « rejeté » pour les
// adresses de test prévues à cet effet (définitif ou temporaire). L'ouverture est simulée à la
// première consultation du message dans la boîte (F10, D9).

/** Adresses de test dont la remise est simulée en échec définitif (adresse inexistante). */
export const DOMAINE_REJET_DEMO = "@rejet.demo.explocardio.test";
/** Adresses de test dont la remise est simulée en échec temporaire (boîte pleine). */
export const DOMAINE_REJET_TEMPORAIRE_DEMO = "@temporaire.demo.explocardio.test";

const ADRESSE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function etatSimule(destinataires: string[]): string {
  const d = destinataires.map((x) => x.toLowerCase());
  if (d.some((x) => x.endsWith(DOMAINE_REJET_DEMO))) return "rejete";
  if (d.some((x) => x.endsWith(DOMAINE_REJET_TEMPORAIRE_DEMO))) return "rejete_temporaire";
  return "remis";
}

function echapper(texte: string): string {
  return texte.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export function creerEmailingDemo(): ConnecteurEmailing {
  return {
    async envoyerEmail(email: EmailClient, cle: string) {
      if (!ADRESSE.test(email.destinataire)) throw new OperationRefusee("Adresse email invalide.", { destinataire: email.destinataire });
      const message = await dbSite().messageDemonstration.upsert({
        where: { cle },
        update: {},
        create: {
          cle,
          type: "email_client",
          destinataire: email.destinataire,
          objet: email.objet,
          rendu: email.rendu,
          texte: email.texte,
          declencheur: `${email.declencheur} (modèle ${email.modele}, ${email.famille})`,
          etatRemise: etatSimule([email.destinataire]),
        },
      });
      return { envoiId: message.id };
    },

    async envoyerNotificationEquipe(n: NotificationEquipe, cle: string) {
      const message = await dbSite().messageDemonstration.upsert({
        where: { cle },
        update: {},
        create: {
          cle,
          type: n.canal === "sms" ? "notification_equipe_sms" : "notification_equipe_email",
          destinataire: n.destinataires.join(", "),
          objet: n.objet ?? (n.canal === "sms" ? "SMS" : "Notification"),
          rendu: n.canal === "sms" ? n.texte : `<p>${echapper(n.texte).replace(/\n/g, "<br>")}</p>`,
          texte: n.texte,
          declencheur: n.declencheur,
          etatRemise: etatSimule(n.destinataires),
        },
      });
      return { envoiId: message.id };
    },

    async mettreAJourContact() {
      // Aucun outil d'emailing en démonstration : les consentements restent dans la base du site.
    },

    async lireSuivi(envoiId: string): Promise<SuiviEnvoi> {
      const message = await dbSite().messageDemonstration.findUnique({ where: { id: envoiId } });
      if (!message) throw new NotFound("Envoi", envoiId);
      if (message.etatRemise === "rejete") return { etat: "rejete", ouvertLe: null, motifRejet: "Adresse inexistante (simulation)", rejetDefinitif: true };
      if (message.etatRemise === "rejete_temporaire") return { etat: "rejete", ouvertLe: null, motifRejet: "Boîte de réception pleine (simulation)", rejetDefinitif: false };
      return { etat: "remis", ouvertLe: message.ouvertLe, motifRejet: null, rejetDefinitif: false };
    },
  };
}
