import { compteConnecte } from "@/domaine/comptes/session";
import { ActionLocationRefusee, etiquette } from "@/domaine/location/gestion";

// Étiquette de retour préaffranchie (F05, FR-023), réservée au titulaire ; peut être redemandée.
export async function GET(_requete: Request, { params }: { params: Promise<{ ref: string }> }) {
  const compte = await compteConnecte();
  if (!compte) return new Response("Connexion requise.", { status: 401 });
  const { ref } = await params;
  try {
    const pdf = await etiquette(compte.id, decodeURIComponent(ref));
    return new Response(Buffer.from(pdf), {
      headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="etiquette-retour-${ref}.pdf"`, "cache-control": "private, no-store" },
    });
  } catch (e) {
    if (e instanceof ActionLocationRefusee) return new Response(e.message, { status: 404 });
    throw e;
  }
}
