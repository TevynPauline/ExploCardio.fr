import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ACCES, cookieValide } from "@/lib/demo/acces";
import { COOKIE_ACTIVITE, COOKIES_SESSION, delaiInactivite, derniereActivite, estInactive, valeurActivite } from "@/lib/inactivite";

// Site de démonstration (US8, FR-034, FR-035) : aucune page n'est accessible sans le mot de
// passe de démonstration, et aucune réponse n'est indexable.
// Restent accessibles sans mot de passe : la page d'accès, le gestionnaire des événements de
// paiement (protégé par sa signature), les logos servis aux emails, robots.txt et les polices.

const LIBRES = [/^\/demo\/acces$/, /^\/api\/evenements\/paiement$/, /^\/marque\//, /^\/robots\.txt$/, /^\/fonts\//];

/**
 * Back-office (F13, D5) : une session de l'équipe inactive au-delà du délai est fermée ; sinon
 * l'heure d'activité est renouvelée.
 */
async function activiteEquipe(requete: NextRequest, reponse: NextResponse): Promise<NextResponse> {
  const { pathname, search } = requete.nextUrl;
  if (!pathname.startsWith("/admin")) return reponse;
  const session = COOKIES_SESSION.map((n) => requete.cookies.get(n)?.value).find(Boolean);
  if (!session) return reponse;
  const maintenant = Date.now();
  if (estInactive(derniereActivite(requete.cookies.get(COOKIE_ACTIVITE)?.value, session), maintenant, await delaiInactivite())) {
    const fin = new URL("/api/inactivite", requete.url);
    fin.searchParams.set("retour", `${pathname}${search}`);
    const redirection = NextResponse.redirect(fin);
    redirection.headers.set("X-Robots-Tag", "noindex, nofollow");
    return redirection;
  }
  reponse.cookies.set(COOKIE_ACTIVITE, valeurActivite(session, maintenant), { httpOnly: true, sameSite: "lax", secure: requete.nextUrl.protocol === "https:", path: "/", maxAge: 12 * 3600 });
  return reponse;
}

export async function proxy(requete: NextRequest) {
  if (process.env.SITE_MODE === "prod") return activiteEquipe(requete, NextResponse.next());

  const { pathname, search } = requete.nextUrl;
  let reponse: NextResponse;
  if (LIBRES.some((r) => r.test(pathname)) || (await cookieValide(requete.cookies.get(COOKIE_ACCES)?.value))) {
    reponse = NextResponse.next();
  } else if (pathname.startsWith("/api/")) {
    reponse = NextResponse.json({ erreur: "Accès au site de démonstration requis." }, { status: 401 });
  } else {
    const acces = new URL("/demo/acces", requete.url);
    acces.searchParams.set("retour", `${pathname}${search}`);
    reponse = NextResponse.redirect(acces);
  }
  reponse.headers.set("X-Robots-Tag", "noindex, nofollow");
  return reponse.status === 200 ? activiteEquipe(requete, reponse) : reponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
