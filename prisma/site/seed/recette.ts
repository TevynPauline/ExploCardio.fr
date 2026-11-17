import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@generated/site/client";
import { hacher, PARAM_MOT_DE_PASSE, PARAM_VERSION, verifier } from "@/lib/demo/mot-de-passe-site";
import { remplirContenusInitiaux } from "./contenus-initiaux";

// Site de recette (F14, « Recette ») : site fermé par mot de passe, branché sur les vrais
// services, sans aucune donnée fictive. Préparé à chaque déploiement, sans rien écraser :
// - mot de passe d'accès au site (RECETTE_SITE_PASSWORD), remplacé s'il a changé ;
// - contenus de départ (accueil, paramètres) manquants ;
// - premiers comptes de l'équipe (RECETTE_EQUIPE), créés s'ils n'existent pas encore, avec un
//   mot de passe provisoire (RECETTE_EQUIPE_PASSWORD) ; la double authentification est activée
//   par chacun à sa première connexion. Les comptes existants ne sont jamais modifiés.
// Rien de secret n'est jamais écrit dans les journaux.

export type MembreRecette = { nom: string; email: string };

const ADRESSE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
export const LONGUEUR_MIN_MOT_DE_PASSE = 12;

export class ConfigurationRecetteInvalide extends Error {}

/**
 * Lit RECETTE_EQUIPE : « Nom <adresse> » séparés par des points-virgules, par exemple
 * « Pauline Martin <pauline@exemple.fr>; Régis Durand <regis@exemple.fr> ».
 */
export function lireEquipeRecette(valeur: string | undefined): MembreRecette[] {
  const membres = (valeur ?? "")
    .split(";")
    .map((m) => m.trim())
    .filter(Boolean)
    .map((m) => {
      const r = /^(.+?)\s*<([^>]+)>$/.exec(m);
      const nom = r?.[1]?.trim() ?? "";
      const email = (r?.[2] ?? "").trim().toLowerCase();
      if (nom.length < 2 || nom.length > 80 || !ADRESSE.test(email)) {
        throw new ConfigurationRecetteInvalide(
          "RECETTE_EQUIPE : chaque personne s'écrit « Nom <adresse> », séparées par des points-virgules.",
        );
      }
      return { nom, email };
    });
  if (!membres.length) throw new ConfigurationRecetteInvalide("RECETTE_EQUIPE est vide : indiquez au moins une personne de l'équipe.");
  return membres;
}

/** Variables exigées par le site de recette ; un mot de passe trop court compte comme manquant. */
export function variablesRecetteManquantes(env: Record<string, string | undefined> = process.env): string[] {
  const manquantes = ["AUTH_SECRET", "RECETTE_SITE_PASSWORD", "RECETTE_EQUIPE", "RECETTE_EQUIPE_PASSWORD"].filter((v) => !env[v]?.trim());
  for (const v of ["RECETTE_SITE_PASSWORD", "RECETTE_EQUIPE_PASSWORD"]) {
    const valeur = env[v]?.trim();
    if (valeur && valeur.length < LONGUEUR_MIN_MOT_DE_PASSE) manquantes.push(`${v} (${LONGUEUR_MIN_MOT_DE_PASSE} caractères au moins)`);
  }
  if (env.CONNECTOR_ODOO !== "real") manquantes.push("CONNECTOR_ODOO=real");
  return manquantes;
}

/** Mot de passe d'accès au site : créé, ou remplacé s'il a changé (les accès ouverts sont alors refermés). */
export async function preparerMotDePasseSite(db: PrismaClient, motDePasse: string): Promise<"cree" | "remplace" | "inchange"> {
  const existant = await db.parametre.findUnique({ where: { cle: PARAM_MOT_DE_PASSE } });
  if (existant && (await verifier(motDePasse, existant.valeur))) return "inchange";
  const valeur = await hacher(motDePasse);
  if (!existant) {
    await db.parametre.create({ data: { cle: PARAM_MOT_DE_PASSE, valeur, type: "secret" } });
    await db.parametre.upsert({ where: { cle: PARAM_VERSION }, create: { cle: PARAM_VERSION, valeur: "1", type: "entier" }, update: {} });
    return "cree";
  }
  await db.parametre.update({ where: { cle: PARAM_MOT_DE_PASSE }, data: { valeur } });
  const version = await db.parametre.findUnique({ where: { cle: PARAM_VERSION } });
  const suivante = String((Number(version?.valeur) || 1) + 1);
  await db.parametre.upsert({ where: { cle: PARAM_VERSION }, create: { cle: PARAM_VERSION, valeur: suivante, type: "entier" }, update: { valeur: suivante } });
  return "remplace";
}

/** Premiers comptes de l'équipe (administrateurs) ; les adresses déjà inscrites sont laissées telles quelles. */
export async function creerEquipeRecette(db: PrismaClient, membres: MembreRecette[], motDePasse: string): Promise<string[]> {
  const { auth } = await import("@/lib/auth");
  const ctx = await auth.$context;
  const crees: string[] = [];
  for (const m of membres) {
    if (await db.utilisateur.findUnique({ where: { email: m.email } })) continue;
    const id = randomUUID();
    await db.utilisateur.create({
      data: {
        id,
        name: m.nom,
        email: m.email,
        emailVerified: true,
        role: "admin",
        // Double authentification à activer à la première connexion (exigée pour l'équipe).
        twoFactorEnabled: false,
        comptes: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: await ctx.password.hash(motDePasse) } },
      },
    });
    await db.journalAction.create({
      data: { auteur: "déploiement Scalingo (site de recette)", action: "equipe.creation_recette", objet: m.email, detail: { role: "admin" } },
    });
    crees.push(m.email);
  }
  return crees;
}

export type BilanRecette = { motDePasseSite: "cree" | "remplace" | "inchange"; comptesCrees: number };

export async function preparerSiteRecette(db: PrismaClient, env: Record<string, string | undefined> = process.env): Promise<BilanRecette> {
  const manquantes = variablesRecetteManquantes(env);
  if (manquantes.length) {
    throw new ConfigurationRecetteInvalide(`Site de recette : variables manquantes ou invalides : ${manquantes.join(", ")}. Renseignez-les dans Scalingo (onglet Environment).`);
  }
  const membres = lireEquipeRecette(env.RECETTE_EQUIPE);
  const motDePasseSite = await preparerMotDePasseSite(db, env.RECETTE_SITE_PASSWORD!.trim());
  await remplirContenusInitiaux(db);
  const crees = await creerEquipeRecette(db, membres, env.RECETTE_EQUIPE_PASSWORD!.trim());
  return { motDePasseSite, comptesCrees: crees.length };
}
