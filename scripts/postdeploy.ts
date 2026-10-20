import { execFileSync } from "node:child_process";
import nextEnv from "@next/env";

// Étape « postdeploy » de Scalingo (Procfile) : exécutée à chaque déploiement, après le démarrage
// des nouveaux conteneurs et avant qu'ils reçoivent du trafic. Un échec annule le déploiement
// (l'ancienne version continue de tourner).
// 1. Migrations des deux bases (site, démonstration).
// 2. Site de démonstration : jeu de départ créé au PREMIER déploiement seulement (base vide).
// Rien de secret n'est jamais écrit dans les journaux (mots de passe, clé de double authentification).

nextEnv.loadEnvConfig(process.cwd(), false);

function migrer(base: "site" | "demo") {
  console.log(`→ Migrations de la base ${base}`);
  execFileSync("npx", ["prisma", "migrate", "deploy", "--config", `prisma/${base}/prisma.config.ts`], { stdio: "inherit" });
}

async function principal() {
  migrer("site");
  const demonstration = process.env.SITE_MODE === "demo";
  if (!demonstration) {
    console.log("✓ Site réel : la base de démonstration n'est pas utilisée.");
    return;
  }
  migrer("demo");
  const manquantes = ["DEMO_SITE_PASSWORD", "DEMO_ACCOUNTS_PASSWORD", "DEMO_TOTP_SECRET", "AUTH_SECRET"].filter((v) => !process.env[v]?.trim());
  if (manquantes.length) {
    // Sans ces variables, des secrets seraient générés au hasard et perdus : on s'arrête.
    throw new Error(`Variables d'environnement manquantes : ${manquantes.join(", ")}. Renseignez-les dans Scalingo (onglet Environment).`);
  }
  const { dbDemo } = await import("@/lib/db/demo");
  const { dbSite } = await import("@/lib/db/site");
  if ((await dbDemo().partenaire.count()) > 0) {
    console.log("✓ Base de démonstration déjà remplie : rien à faire.");
    return;
  }
  const { verifierModeDemonstration } = await import("@/lib/demo/garde");
  verifierModeDemonstration("remplissage");
  const { remplirJeuDeDepart } = await import("../prisma/demo/seed/remplissage");
  const bilan = await remplirJeuDeDepart(dbDemo(), dbSite());
  await dbSite().journalAction.create({ data: { auteur: "déploiement Scalingo (premier déploiement)", action: "demo.remplissage", detail: { dureeMs: bilan.dureeMs } } });
  console.log(`✓ Base de démonstration remplie (${Math.round(bilan.dureeMs / 1000)} s). Identifiants : ceux renseignés dans les variables d'environnement.`);
}

principal()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(`✖ ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
