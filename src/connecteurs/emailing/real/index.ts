import { ConfigurationIncomplete } from "../../erreurs";
import { implementationRefusee } from "../../non-livre";
import type { ConnecteurEmailing, EmailClient, NotificationEquipe } from "../interfaces";
import { ClientBrevo } from "./client";
import { creerGardeRecette, listeIgnoreeEnProduction } from "@/lib/garde-recette-emailing";

// Mode réel du connecteur emailing : Brevo (F25). Configuration incomplète → chaque opération
// lève ConfigurationIncomplete, sans jamais basculer en démonstration (FR-003).
// Lot 1 : configuration, client et garde de recette (seconde barrière : aucun envoi hors de la
// liste sur la recette). Les opérations d'envoi, de suivi et de contact arrivent au lot 2.

type Env = Record<string, string | undefined>;

let signale = false;

export function creerEmailingReel(variablesManquantes: string[], env: Env = process.env): ConnecteurEmailing {
  if (variablesManquantes.length) return implementationRefusee<ConnecteurEmailing>("emailing", variablesManquantes);

  if (listeIgnoreeEnProduction(env) && !signale) {
    signale = true;
    console.error("[emailing] EMAILING_ADRESSES_AUTORISEES est renseignée sur le site public : elle est ignorée (FR-017).");
  }
  const garde = creerGardeRecette(env);
  // Construit dès maintenant : la clé est validée par Brevo au premier appel.
  void new ClientBrevo({ cle: env.EMAILING_API_KEY! });
  const nonLivre = () => new ConfigurationIncomplete("emailing", []);

  return {
    async envoyerEmail(email: EmailClient) {
      garde.verifier(email.destinataire);
      throw nonLivre();
    },
    async envoyerNotificationEquipe(n: NotificationEquipe) {
      for (const d of n.destinataires) garde.verifier(d);
      throw nonLivre();
    },
    async mettreAJourContact() {
      throw nonLivre();
    },
    async lireSuivi() {
      throw nonLivre();
    },
  };
}
