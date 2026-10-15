import { existsSync } from "node:fs";

// Next.js ignore .env.local quand NODE_ENV=test : on le charge explicitement pour que les tests
// utilisent les bases locales. En intégration continue, les variables viennent du workflow.
for (const fichier of [".env.test.local", ".env.local"]) {
  if (existsSync(fichier)) process.loadEnvFile(fichier);
}
