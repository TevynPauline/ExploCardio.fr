import { OperationRefusee, ServiceUnavailable } from "@/connecteurs/erreurs";
import { lireFichier } from "@/lib/stockage";

// Sert les images et documents téléversés (F01, T009 ; F03) avec des en-têtes qui interdisent
// tout script (S1). F26 : le contenu vient du connecteur « stockage » (base en démonstration,
// compartiment Scaleway privé en réel), lu en flux ; les adresses et les en-têtes ne changent pas.
export async function GET(requete: Request, { params }: { params: Promise<{ chemin: string[] }> }) {
  const { chemin } = await params;
  // Comme avant F26, seules les vidéos sont servies par morceaux.
  const range = chemin.at(-1)?.toLowerCase().endsWith(".mp4") ? requete.headers.get("range") : null;
  let fichier;
  try {
    fichier = await lireFichier(chemin, range);
  } catch (e) {
    // F09 : morceau de vidéo hors des limites du fichier.
    if (e instanceof OperationRefusee) {
      const taille = Number(e.details?.taille);
      return new Response(null, { status: 416, headers: Number.isFinite(taille) ? { "Content-Range": `bytes */${taille}` } : {} });
    }
    // F26 (FR-014) : stockage injoignable ; la page qui affiche l'image n'est pas bloquée.
    if (e instanceof ServiceUnavailable) return new Response("Indisponible", { status: 503, headers: { "Retry-After": "60" } });
    throw e;
  }
  if (!fichier) return new Response("Introuvable", { status: 404 });
  const entetes: Record<string, string> = {
    "Content-Type": fichier.type,
    "Cache-Control": "public, max-age=604800, immutable",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    "X-Content-Type-Options": "nosniff",
  };
  // Un SVG ouvert directement est servi en pièce jointe ; affiché dans une page par <img>, il
  // ne peut de toute façon exécuter aucun script.
  if (fichier.type === "image/svg+xml") entetes["Content-Disposition"] = "attachment";
  // PDF : affiché par la visionneuse du navigateur, qui refuse une page en bac à sable.
  if (fichier.type === "application/pdf") entetes["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'";
  // F09 : vidéos du centre d'aide lues par morceaux (requêtes partielles, indispensables à Safari).
  if (fichier.type === "video/mp4") entetes["Accept-Ranges"] = "bytes";
  if (fichier.plage) {
    entetes["Content-Range"] = `bytes ${fichier.plage.debut}-${fichier.plage.fin}/${fichier.taille}`;
    entetes["Content-Length"] = String(fichier.plage.fin - fichier.plage.debut + 1);
    return new Response(fichier.corps, { status: 206, headers: entetes });
  }
  entetes["Content-Length"] = String(fichier.taille);
  return new Response(fichier.corps, { headers: entetes });
}
