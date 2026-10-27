import { lireFichier } from "@/lib/stockage";

// Sert les images et documents téléversés (F01, T009 ; F03) avec des en-têtes qui interdisent
// tout script (S1).
export async function GET(requete: Request, { params }: { params: Promise<{ chemin: string[] }> }) {
  const { chemin } = await params;
  const fichier = await lireFichier(chemin);
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
  if (fichier.type === "video/mp4") {
    entetes["Accept-Ranges"] = "bytes";
    const plage = /^bytes=(\d*)-(\d*)$/.exec(requete.headers.get("range") ?? "");
    if (plage && (plage[1] || plage[2])) {
      const taille = fichier.octets.length;
      const debut = plage[1] ? Number(plage[1]) : Math.max(0, taille - Number(plage[2]));
      const fin = plage[1] && plage[2] ? Math.min(Number(plage[2]), taille - 1) : taille - 1;
      if (debut >= taille || debut > fin) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${taille}` } });
      entetes["Content-Range"] = `bytes ${debut}-${fin}/${taille}`;
      return new Response(new Uint8Array(fichier.octets.subarray(debut, fin + 1)), { status: 206, headers: entetes });
    }
  }
  return new Response(new Uint8Array(fichier.octets), { headers: entetes });
}
