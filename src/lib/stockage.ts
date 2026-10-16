import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import DOMPurify from "isomorphic-dompurify";

// Fichiers téléversés dans le back-office (F01, T009, R8) : images d'actualités et logos de
// marques. Stockés hors du code, dans STORAGE_DIR (sauvegardé chez l'hébergeur).

export const TAILLE_MAX = 2 * 1024 * 1024;

export const TYPES_AUTORISES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

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
export async function deposerImage(fichier: File, dossier: "actualites" | "marques"): Promise<string> {
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

const TYPES_PAR_EXTENSION: Record<string, string> = Object.fromEntries(
  Object.entries(TYPES_AUTORISES).map(([type, ext]) => [ext, type]),
);

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
