import { readFile } from "node:fs/promises";
import { join } from "node:path";
import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";

// Textes des pages de présentation et des pages légales (F01, T010, R9) : fichiers Markdown du
// dossier contenus/, versionnés. F13 les rendra modifiables dans le back-office.

export type Texte = { titre: string; html: string };

/** « ## Aide en ligne {#aide} » devient un titre avec l'identifiant « aide » (ancre). */
function ancres(markdown: string): string {
  return markdown.replace(/^(#{2,6}) (.+?) \{#([a-z0-9-]+)\}$/gm, (_l, niveau: string, titre: string, id: string) => {
    const n = niveau.length;
    return `<h${n} id="${id}">${titre}</h${n}>`;
  });
}

export async function lireTexte(nom: string): Promise<Texte> {
  if (!/^[a-z0-9-]+$/.test(nom)) throw new Error(`Nom de texte invalide : ${nom}`);
  const brut = await readFile(join(process.cwd(), "contenus", `${nom}.md`), "utf8");
  const [premiere, ...reste] = brut.split("\n");
  const titre = (premiere ?? "").replace(/^#\s+/, "").trim();
  const html = DOMPurify.sanitize(await marked.parse(ancres(reste.join("\n"))));
  return { titre, html };
}
