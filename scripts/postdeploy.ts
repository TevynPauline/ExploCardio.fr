import { execFileSync } from "node:child_process";
import nextEnv from "@next/env";

// Préparation des bases, exécutée deux fois à chaque déploiement Scalingo, sans effet la seconde :
// - avant `next build` (script « build ») : des pages sont pré-rendues pendant la construction et
//   lisent les bases ; elles doivent donc exister et, en démonstration, être remplies ;
// - à l'étape « postdeploy » (Procfile), avant que les nouveaux conteneurs reçoivent du trafic.
// Un échec arrête le déploiement (l'ancienne version continue de tourner).
// 1. Migrations des deux bases (site, démonstration).
// 2. Site de démonstration : jeu de départ créé au PREMIER déploiement seulement (base vide).
// 3. À chaque déploiement : contenus de départ manquants ajoutés (nouveaux types de contenus d'un
//    module, par exemple les vignettes du carrousel de F16), sans rien modifier de l'existant.
// Rien de secret n'est jamais écrit dans les journaux (mots de passe, clé de double authentification).

nextEnv.loadEnvConfig(process.cwd(), false);

function migrer(base: "site" | "demo") {
  const variable = base === "site" ? "DATABASE_URL" : "DEMO_DATABASE_URL";
  if (!process.env[variable]?.trim()) throw new Error(`${variable} est absente : renseignez-la dans Scalingo (onglet Environment).`);
  console.log(`→ Migrations de la base ${base}`);
  try {
    execFileSync("npx", ["prisma", "migrate", "deploy", "--config", `prisma/${base}/prisma.config.ts`], { stdio: "inherit" });
  } catch {
    throw new Error(`Migrations de la base ${base} impossibles : vérifiez ${variable} et que la base est joignable (voir le message de Prisma ci-dessus).`);
  }
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
    const { remplirContenusInitiaux } = await import("../prisma/site/seed/contenus-initiaux");
    await remplirContenusInitiaux(dbSite());
    console.log("✓ Base de démonstration déjà remplie ; contenus de départ manquants ajoutés.");
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
