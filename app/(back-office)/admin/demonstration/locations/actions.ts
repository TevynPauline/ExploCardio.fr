"use server";

import { redirect } from "next/navigation";
import { locationsDemo, ValeurRefusee } from "@/connecteurs/demonstration";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { centimesDepuisSaisie } from "@/lib/montants";
import { exigerAdministrateur } from "@/lib/roles";

// Cycle des locations en démonstration (F05, T017) : ce que l'équipe fera dans Odoo. Le suivi
// des locations passe aussitôt après chaque action (en temps normal : toutes les 5 minutes).

const CHEMIN = "/admin/demonstration/locations";

async function auteur() {
  const { user } = await exigerAdministrateur();
  return { id: user.id, libelle: `${user.name} (${user.email})` };
}

function retour(r: { ok: string } | { erreur: string }): never {
  redirect(`${CHEMIN}?${new URLSearchParams(r).toString()}`);
}

async function suivreAussitot() {
  const { suivreLocations } = await import("@/domaine/location/suivi");
  await suivreLocations();
}

async function executer(succes: string, operation: () => Promise<unknown>): Promise<never> {
  try {
    await operation();
    await suivreAussitot();
  } catch (e) {
    if (e instanceof ValeurRefusee || estErreurConnecteur(e)) retour({ erreur: e.message });
    throw e;
  }
  retour({ ok: succes });
}

const t = (d: FormData, n: string) => String(d.get(n) ?? "").trim();

export async function expedier(d: FormData) {
  const a = await auteur();
  const ref = t(d, "location");
  await executer(`Location ${ref} expédiée : client prévenu, accès Cloud ouvert, équipe alertée pour la formation.`, () =>
    locationsDemo.preparerExpedition(a, ref, t(d, "transporteur"), t(d, "suivi"), t(d, "appareil") || undefined),
  );
}

export async function signalerDefectueux(d: FormData) {
  const a = await auteur();
  const ref = t(d, "location");
  let remplace = false;
  try {
    remplace = (await locationsDemo.signalerAppareilDefectueux(a, ref)).remplace;
    await suivreAussitot();
  } catch (e) {
    if (e instanceof ValeurRefusee || estErreurConnecteur(e)) retour({ erreur: e.message });
    throw e;
  }
  retour({ ok: remplace ? `Appareil remplacé pour ${ref}.` : `Aucun autre appareil : le client de ${ref} est invité à reporter ou annuler.` });
}

export async function colisNonLivre(d: FormData) {
  const a = await auteur();
  const ref = t(d, "location");
  await executer(`Colis non livré signalé pour ${ref} : équipe alertée.`, () => locationsDemo.colisNonLivre(a, ref));
}

export async function livrer(d: FormData) {
  const a = await auteur();
  const ref = t(d, "location");
  await executer(`Location ${ref} livrée : elle commence aujourd'hui.`, () => locationsDemo.marquerLivree(a, ref));
}

export async function enregistrerRetour(d: FormData) {
  const a = await auteur();
  const ref = t(d, "location");
  const etat = t(d, "etat") as "complet" | "degrade" | "perdu";
  const appareil = t(d, "appareil") === "en_maintenance" ? "en_maintenance" : "disponible";
  const degradation = etat === "degrade" ? centimesDepuisSaisie(t(d, "degradation")) : 0;
  if (etat === "degrade" && (degradation === null || degradation <= 0)) retour({ erreur: "Dégradation : montant HT invalide (exemple : 80,00)." });
  await executer(`Retour enregistré pour ${ref} : location terminée, client prévenu.`, () => locationsDemo.enregistrerRetour(a, ref, etat, appareil, degradation ?? 0));
}

export async function enregistrerKit(d: FormData) {
  const a = await auteur();
  await executer(`Kit ${t(d, "kit")} enregistré pour ${t(d, "partenaire")}.`, () => locationsDemo.enregistrerKit(a, t(d, "partenaire"), t(d, "kit")));
}

export async function echouerPrelevement(d: FormData) {
  const a = await auteur();
  const ref = t(d, "location");
  await executer(`Prélèvement échoué simulé pour ${ref} : client prévenu.`, () => locationsDemo.echouerPrelevement(a, ref));
}

export async function regulariser(d: FormData) {
  const a = await auteur();
  const ref = t(d, "location");
  await executer(`Impayé régularisé pour ${ref}.`, () => locationsDemo.regulariser(a, ref));
}

export async function avancer(d: FormData) {
  const a = await auteur();
  const jour = t(d, "date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jour)) retour({ erreur: "Date invalide." });
  // Fin de la journée choisie (heure de Paris) : tout ce qui tombe ce jour-là est dû.
  const fin = new Date(`${jour}T21:59:59Z`);
  let n = 0;
  try {
    n = (await locationsDemo.avancerJusquA(a, fin)).echeances;
    const { suivreLocations } = await import("@/domaine/location/suivi");
    const { envoyerRappelsLocations } = await import("@/domaine/location/rappels");
    // Les changements portent la date réelle d'Odoo : le suivi les relève à l'heure actuelle.
    await suivreLocations();
    await envoyerRappelsLocations(fin);
  } catch (e) {
    if (e instanceof ValeurRefusee || estErreurConnecteur(e)) retour({ erreur: e.message });
    throw e;
  }
  retour({ ok: `Actions planifiées exécutées au ${jour} : ${n} échéance${n > 1 ? "s" : ""} prélevée${n > 1 ? "s" : ""}, rappels envoyés.` });
}
