import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { dbSite } from "@/lib/db/site";
import { pdfDuCompte } from "@/domaine/commande/mon-compte";

// PDF d'une facture ou d'un avoir (F04, FR-028) : lu dans Odoo, servi à son seul titulaire.
export async function GET(_requete: Request, { params }: { params: Promise<{ numero: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Connexion requise.", { status: 401 });
  const compte = await dbSite().compteClient.findUnique({ where: { utilisateurId: session.user.id }, select: { id: true } });
  const numero = decodeURIComponent((await params).numero);
  const pdf = compte ? await pdfDuCompte(compte.id, numero) : null;
  if (!pdf) return new Response("Document introuvable.", { status: 404 });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${numero.replace(/[^A-Za-z0-9-]/g, "-")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
