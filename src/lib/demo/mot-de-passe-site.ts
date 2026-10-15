import { randomBytes, scrypt as scryptRappel, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Mot de passe d'accès au site de démonstration (FR-034) : stocké haché (scrypt) dans les
// paramètres du site, jamais en clair.

const scrypt = promisify(scryptRappel) as (mdp: string, sel: Buffer, longueur: number) => Promise<Buffer>;

export const PARAM_MOT_DE_PASSE = "demo.mot_de_passe_hache";
export const PARAM_VERSION = "demo.mot_de_passe_version";

export async function hacher(motDePasse: string): Promise<string> {
  const sel = randomBytes(16);
  const empreinte = await scrypt(motDePasse, sel, 32);
  return `scrypt:${sel.toString("hex")}:${empreinte.toString("hex")}`;
}

export async function verifier(motDePasse: string, stocke: string): Promise<boolean> {
  const [algo, selHex, empreinteHex] = stocke.split(":");
  if (algo !== "scrypt" || !selHex || !empreinteHex) return false;
  const attendue = Buffer.from(empreinteHex, "hex");
  const calculee = await scrypt(motDePasse, Buffer.from(selHex, "hex"), attendue.length);
  return timingSafeEqual(attendue, calculee);
}
