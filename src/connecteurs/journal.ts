import { dbSite } from "@/lib/db/site";
import { estErreurConnecteur } from "./erreurs";
import type { ModeConnecteur, NomConnecteur } from "@/lib/config";

// Journal des connecteurs (contracts/common.md) : chaque appel est inscrit avec le connecteur,
// le mode, l'opération, l'objet, le résultat et la durée. Jamais de donnée de carte, de patient
// ni de mot de passe : seul un identifiant d'objet est retenu.

const CHAMPS_OBJET = ["ref", "reference", "partenaireRef", "commandeRef", "abonnementRef", "numero"];

function objetDeLAppel(args: unknown[]): string | null {
  const premier = args[0];
  if (typeof premier === "string") return premier.slice(0, 120);
  if (premier && typeof premier === "object" && !Array.isArray(premier)) {
    for (const champ of CHAMPS_OBJET) {
      const valeur = (premier as Record<string, unknown>)[champ];
      if (typeof valeur === "string") return valeur.slice(0, 120);
    }
  }
  return null;
}

export type EntreeJournal = {
  connecteur: NomConnecteur;
  mode: ModeConnecteur;
  operation: string;
  objet: string | null;
  resultat: "succes" | "erreur";
  motifErreur: string | null;
  dureeMs: number;
};

async function inscrire(entree: EntreeJournal) {
  try {
    await dbSite().journalConnecteur.create({
      data: {
        connecteur: entree.connecteur,
        mode: entree.mode,
        operation: entree.operation,
        objet: entree.objet,
        resultat: entree.resultat,
        niveau: entree.resultat === "erreur" ? "erreur" : "info",
        motifErreur: entree.motifErreur,
        dureeMs: entree.dureeMs,
      },
    });
  } catch (e) {
    // Le journal ne doit jamais faire échouer l'appel lui-même.
    console.error("[journal des connecteurs] inscription impossible", e);
  }
}

type Fonction = (...args: unknown[]) => unknown;

/** Contrôle exécuté avant chaque appel (panne simulée, refus des données fictives). */
export type ControleAvantAppel = (operation: string, args: unknown[]) => Promise<void> | void;

/**
 * Enveloppe un domaine de connecteur : chaque méthode appelée est contrôlée puis journalisée.
 * `operationPrefixe` sert aux domaines d'Odoo (ex. « catalogue.lireArticle »).
 */
export function envelopper<T extends object>(
  cible: T,
  options: {
    connecteur: NomConnecteur;
    mode: ModeConnecteur;
    operationPrefixe?: string;
    controles?: ControleAvantAppel[];
  },
): T {
  return new Proxy(cible, {
    get(objet, propriete, recepteur) {
      const valeur = Reflect.get(objet, propriete, recepteur) as unknown;
      if (typeof valeur !== "function" || typeof propriete !== "string") return valeur;
      const operation = options.operationPrefixe
        ? `${options.operationPrefixe}.${propriete}`
        : propriete;
      return async (...args: unknown[]) => {
        const debut = performance.now();
        try {
          for (const controle of options.controles ?? []) await controle(operation, args);
          const resultat = await (valeur as Fonction).apply(objet, args);
          await inscrire({
            connecteur: options.connecteur,
            mode: options.mode,
            operation,
            objet: objetDeLAppel(args),
            resultat: "succes",
            motifErreur: null,
            dureeMs: Math.round(performance.now() - debut),
          });
          return resultat;
        } catch (e) {
          await inscrire({
            connecteur: options.connecteur,
            mode: options.mode,
            operation,
            objet: objetDeLAppel(args),
            resultat: "erreur",
            motifErreur: estErreurConnecteur(e) ? e.code : e instanceof Error ? e.name : "inconnu",
            dureeMs: Math.round(performance.now() - debut),
          });
          throw e;
        }
      };
    },
  });
}
