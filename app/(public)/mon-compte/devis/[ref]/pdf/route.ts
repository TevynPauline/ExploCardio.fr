import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { dbSite } from "@/lib/db/site";
import { pdfDevis } from "@/domaine/commande/devis-client";

// PDF d'un devis (F16, FR-019, FR-022) : lu dans Odoo, servi à son seul titulaire.
export async function GET(_requete: Request, { params }: { params: Promise<{ ref: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Connexion requise.", { status: 401 });
  const compte = await dbSite().compteClient.findUnique({ where: { utilisateurId: session.user.id }, select: { id: true } });
  const ref = decodeURIComponent((await params).ref);
  const pdf = compte ? await pdfDevis(compte.id, ref) : null;
  if (!pdf) return new Response("Document introuvable.", { status: 404 });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="devis-${ref.replace(/[^A-Za-z0-9-]/g, "-")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
