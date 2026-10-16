/**
 * Mesure de performance (T089, plan : pages catalogue utilisables en moins de 2 s sur mobile 4G).
 * Lance Lighthouse CI sur un site déjà démarré (`npm run build && npm run start`), en passant
 * le mot de passe du site de démonstration par un cookie d'accès calculé comme le site.
 * Usage : npm run test:lighthouse [-- http://localhost:3000]
 * Accueil, vue catalogue et une page de famille (F01) ; les fiches produit de F03 s'y ajouteront.
 */
import { spawnSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { existsSync } from "node:fs";
import pg from "pg";
import { chromium } from "@playwright/test";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const base = (process.argv[2] ?? process.env.LHCI_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const PAGES = ["/", "/catalogue", "/holter-ecg"];

async function cookieAcces(): Promise<string> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const r = await client.query<{ valeur: string }>(`SELECT valeur FROM parametre WHERE cle = 'demo.mot_de_passe_version'`);
  await client.end();
  const version = r.rows[0]?.valeur ?? "0";
  const sig = createHmac("sha256", `acces-demo:${process.env.AUTH_SECRET}`).update(version).digest("base64url");
  return `ec_demo_acces=${version}.${sig}`;
}

const enTetes = process.env.SITE_MODE === "prod" ? {} : { Cookie: await cookieAcces() };
const resultat = spawnSync(
  "npx",
  [
    "lhci",
    "autorun",
    "--config=tests/lighthouse/lighthouserc.json",
    ...PAGES.map((p) => `--collect.url=${base}${p}`),
    `--collect.chromePath=${chromium.executablePath()}`,
    `--collect.settings.extraHeaders=${JSON.stringify(enTetes)}`,
  ],
  { stdio: "inherit" },
);
process.exit(resultat.status ?? 1);
