import { dbSite } from "@/lib/db/site";
import { NotFound } from "../../erreurs";
import type { ConnecteurEmailing, EmailTransactionnel, EtatRemise, NotificationEquipe } from "../interfaces";

// Connecteur emailing de démonstration (FR-029, contracts/emailing.md) :
// AUCUN email ni SMS réel. Chaque message est enregistré dans la boîte de démonstration du
// back-office, avec son rendu. La remise est simulée : « remis », ou « rejeté » pour les
// adresses de test prévues à cet effet.

/** Adresses de test dont la remise est simulée en échec. */
export const DOMAINE_REJET_DEMO = "@rejet.demo.explocardio.test";

function etatSimule(destinataires: string[]): EtatRemise {
  return destinataires.some((d) => d.toLowerCase().endsWith(DOMAINE_REJET_DEMO)) ? "rejete" : "remis";
}

function echapper(texte: string): string {
  return texte.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export function creerEmailingDemo(): ConnecteurEmailing {
  return {
    async envoyerTransactionnel(email: EmailTransactionnel, cle: string) {
      const message = await dbSite().messageDemonstration.upsert({
        where: { cle },
        update: {},
        create: {
          cle,
          type: "email_client",
          destinataire: email.destinataire,
          objet: email.objet,
          rendu: email.rendu,
          declencheur: `${email.declencheur} (modèle ${email.modele})`,
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
          declencheur: n.declencheur,
          etatRemise: etatSimule(n.destinataires),
        },
      });
      return { envoiId: message.id };
    },

    async mettreAJourContact() {
      // Aucun outil d'emailing en démonstration : les consentements restent dans la base du site.
    },

    async lireEtatRemise(envoiId: string): Promise<EtatRemise> {
      const message = await dbSite().messageDemonstration.findUnique({ where: { id: envoiId } });
      if (!message) throw new NotFound("Envoi", envoiId);
      return message.etatRemise as EtatRemise;
    },
  };
}
