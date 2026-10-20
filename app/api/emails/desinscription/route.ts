import { NextResponse, type NextRequest } from "next/server";
import { executerDesinscription } from "@/domaine/emailing/desinscription";

// Désinscription en un clic (F10, D8, RFC 8058) : appelée par la messagerie du destinataire
// grâce à l'en-tête List-Unsubscribe-Post, sans connexion. Le jeton signé désigne l'adresse.

export async function POST(requete: NextRequest) {
  const { searchParams } = requete.nextUrl;
  const ok = await executerDesinscription(searchParams.get("j") ?? "", searchParams.get("objet") ?? "newsletter", "desinscription_un_clic");
  if (!ok) return new NextResponse("Lien invalide.", { status: 400 });
  return new NextResponse("Désinscription enregistrée.", { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
}
