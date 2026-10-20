"use server";

import { redirect } from "next/navigation";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { ajouterAuPanier } from "@/domaine/catalogue/panier";
import { AbonnementRefuse, estLogicielCloud, resilierAbonnementLogiciel } from "@/domaine/cloud/abonnement";
import { compteConnecte } from "@/domaine/comptes/session";

// Actions du client dans « Mes logiciels Cloud » (F12, US3, D3) : souscrire ou poursuivre
// l'abonnement (par le panier et le tunnel de F04), résilier l'abonnement.

const CHEMIN = "/mon-compte/logiciels";
const t = (d: FormData, n: string) => String(d.get(n) ?? "").trim();

async function compte() {
  const c = await compteConnecte();
  if (!c) redirect(`/connexion?retour=${CHEMIN}`);
  return c;
}

function retour(r: { ok: string } | { erreur: string }): never {
  redirect(`${CHEMIN}?${new URLSearchParams(r).toString()}`);
}

/** Abonnement mensuel au logiciel ajouté au panier ; la prise d'effet est calculée au devis. */
export async function actionSouscrireLogiciel(d: FormData) {
  const c = await compte();
  const logiciel = t(d, "logiciel").slice(0, 64);
  if (!(await estLogicielCloud(logiciel))) retour({ erreur: "Logiciel introuvable." });
  const r = await ajouterAuPanier({ compteId: c.id }, { defaultCode: logiciel, formule: "mise_a_disposition", quantite: 1 });
  if (!r.ok) retour({ erreur: r.message });
  redirect("/panier");
}

export async function actionResilierAbonnementLogiciel(d: FormData) {
  const c = await compte();
  let fin: Date;
  try {
    ({ fin } = await resilierAbonnementLogiciel(c.id, t(d, "ref")));
  } catch (e) {
    if (e instanceof AbonnementRefuse || estErreurConnecteur(e)) retour({ erreur: e.message });
    throw e;
  }
  retour({ ok: `Abonnement résilié : votre accès continue jusqu'au ${fin.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}, puis vous aurez un délai pour récupérer vos données.` });
}
