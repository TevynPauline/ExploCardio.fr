import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import DOMPurify from "isomorphic-dompurify";

// Fichiers téléversés dans le back-office (F01, T009, R8) : images d'actualités, logos de
// marques, photos et documents PDF des produits (F03). Stockés hors du code, dans STORAGE_DIR
// (sauvegardé chez l'hébergeur).

export const TAILLE_MAX = 2 * 1024 * 1024;

export const TYPES_AUTORISES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

/** Documents des produits (notices, fiches techniques) : PDF de 10 Mo au plus (F03, D4). */
export const TAILLE_MAX_DOCUMENT = 10 * 1024 * 1024;

export class FichierRefuse extends Error {}

function racine(): string {
  return resolve(process.env.STORAGE_DIR || "./stockage");
}

/** Vérifie la signature du fichier : le type annoncé par le navigateur ne suffit pas. */
function typeReel(octets: Buffer): string | null {
  if (octets.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (octets[0] === 0xff && octets[1] === 0xd8 && octets[2] === 0xff) return "image/jpeg";
  if (octets.subarray(0, 4).toString() === "RIFF" && octets.subarray(8, 12).toString() === "WEBP") return "image/webp";
  const debut = octets.subarray(0, 512).toString("utf8").trimStart();
  if (debut.startsWith("<svg") || (debut.startsWith("<?xml") && debut.includes("<svg"))) return "image/svg+xml";
  return null;
}

/** Enregistre une image et renvoie son chemin public (« /stockage/images/… »). */
export async function deposerImage(fichier: File, dossier: "actualites" | "marques" | "produits" | "aide"): Promise<string> {
  if (fichier.size === 0) throw new FichierRefuse("Le fichier est vide.");
  if (fichier.size > TAILLE_MAX) throw new FichierRefuse("Le fichier dépasse 2 Mo.");
  let octets: Buffer = Buffer.from(await fichier.arrayBuffer());
  const type = typeReel(octets);
  if (!type) throw new FichierRefuse("Format refusé : PNG, JPEG, WebP ou SVG uniquement.");
  if (type === "image/svg+xml") {
    // Retire scripts, gestionnaires d'événements et liens externes (R8, S1).
    const propre = DOMPurify.sanitize(octets.toString("utf8"), {
      USE_PROFILES: { svg: true, svgFilters: true },
      FORBID_TAGS: ["script", "foreignObject", "use"],
    });
    if (!propre.includes("<svg")) throw new FichierRefuse("Ce fichier SVG n'est pas valide.");
    octets = Buffer.from(propre, "utf8");
  }
  const nom = `${randomBytes(12).toString("hex")}${TYPES_AUTORISES[type]}`;
  const repertoire = join(racine(), dossier);
  await mkdir(repertoire, { recursive: true });
  await writeFile(join(repertoire, nom), octets);
  return `/stockage/${dossier}/${nom}`;
}

/** Enregistre un document PDF (type réel vérifié) et renvoie son chemin public et sa taille. */
export async function deposerDocument(fichier: File): Promise<{ chemin: string; octets: number }> {
  if (fichier.size === 0) throw new FichierRefuse("Le fichier est vide.");
  if (fichier.size > TAILLE_MAX_DOCUMENT) throw new FichierRefuse("Le document dépasse 10 Mo.");
  const octets = Buffer.from(await fichier.arrayBuffer());
  if (octets.subarray(0, 5).toString("latin1") !== "%PDF-") throw new FichierRefuse("Format refusé : PDF uniquement.");
  const nom = `${randomBytes(12).toString("hex")}.pdf`;
  const repertoire = join(racine(), "documents");
  await mkdir(repertoire, { recursive: true });
  await writeFile(join(repertoire, nom), octets);
  return { chemin: `/stockage/documents/${nom}`, octets: octets.length };
}

/** Vidéos du centre d'aide (F09, D4) : MP4 de 50 Mo au plus ; sous-titres WebVTT de 1 Mo au plus. */
export const TAILLE_MAX_VIDEO = 50 * 1024 * 1024;
export const TAILLE_MAX_SOUS_TITRES = 1024 * 1024;

async function ecrire(dossier: string, extension: string, octets: Buffer): Promise<string> {
  const nom = `${randomBytes(12).toString("hex")}${extension}`;
  const repertoire = join(racine(), dossier);
  await mkdir(repertoire, { recursive: true });
  await writeFile(join(repertoire, nom), octets);
  return `/stockage/${dossier}/${nom}`;
}

/** Vidéo MP4 (signature « ftyp » vérifiée) ; renvoie son chemin public. */
export async function deposerVideo(fichier: File): Promise<string> {
  if (fichier.size === 0) throw new FichierRefuse("Le fichier est vide.");
  if (fichier.size > TAILLE_MAX_VIDEO) throw new FichierRefuse("La vidéo dépasse 50 Mo : compressez-la avant de la téléverser.");
  const octets = Buffer.from(await fichier.arrayBuffer());
  if (octets.subarray(4, 8).toString("latin1") !== "ftyp") throw new FichierRefuse("Format refusé : vidéo MP4 uniquement.");
  return ecrire("videos", ".mp4", octets);
}

/** Sous-titres WebVTT (commençant par « WEBVTT ») ; renvoie leur chemin public. */
export async function deposerSousTitres(fichier: File): Promise<string> {
  if (fichier.size === 0) throw new FichierRefuse("Le fichier est vide.");
  if (fichier.size > TAILLE_MAX_SOUS_TITRES) throw new FichierRefuse("Les sous-titres dépassent 1 Mo.");
  const texte = Buffer.from(await fichier.arrayBuffer()).toString("utf8").replace(/^\uFEFF/, "");
  if (!texte.startsWith("WEBVTT")) throw new FichierRefuse("Format refusé : sous-titres WebVTT (.vtt) uniquement.");
  return ecrire("videos", ".vtt", Buffer.from(texte, "utf8"));
}

const TYPES_PAR_EXTENSION: Record<string, string> = {
  ...Object.fromEntries(Object.entries(TYPES_AUTORISES).map(([type, ext]) => [ext, type])),
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".vtt": "text/vtt",
};

/** Lit un fichier du stockage ; null s'il n'existe pas ou sort du dossier. */
export async function lireFichier(segments: string[]): Promise<{ octets: Buffer; type: string } | null> {
  const base = racine();
  const chemin = resolve(base, ...segments);
  if (!chemin.startsWith(base + sep)) return null;
  const type = TYPES_PAR_EXTENSION[extname(chemin).toLowerCase()];
  if (!type) return null;
  try {
    return { octets: await readFile(chemin), type };
  } catch {
    return null;
  }
}
