import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Sert les fichiers du logo officiel directement depuis docs/brand/assets (principe VII),
// notamment pour les emails, qui n'affichent pas le SVG.

const AUTORISES: Record<string, string> = {
  "explocardio-fr-logo.png": "image/png",
  "explocardio-fr-logo-blanc.png": "image/png",
  "explocardio-fr-symbole.png": "image/png",
  "explocardio-fr-logo.svg": "image/svg+xml",
  "explocardio-fr-logo-horizontal.svg": "image/svg+xml",
  "explocardio-fr-symbole.svg": "image/svg+xml",
};

export async function GET(_requete: Request, { params }: { params: Promise<{ fichier: string }> }) {
  const { fichier } = await params;
  const type = AUTORISES[fichier];
  if (!type) return new Response("Introuvable", { status: 404 });
  const contenu = await readFile(join(process.cwd(), "docs/brand/assets", fichier));
  return new Response(new Uint8Array(contenu), {
    headers: { "Content-Type": type, "Cache-Control": "public, max-age=86400" },
  });
}
