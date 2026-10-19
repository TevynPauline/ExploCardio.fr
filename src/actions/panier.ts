"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { compteConnecte } from "@/domaine/comptes/session";
import {
  ajouterAuPanier,
  appliquerCodePromo,
  COOKIE_PANIER,
  lignesPanier,
  modifierLigne,
  panierPour,
  PURGE_APRES_JOURS,
  supprimerLigne,
  utiliserBons,
  type ResultatAjout,
} from "@/domaine/catalogue/panier";

// Ajout au panier (F03, D1) : client connecté → panier du compte ; visiteur → panier lié à un
// cookie nécessaire au service (sans consentement, déclaré dans la page Cookies).

export async function actionAjouterAuPanier(saisie: {
  defaultCode: string;
  formule: "achat" | "mise_a_disposition";
  quantite: number;
  prixAffiche?: number;
}): Promise<ResultatAjout> {
  const formule = saisie.formule === "mise_a_disposition" ? "mise_a_disposition" : "achat";
  const ligne = {
    defaultCode: String(saisie.defaultCode ?? "").slice(0, 64),
    formule,
    quantite: Math.trunc(Number(saisie.quantite)),
    prixAffiche: typeof saisie.prixAffiche === "number" ? saisie.prixAffiche : undefined,
  } as const;
  const compte = await compteConnecte();
  if (compte) return ajouterAuPanier({ compteId: compte.id }, ligne);

  const jar = await cookies();
  let jeton = jar.get(COOKIE_PANIER)?.value;
  const nouveau = !jeton || !/^[A-Za-z0-9_-]{32,64}$/.test(jeton);
  if (nouveau) jeton = randomBytes(24).toString("base64url");
  const resultat = await ajouterAuPanier({ jeton }, ligne);
  if (resultat.ok) {
    jar.set(COOKIE_PANIER, jeton!, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: PURGE_APRES_JOURS * 24 * 3600,
    });
  }
  return resultat;
}

// --- Édition du panier (F04, US1) ------------------------------------------------------------

/** Identité du panier courant : compte connecté, sinon cookie du visiteur. */
async function identiteCourante() {
  const compte = await compteConnecte();
  if (compte) return { compteId: compte.id };
  return { jeton: (await cookies()).get(COOKIE_PANIER)?.value ?? null };
}

export async function actionModifierLigne(ligneId: string, quantite: number): Promise<boolean> {
  return modifierLigne(await identiteCourante(), String(ligneId), Math.trunc(Number(quantite)));
}

export async function actionSupprimerLigne(ligneId: string): Promise<boolean> {
  return supprimerLigne(await identiteCourante(), String(ligneId));
}

export async function actionCodePromo(code: string): Promise<void> {
  await appliquerCodePromo(await identiteCourante(), String(code ?? ""));
}

export async function actionUtiliserBons(utiliser: boolean, montantHt: number | null = null): Promise<void> {
  const montant = typeof montantHt === "number" && Number.isFinite(montantHt) ? Math.round(montantHt) : null;
  await utiliserBons(await identiteCourante(), Boolean(utiliser), montant);
}

/** Nombre d'articles du panier, pour la pastille de l'en-tête (lu après l'affichage). */
export async function actionNombreArticles(): Promise<number> {
  const panier = await panierPour(await identiteCourante(), false);
  if (!panier) return 0;
  return (await lignesPanier(panier.id)).reduce((s, l) => s + l.quantite, 0);
}

/** Assistance à l'acte (F06, US9, D5) : une intervention au panier, pour un client sans droits actifs. */
export async function actionAcheterAssistance(): Promise<void> {
  const { ARTICLE_ASSISTANCE_ACTE, peutAcheterAssistance } = await import("@/domaine/fidelite/droits");
  const compte = await compteConnecte();
  if (!compte) redirect("/connexion?retour=/mon-compte/assistance");
  if (await peutAcheterAssistance(compte.id)) await ajouterAuPanier({ compteId: compte.id }, { defaultCode: ARTICLE_ASSISTANCE_ACTE, formule: "achat", quantite: 1 });
  redirect("/panier");
}
