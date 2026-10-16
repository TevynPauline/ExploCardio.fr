/**
 * Mesure de performance (T089, plan : pages catalogue utilisables en moins de 2 s sur mobile 4G).
 * Lance Lighthouse CI sur un site déjà démarré (`npm run build && npm run start`), en passant
 * le mot de passe du site de démonstration par un cookie d'accès calculé comme le site.
 * Usage : npm run test:lighthouse [-- http://localhost:3000]
 * Accueil, vue catalogue et une page de famille (F01) ; les fiches produit de F03 s'y ajouteront.
 */
import { spawnSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
const chrome = chromium.executablePath();

/**
 * Calibrage du ralentissement du processeur (méthode recommandée par Lighthouse) : le même
 * réglage ne simule pas le même téléphone sur un Mac récent et sur une machine d'intégration
 * continue, plus lente. On mesure l'indice de puissance de la machine (benchmarkIndex) et on
 * ajuste le multiplicateur pour simuler toujours le même téléphone de référence.
 * Référence : le réglage validé sur le poste de développement (indice ≈ 2 920, ralentissement 4),
 * soit un téléphone d'indice ≈ 730. Le seuil de 2 secondes reste inchangé.
 */
const INDICE_TELEPHONE_REFERENCE = 730;

function indiceDeLaMachine(): number {
  const dossier = mkdtempSync(join(tmpdir(), "lh-indice-"));
  const sortie = join(dossier, "mesure.json");
  spawnSync(
    "npx",
    ["lighthouse", `${base}/`, "--output=json", `--output-path=${sortie}`, "--quiet", "--only-audits=first-contentful-paint", "--throttling-method=provided", `--extra-headers=${JSON.stringify(enTetes)}`, "--chrome-flags=--headless=new --no-sandbox"],
    { stdio: "ignore", env: { ...process.env, CHROME_PATH: chrome } },
  );
  const indice = existsSync(sortie) ? Number(JSON.parse(readFileSync(sortie, "utf8")).environment?.benchmarkIndex) : NaN;
  rmSync(dossier, { recursive: true, force: true });
  return indice;
}

const indice = indiceDeLaMachine();
const multiplicateur = Number.isFinite(indice) && indice > 0 ? Math.max(1, Math.round((indice / INDICE_TELEPHONE_REFERENCE) * 10) / 10) : 4;
console.log(`Indice de puissance de la machine : ${Number.isFinite(indice) ? Math.round(indice) : "inconnu"} → ralentissement du processeur ×${multiplicateur}`);

rmSync(".lighthouseci", { recursive: true, force: true });
const resultat = spawnSync(
  "npx",
  [
    "lhci",
    "autorun",
    "--config=tests/lighthouse/lighthouserc.json",
    ...PAGES.map((p) => `--collect.url=${base}${p}`),
    `--collect.chromePath=${chrome}`,
    `--collect.settings.extraHeaders=${JSON.stringify(enTetes)}`,
    `--collect.settings.throttling.cpuSlowdownMultiplier=${multiplicateur}`,
  ],
  { stdio: "inherit" },
);

// Résumé lisible (et annotations sur la page GitHub, visibles sans se connecter).
const lignes = new Map<string, { lcp: number[]; cls: number[]; tbt: number[] }>();
for (const f of existsSync(".lighthouseci") ? readdirSync(".lighthouseci").filter((n) => n.startsWith("lhr-") && n.endsWith(".json")) : []) {
  const r = JSON.parse(readFileSync(join(".lighthouseci", f), "utf8"));
  const page = new URL(r.finalDisplayedUrl ?? r.requestedUrl).pathname;
  const l = lignes.get(page) ?? { lcp: [], cls: [], tbt: [] };
  l.lcp.push(r.audits["largest-contentful-paint"].numericValue);
  l.cls.push(r.audits["cumulative-layout-shift"].numericValue);
  l.tbt.push(r.audits["total-blocking-time"].numericValue);
  lignes.set(page, l);
}
const mediane = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)] ?? NaN;
for (const [page, l] of lignes) {
  const texte = `${page} : affichage principal ${(mediane(l.lcp) / 1000).toFixed(2)} s (seuil 2 s), décalage ${mediane(l.cls).toFixed(3)} (seuil 0,1), blocage ${Math.round(mediane(l.tbt))} ms — ralentissement ×${multiplicateur}`;
  console.log(texte);
  if (process.env.GITHUB_ACTIONS) console.log(`::notice title=Lighthouse ${page}::${texte}`);
}
process.exit(resultat.status ?? 1);
