"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_ACCES, DUREE_ACCES_S, ouvrirAcces } from "@/lib/demo/acces";

function retourSur(retour: string): string {
  // Seulement un chemin interne (pas de redirection vers un autre site).
  return retour.startsWith("/") && !retour.startsWith("//") ? retour : "/";
}

export async function entrer(donnees: FormData) {
  const retour = retourSur(String(donnees.get("retour") ?? "/"));
  const valeur = await ouvrirAcces(String(donnees.get("motDePasse") ?? ""));
  if (!valeur) {
    redirect(`/demo/acces?erreur=1&retour=${encodeURIComponent(retour)}`);
  }
  (await cookies()).set(COOKIE_ACCES, valeur, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DUREE_ACCES_S,
  });
  redirect(retour);
}
