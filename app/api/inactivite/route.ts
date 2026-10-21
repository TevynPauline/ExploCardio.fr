import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { COOKIE_ACTIVITE } from "@/lib/inactivite";

// Session de l'équipe fermée après inactivité (F13, D5) : la session est supprimée, puis retour
// à la page de connexion avec l'explication.
export async function GET(requete: NextRequest) {
  const retour = requete.nextUrl.searchParams.get("retour") ?? "/admin";
  const sortie = await auth.api.signOut({ headers: requete.headers, asResponse: true }).catch(() => null);
  const connexion = new URL("/connexion", requete.url);
  connexion.searchParams.set("raison", "inactivite");
  if (retour.startsWith("/admin")) connexion.searchParams.set("retour", retour);
  const reponse = NextResponse.redirect(connexion);
  for (const c of sortie?.headers.getSetCookie() ?? []) reponse.headers.append("Set-Cookie", c);
  reponse.cookies.delete(COOKIE_ACTIVITE);
  return reponse;
}
