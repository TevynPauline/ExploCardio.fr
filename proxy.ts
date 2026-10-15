import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ACCES, cookieValide } from "@/lib/demo/acces";

// Site de démonstration (US8, FR-034, FR-035) : aucune page n'est accessible sans le mot de
// passe de démonstration, et aucune réponse n'est indexable.
// Restent accessibles sans mot de passe : la page d'accès, le gestionnaire des événements de
// paiement (protégé par sa signature), les logos servis aux emails, robots.txt et les polices.

const LIBRES = [/^\/demo\/acces$/, /^\/api\/evenements\/paiement$/, /^\/marque\//, /^\/robots\.txt$/, /^\/fonts\//];

export async function proxy(requete: NextRequest) {
  if (process.env.SITE_MODE === "prod") return NextResponse.next();

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
  return reponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
