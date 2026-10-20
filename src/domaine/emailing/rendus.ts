import type { Envoi } from "@generated/site/client";
import type { EmailRendu } from "@/emails/rendu";

// Rendu au moment de l'envoi des emails de scénarios et de campagnes (F10, R2, FR-019) : prix,
// disponibilités et préférences du moment. Chaque scénario dit aussi si son objet existe encore
// (commande passée, droits prolongés, panier vidé… → envoi annulé, FR-010).

export class VariableManquante extends Error {
  constructor(readonly variable: string) {
    super(`variable manquante : ${variable}`);
  }
}

type Scenario = {
  rendre(envoi: Envoi): Promise<EmailRendu>;
  objetValide(envoi: Envoi, maintenant: Date): Promise<boolean>;
};

async function scenarioDuModele(modele: string): Promise<Scenario | null> {
  switch (modele) {
    case "relance_reapprovisionnement":
      return import("./scenarios/reapprovisionnement");
    case "campagne":
      return import("./campagnes");
    case "panier_abandonne":
      return import("./scenarios/panier");
    case "relance_impaye":
      return import("./scenarios/impayes");
    case "droits_rappel_fin":
      return (await import("./scenarios/alertes")).alerteDroits;
    case "bons_rappel_expiration":
      return (await import("./scenarios/alertes")).alerteBons;
    default:
      return null;
  }
}

export async function rendreEnvoi(envoi: Envoi): Promise<EmailRendu> {
  const s = await scenarioDuModele(envoi.modele);
  if (!s) throw new Error(`Aucun rendu différé pour le modèle ${envoi.modele}.`);
  return s.rendre(envoi);
}

export async function objetToujoursValide(envoi: Envoi, maintenant: Date): Promise<boolean> {
  const s = await scenarioDuModele(envoi.modele);
  return s ? s.objetValide(envoi, maintenant) : true;
}
