import { cookies, draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { COOKIE_APERCU_ONGLET } from "@/lib/apercu";
import { exigerDroit } from "@/lib/droits";

// Active ou quitte l'aperçu des contenus en préparation (F13, D7) : équipe ayant le droit de voir
// les contenus. Redirige vers une page du site (chemin interne uniquement). `onglet=1` : aperçu
// demandé dans un onglet entier (« Ouvrir dans un onglet »), et pas seulement dans les cadres.
export async function GET(requete: NextRequest) {
  const p = requete.nextUrl.searchParams;
  const vers = p.get("vers") ?? "/";
  const chemin = vers.startsWith("/") && !vers.startsWith("//") ? vers : "/";
  if (p.get("quitter") === "1") {
    (await draftMode()).disable();
    (await cookies()).delete(COOKIE_APERCU_ONGLET);
    redirect(chemin);
  }
  await exigerDroit("contenus", "voir");
  (await draftMode()).enable();
  if (p.get("onglet") === "1") (await cookies()).set(COOKIE_APERCU_ONGLET, "1", { httpOnly: true, sameSite: "lax", secure: requete.nextUrl.protocol === "https:", path: "/" });
  redirect(chemin);
}
