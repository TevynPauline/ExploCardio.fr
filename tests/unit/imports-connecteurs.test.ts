import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// T054 (principe III, FR-003, SC-005) : aucune page ni aucun composant n'importe une
// implémentation de connecteur ni un SDK de service externe.

describe("imports des pages et composants", () => {
  const eslint = new ESLint();

  it("aucun fichier de app/ ni de src/ui/ n'importe un connecteur ou un SDK externe", async () => {
    const resultats = await eslint.lintFiles(["app/**/*.{ts,tsx}", "src/ui/**/*.{ts,tsx}"]);
    const fautes = resultats.flatMap((r) =>
      r.messages.filter((m) => m.ruleId === "no-restricted-imports").map((m) => `${r.filePath}:${m.line} ${m.message}`),
    );
    expect(fautes).toEqual([]);
  }, 60_000);

  it.each([
    'import { catalogueDemo } from "@/connecteurs/odoo/demo/catalogue";',
    'import { creerStripeReel } from "@/connecteurs/stripe/real";',
    'import Stripe from "stripe";',
    'import { TransactionalEmailsApi } from "@getbrevo/brevo";',
  ])("la règle refuse : %s", async (code) => {
    const [resultat] = await eslint.lintText(code, { filePath: "app/essai/page.tsx" });
    expect(resultat!.messages.some((m) => m.ruleId === "no-restricted-imports")).toBe(true);
  });

  it("la règle accepte le registre et les interfaces", async () => {
    const [resultat] = await eslint.lintText(
      'import { registre } from "@/connecteurs/registre";\nimport type { Article } from "@/connecteurs/odoo/interfaces";\nexport const a = registre;\nexport type B = Article;\n',
      { filePath: "app/essai/page.tsx" },
    );
    expect(resultat!.messages.filter((m) => m.ruleId === "no-restricted-imports")).toEqual([]);
  });
});

// F10 (FR-002, R1) : seul le point d'envoi unique appelle le connecteur emailing.
describe("connecteur emailing", () => {
  it("registre.emailing() n'est appelé que dans src/domaine/emailing/", async () => {
    const { readdir, readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const fautes: string[] = [];
    async function parcourir(dossier: string) {
      for (const e of await readdir(dossier, { withFileTypes: true })) {
        const chemin = join(dossier, e.name);
        if (e.isDirectory()) await parcourir(chemin);
        else if (/\.tsx?$/.test(e.name) && !chemin.startsWith(join("src", "domaine", "emailing")) && !chemin.startsWith(join("src", "connecteurs"))) {
          if ((await readFile(chemin, "utf8")).includes("registre.emailing()")) fautes.push(chemin);
        }
      }
    }
    await parcourir("src");
    await parcourir("app");
    expect(fautes).toEqual([]);
  });
});
