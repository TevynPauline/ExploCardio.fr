import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import DOMPurify from "isomorphic-dompurify";
import { registre } from "@/connecteurs/registre";
import { ConfigurationIncomplete, NotFound, ServiceUnavailable } from "@/connecteurs/erreurs";
import { fluxDe, verifierPlage } from "@/connecteurs/stockage/chemins";
import type { Plage } from "@/connecteurs/stockage/interfaces";
import { modeDuConnecteur } from "./config";
import { dbSite } from "./db/site";

// Fichiers téléversés dans le back-office (F01, T009, R8) : images d'actualités, logos de
// marques, photos et documents PDF des produits (F03), vidéos d'aide (F09). Contrôlés ici, puis
// rangés par le connecteur « stockage » (F26) : base du site en démonstration, compartiment
// Scaleway privé en réel. En lecture, secours : la table fichier_stocke (fichiers pas encore
// repris, mode réel), puis l'ancien dossier STORAGE_DIR.

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

/** F26 (FR-014) : messages du back-office quand le stockage ne répond pas ou n'est pas configuré. */
export const MESSAGE_STOCKAGE_INDISPONIBLE = "Le stockage des fichiers est momentanément indisponible. Réessayez dans quelques minutes.";
export const MESSAGE_STOCKAGE_NON_CONFIGURE = "Le stockage des fichiers n'est pas configuré : prévenez l'administrateur.";

function racine(): string {
  // Dossier choisi à l'exécution : exclu de l'analyse du build (sinon tout le projet est embarqué).
  return resolve(/* turbopackIgnore: true */ process.env.STORAGE_DIR || "./stockage");
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
export async function deposerImage(fichier: File, dossier: "actualites" | "vignettes" | "marques" | "produits" | "aide"): Promise<string> {
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
  return ecrire(dossier, TYPES_AUTORISES[type]!, octets);
}

/** Enregistre un document PDF (type réel vérifié) et renvoie son chemin public et sa taille. */
export async function deposerDocument(fichier: File): Promise<{ chemin: string; octets: number }> {
  if (fichier.size === 0) throw new FichierRefuse("Le fichier est vide.");
  if (fichier.size > TAILLE_MAX_DOCUMENT) throw new FichierRefuse("Le document dépasse 10 Mo.");
  const octets = Buffer.from(await fichier.arrayBuffer());
  if (octets.subarray(0, 5).toString("latin1") !== "%PDF-") throw new FichierRefuse("Format refusé : PDF uniquement.");
  return { chemin: await ecrire("documents", ".pdf", octets), octets: octets.length };
}

/** Vidéos du centre d'aide (F09, D4) : MP4 de 50 Mo au plus ; sous-titres WebVTT de 1 Mo au plus. */
export const TAILLE_MAX_VIDEO = 50 * 1024 * 1024;
export const TAILLE_MAX_SOUS_TITRES = 1024 * 1024;

async function ecrire(dossier: string, extension: string, octets: Buffer): Promise<string> {
  const chemin = `/stockage/${dossier}/${randomBytes(12).toString("hex")}${extension}`;
  try {
    await registre.stockage().deposer(chemin, TYPES_PAR_EXTENSION[extension]!, new Uint8Array(octets));
  } catch (e) {
    if (e instanceof ServiceUnavailable) throw new FichierRefuse(MESSAGE_STOCKAGE_INDISPONIBLE);
    if (e instanceof ConfigurationIncomplete) throw new FichierRefuse(MESSAGE_STOCKAGE_NON_CONFIGURE);
    throw e;
  }
  return chemin;
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

export type FichierLu = { type: string; taille: number; plage: Plage | null; corps: ReadableStream<Uint8Array> };

/** Plage demandée par un en-tête « Range: bytes=d-f », « bytes=d- » ou « bytes=-n » ; null sinon. */
export function plageDemandee(entete: string | null, taille: number): Plage | null {
  const m = /^bytes=(\d*)-(\d*)$/.exec(entete ?? "");
  if (!m || (!m[1] && !m[2])) return null;
  const debut = m[1] ? Number(m[1]) : Math.max(0, taille - Number(m[2]));
  const fin = m[1] && m[2] ? Math.min(Number(m[2]), taille - 1) : taille - 1;
  return verifierPlage({ debut, fin }, taille);
}

/**
 * Lit un fichier du stockage, entier ou selon l'en-tête Range ; null s'il n'existe pas ou sort du
 * dossier. Plage impossible → OperationRefusee (416) ; stockage injoignable → ServiceUnavailable.
 */
export async function lireFichier(segments: string[], range: string | null = null): Promise<FichierLu | null> {
  const chemin = `/stockage/${segments.join("/")}`;
  const type = TYPES_PAR_EXTENSION[extname(chemin).toLowerCase()];
  if (!type || segments.some((s) => !s || s === "." || s === "..")) return null;

  // Sans plage : une seule lecture. Avec plage : la taille d'abord, pour interpréter l'en-tête.
  const stockage = registre.stockage();
  const absent = (e: unknown) => {
    if (e instanceof NotFound) return null;
    throw e;
  };
  const present = range ? await stockage.existe(chemin) : { taille: 0 };
  if (present) {
    const plage = range ? (plageDemandee(range, present.taille) ?? undefined) : undefined;
    const lu = await stockage.lire(chemin, plage).catch(absent);
    if (lu) return { type, ...lu };
  }

  // Secours (FR-010) : fichier pas encore repris dans le compartiment, puis ancien dossier local.
  const octets = (modeDuConnecteur("stockage") === "real" ? await enBase(chemin) : null) ?? (await surDisque(segments));
  if (!octets) return null;
  const plage = range ? plageDemandee(range, octets.length) : null;
  return { type, taille: octets.length, plage, corps: fluxDe(plage ? octets.subarray(plage.debut, plage.fin + 1) : octets) };
}

async function enBase(chemin: string): Promise<Uint8Array | null> {
  const f = await dbSite().fichierStocke.findUnique({ where: { chemin } });
  return f ? new Uint8Array(f.octets) : null;
}

async function surDisque(segments: string[]): Promise<Uint8Array | null> {
  const base = racine();
  const chemin = resolve(base, ...segments);
  if (!chemin.startsWith(base + sep)) return null;
  try {
    return new Uint8Array(await readFile(chemin));
  } catch {
    return null;
  }
}
