import { dbSite } from "@/lib/db/site";
import type { ContenuAide, ThemeAide, TypeContenuAide } from "@generated/site/client";
import { normaliserTexte } from "../recherche/normaliser";

// Centre d'aide (F09, US3, FR-011 à FR-014) : contenus publiés, filtres par appareil, logiciel et
// thème, recherche, FAQ les plus consultées en tête. Les notices et fiches techniques des produits
// sont reprises de leur fiche (F03), sans second téléversement (A1).

export const THEMES: Record<ThemeAide, string> = {
  prise_en_main: "Prise en main",
  enregistrement: "Enregistrement",
  analyse: "Analyse",
  materiel: "Matériel et consommables",
  logiciels_cloud: "Logiciels Cloud",
  compte: "Compte et commandes",
};

export const TYPES: Record<TypeContenuAide, string> = {
  video: "Tutoriel vidéo",
  mode_emploi: "Mode d’emploi pas à pas",
  notice: "Notice",
  faq: "Question fréquente",
};

export type Etape = { texte: string; image: string | null; texteRemplacement: string };
export type FiltresAide = { theme?: ThemeAide; reference?: string; recherche?: string; type?: TypeContenuAide };

/** Notice ou fiche technique d'un produit (F03), reprise par le centre d'aide. */
export type DocumentProduitAide = { titre: string; chemin: string; type: "notice" | "fiche_technique"; defaultCode: string; ficheSlug: string };

export function etapesDe(c: Pick<ContenuAide, "etapes">): Etape[] {
  return Array.isArray(c.etapes) ? (c.etapes as Etape[]) : [];
}

function correspond(c: ContenuAide, f: FiltresAide): boolean {
  if (f.theme && c.theme !== f.theme) return false;
  if (f.type && c.type !== f.type) return false;
  if (f.reference && !c.references.includes(f.reference)) return false;
  if (f.recherche) {
    const mots = normaliserTexte(f.recherche).split(/\s+/).filter((m) => m.length > 1);
    const texte = normaliserTexte([c.titre, c.resume, c.reponse, c.transcription, ...etapesDe(c).map((e) => e.texte)].filter(Boolean).join(" "));
    if (mots.length && !mots.every((m) => texte.includes(m))) return false;
  }
  return true;
}

export async function contenusPublies(f: FiltresAide = {}): Promise<ContenuAide[]> {
  const tous = await dbSite().contenuAide.findMany({ where: { etat: "publie" }, orderBy: [{ ordre: "asc" }, { titre: "asc" }] });
  return tous.filter((c) => correspond(c, f));
}

export async function contenuPublie(slug: string): Promise<ContenuAide | null> {
  return dbSite().contenuAide.findFirst({ where: { slug, etat: "publie" } });
}

/** FAQ : les questions les plus consultées en tête (D5), puis l'ordre éditorial. */
export function trierFaq(questions: ContenuAide[]): ContenuAide[] {
  return [...questions].sort((a, b) => b.consultations - a.consultations || a.ordre - b.ordre);
}

/** Notices et fiches techniques des produits publiés (F03), avec la référence de l'article. */
export async function documentsProduits(reference?: string): Promise<DocumentProduitAide[]> {
  const produits = await dbSite().contenuProduit.findMany({ where: { etat: "publie", ...(reference ? { defaultCode: reference } : {}) }, orderBy: { slug: "asc" } });
  return produits.flatMap((p) =>
    ((p.documents ?? []) as { chemin: string; titre: string; type: "notice" | "fiche_technique" }[]).map((d) => ({ titre: d.titre, chemin: d.chemin, type: d.type, defaultCode: p.defaultCode, ficheSlug: p.slug })),
  );
}

/** Aide d'un modèle, pour sa fiche produit (US3-5). */
export async function aideDe(references: string[]): Promise<ContenuAide[]> {
  const tous = await dbSite().contenuAide.findMany({ where: { etat: "publie", references: { hasSome: references } }, orderBy: [{ type: "asc" }, { ordre: "asc" }] });
  return tous;
}

/** Compteur anonyme d'ouverture d'une question de FAQ (D5) ; aucune donnée personnelle. */
export async function compterConsultation(slug: string): Promise<boolean> {
  const r = await dbSite().contenuAide.updateMany({ where: { slug, etat: "publie", type: "faq" }, data: { consultations: { increment: 1 } } });
  return r.count === 1;
}

/** Réponse de FAQ en HTML sûr (sous-ensemble Markdown, comme les textes de F01). */
export async function reponseHtml(reponse: string | null): Promise<string> {
  if (!reponse) return "";
  const [{ marked }, { default: DOMPurify }] = await Promise.all([import("marked"), import("isomorphic-dompurify")]);
  return DOMPurify.sanitize(await marked.parse(reponse));
}
