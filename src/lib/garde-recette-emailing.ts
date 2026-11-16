import { adressesAutorisees, environnementEmailing, modeDuConnecteur, type EnvironnementEmailing } from "@/lib/config";
import { OperationRefusee } from "@/connecteurs/erreurs";

// Garde de recette de l'outil d'envoi (F25, FR-016, FR-017, research R8).
// Sur le site de recette, branché sur une copie d'Odoo qui contient de vrais clients, seuls les
// envois vers des adresses autorisées partent. Elle sert deux fois : dans le domaine (l'envoi est
// annulé et conservé, consultable) et dans le connecteur (seconde barrière).

type Env = Record<string, string | undefined>;

/** Adresse permise par la liste : adresse exacte, ou domaine exact « @exemple.fr ». */
export function adresseAutorisee(adresse: string, liste: readonly string[]): boolean {
  const a = adresse.trim().toLowerCase();
  const arobase = a.lastIndexOf("@");
  if (arobase <= 0) return false;
  const domaine = a.slice(arobase);
  return liste.some((entree) => (entree.startsWith("@") ? entree === domaine : entree === a));
}

export type GardeRecette = {
  environnement: EnvironnementEmailing | null;
  /** Vrai si l'envoi vers cette adresse est permis (toujours vrai hors recette). */
  permet(adresse: string): boolean;
  /** Lève OperationRefusee si l'adresse n'est pas permise. */
  verifier(adresse: string): void;
};

export function creerGardeRecette(env: Env = process.env): GardeRecette {
  const environnement = environnementEmailing(env);
  const liste = adressesAutorisees(env);
  const permet = (adresse: string) => environnement !== "recette" || adresseAutorisee(adresse, liste);
  return {
    environnement,
    permet,
    verifier(adresse) {
      if (!permet(adresse)) {
        throw new OperationRefusee("Envoi refusé : adresse non autorisée sur le site de recette.", {
          cause: "adresse_non_autorisee_en_recette",
        });
      }
    },
  };
}

/** Garde active : connecteur emailing réel sur le site de recette. */
export function gardeRecetteActive(env: Env = process.env): boolean {
  return modeDuConnecteur("emailing", env) === "real" && environnementEmailing(env) === "recette";
}

/** FR-017 : liste renseignée sur le site public (elle y est ignorée, il faut le signaler). */
export function listeIgnoreeEnProduction(env: Env = process.env): boolean {
  return modeDuConnecteur("emailing", env) === "real" && environnementEmailing(env) === "production" && adressesAutorisees(env).length > 0;
}
