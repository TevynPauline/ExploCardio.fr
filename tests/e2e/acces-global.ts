import { createHmac } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { FullConfig } from "@playwright/test";
import { requete } from "./bases";

// Préparation globale des parcours : cookie d'accès au site de démonstration (US8), calculé
// comme le site le calcule, pour que chaque parcours démarre « après le mot de passe ».
// Le test tests/e2e/acces-demo.spec.ts vérifie, lui, le passage par la page d'accès.

export const ETAT_ACCES = "playwright/.auth/acces-demo.json";

export async function valeurCookieAcces(): Promise<string> {
  const [ligne] = await requete<{ valeur: string }>("site", `SELECT valeur FROM parametre WHERE cle = 'demo.mot_de_passe_version'`);
  const version = ligne?.valeur ?? "0";
  const sig = createHmac("sha256", `acces-demo:${process.env.AUTH_SECRET}`).update(version).digest("base64url");
  return `${version}.${sig}`;
}

export default async function preparer(config: FullConfig) {
  await ecrireEtatAcces(config.projects[0]?.use.baseURL ?? "http://localhost:3100");
}

/** (Ré)écrit le cookie d'accès des parcours, par exemple après un changement de mot de passe. */
export async function ecrireEtatAcces(baseURL: string) {
  const etat = {
    cookies: [
      {
        name: "ec_demo_acces",
        value: await valeurCookieAcces(),
        domain: new URL(baseURL).hostname,
        path: "/",
        expires: -1,
        httpOnly: true,
        secure: false,
        sameSite: "Lax" as const,
      },
      // Information cookies déjà vue : le bandeau ne recouvre pas les parcours (US3 a ses propres tests).
      {
        name: "ec_consentement",
        value: encodeURIComponent(JSON.stringify({ v: 1, date: new Date().toISOString(), finalites: {} })),
        domain: new URL(baseURL).hostname,
        path: "/",
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };
  mkdirSync(dirname(ETAT_ACCES), { recursive: true });
  writeFileSync(ETAT_ACCES, JSON.stringify(etat));
}
