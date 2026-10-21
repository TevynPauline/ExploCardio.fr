import { readFile } from "node:fs/promises";
import { join } from "node:path";
import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";
import { enApercu } from "@/lib/apercu";
import { dbSite } from "@/lib/db/site";

// Textes des pages de présentation et des pages légales (F01, T010, R9) : fichiers Markdown du
// dossier contenus/, versionnés ; F13 (D8) : modifiables au back-office, le fichier restant la
// version d'origine.

export type Texte = { titre: string; html: string };

/** « ## Aide en ligne {#aide} » devient un titre avec l'identifiant « aide » (ancre). */
function ancres(markdown: string): string {
  return markdown.replace(/^(#{2,6}) (.+?) \{#([a-z0-9-]+)\}$/gm, (_l, niveau: string, titre: string, id: string) => {
    const n = niveau.length;
    return `<h${n} id="${id}">${titre}</h${n}>`;
  });
}

/** Texte d'origine : le fichier versionné `contenus/<nom>.md` (F01). */
export async function texteOrigine(nom: string): Promise<string> {
  if (!/^[a-z0-9-]+$/.test(nom)) throw new Error(`Nom de texte invalide : ${nom}`);
  return readFile(join(process.cwd(), "contenus", `${nom}.md`), "utf8");
}

/** Markdown en vigueur : le texte publié au back-office (F13, D8), sinon le fichier d'origine ; en aperçu, le brouillon. */
async function markdownEnVigueur(nom: string): Promise<string> {
  const page = await dbSite().contenu.findUnique({ where: { type_cle: { type: "page", cle: nom } } }).catch(() => null);
  if (page && (await enApercu()) && page.brouillon) return page.brouillon;
  if (page?.etat === "publie" && page.corps) return page.corps;
  return texteOrigine(nom);
}

export function rendreMarkdown(brut: string): Promise<Texte> {
  return rendre(brut);
}

export async function lireTexte(nom: string): Promise<Texte> {
  if (!/^[a-z0-9-]+$/.test(nom)) throw new Error(`Nom de texte invalide : ${nom}`);
  return rendre(await markdownEnVigueur(nom));
}

async function rendre(brut: string): Promise<Texte> {
  const [premiere, ...reste] = brut.split("\n");
  const titre = (premiere ?? "").replace(/^#\s+/, "").trim();
  const html = DOMPurify.sanitize(await marked.parse(ancres(reste.join("\n"))));
  return { titre, html };
}
