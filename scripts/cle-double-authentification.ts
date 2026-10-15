/**
 * Affiche la clé de double authentification des comptes de démonstration (administrateur et
 * support), au format attendu par les applications d'authentification (base32).
 * Usage : npm run demo:cle-2fa
 */
import { existsSync } from "node:fs";
import { createOTP } from "@better-auth/utils/otp";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const secret = process.env.DEMO_TOTP_SECRET;
if (!secret) {
  console.error("DEMO_TOTP_SECRET est absent de .env.local.");
  process.exit(1);
}
const uri = createOTP(secret).url("ExploCardio.fr (démo)", "equipe-demo");
const cle = new URL(uri).searchParams.get("secret") ?? "";
console.log("\nClé à saisir dans l'application d'authentification (type : basée sur l'heure) :\n");
console.log(`  ${cle.match(/.{1,4}/g)?.join(" ")}\n`);
console.log("Les espaces sont facultatifs. Code actuel, pour vérifier :", await createOTP(secret).totp(), "\n");
