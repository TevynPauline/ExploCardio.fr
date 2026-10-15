import { createHmac, timingSafeEqual } from "node:crypto";
import { dbSite } from "@/lib/db/site";
import { PARAM_MOT_DE_PASSE, PARAM_VERSION, hacher, verifier } from "./mot-de-passe-site";

// Accès au site de démonstration (US8, FR-034, FR-037) : un cookie signé porte le numéro de
// version du mot de passe. Changer le mot de passe incrémente la version : tous les cookies
// existants deviennent invalides, les sessions sont fermées.

export const COOKIE_ACCES = "ec_demo_acces";
export const DUREE_ACCES_S = 30 * 24 * 3600;

function signature(version: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET est absent : impossible de signer l'accès au site de démonstration.");
  return createHmac("sha256", `acces-demo:${secret}`).update(version).digest("base64url");
}

export function valeurCookie(version: string): string {
  return `${version}.${signature(version)}`;
}

let cache: { version: string; lu: number } | null = null;

/** Version courante du mot de passe (mise en cache 10 secondes). */
export async function versionCourante(): Promise<string> {
  if (cache && Date.now() - cache.lu < 10_000) return cache.version;
  const p = await dbSite().parametre.findUnique({ where: { cle: PARAM_VERSION } });
  cache = { version: p?.valeur ?? "0", lu: Date.now() };
  return cache.version;
}

export async function cookieValide(valeur: string | undefined): Promise<boolean> {
  if (!valeur) return false;
  const [version, sig] = valeur.split(".");
  if (!version || !sig) return false;
  const attendue = Buffer.from(signature(version));
  const recue = Buffer.from(sig);
  if (attendue.length !== recue.length || !timingSafeEqual(attendue, recue)) return false;
  return version === (await versionCourante());
}

/** Vérifie le mot de passe saisi ; renvoie la valeur du cookie à poser, ou null. */
export async function ouvrirAcces(motDePasse: string): Promise<string | null> {
  const p = await dbSite().parametre.findUnique({ where: { cle: PARAM_MOT_DE_PASSE } });
  if (!p || !(await verifier(motDePasse, p.valeur))) return null;
  return valeurCookie(await versionCourante());
}

/** Change le mot de passe et ferme toutes les sessions d'accès (FR-037). */
export async function changerMotDePasse(nouveau: string, auteur: { id: string; libelle: string }): Promise<void> {
  if (nouveau.length < 10) throw new Error("Le mot de passe doit contenir au moins 10 caractères.");
  const version = String(Number(await versionCourante()) + 1 || 1);
  await dbSite().$transaction([
    dbSite().parametre.upsert({
      where: { cle: PARAM_MOT_DE_PASSE },
      create: { cle: PARAM_MOT_DE_PASSE, valeur: await hacher(nouveau), type: "secret" },
      update: { valeur: await hacher(nouveau) },
    }),
    dbSite().parametre.upsert({
      where: { cle: PARAM_VERSION },
      create: { cle: PARAM_VERSION, valeur: version, type: "entier" },
      update: { valeur: version },
    }),
    dbSite().historiqueParametre.create({
      data: { cle: PARAM_MOT_DE_PASSE, auteurId: auteur.id, ancienneValeur: "(masqué)", nouvelleValeur: "(masqué)" },
    }),
    dbSite().journalAction.create({
      data: { auteurId: auteur.id, auteur: auteur.libelle, action: "demo.mot_de_passe_change", detail: { version } },
    }),
  ]);
  cache = null;
}
