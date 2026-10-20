import { NextResponse, type NextRequest } from "next/server";
import { ajouterAuPanier } from "@/domaine/catalogue/panier";
import { compteConnecte } from "@/domaine/comptes/session";

// « Commander de nouveau » depuis une relance de réapprovisionnement (F10, US2, FR-017) : ajoute
// l'article au panier du client connecté (même quantité), puis affiche le panier. Sans session :
// connexion d'abord, avec retour ici.

export async function GET(requete: NextRequest) {
  const { searchParams } = requete.nextUrl;
  const ref = (searchParams.get("ref") ?? "").slice(0, 64);
  const quantite = Number.parseInt(searchParams.get("quantite") ?? "1", 10);
  const ici = `${requete.nextUrl.pathname}?${searchParams.toString()}`;
  const compte = await compteConnecte();
  if (!compte) return NextResponse.redirect(new URL(`/connexion?retour=${encodeURIComponent(ici)}`, requete.url));
  if (!ref || !Number.isInteger(quantite) || quantite < 1) return NextResponse.redirect(new URL("/panier", requete.url));
  const r = await ajouterAuPanier({ compteId: compte.id }, { defaultCode: ref, formule: "achat", quantite });
  return NextResponse.redirect(new URL(r.ok ? "/panier?ajout=recommande" : "/panier?ajout=impossible", requete.url));
}
