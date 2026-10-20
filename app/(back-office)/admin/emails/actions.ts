"use server";

import { redirect } from "next/navigation";
import type { TypeCampagne } from "@generated/site/client";
import { annulerCampagne, CampagneRefusee, creerCampagne, envoyerTestCampagne, modifierCampagne, programmerCampagne, type SaisieCampagne } from "@/domaine/emailing/campagnes";
import { instantDeParis } from "@/domaine/emailing/decision";
import { objetConnu } from "@/domaine/emailing/desinscription";
import { changerPreference, desabonnerNewsletter } from "@/domaine/emailing/preferences";
import { leverSuspension } from "@/domaine/emailing/suivi";
import { enregistrerBrouillon, envoyerTestModele, publierModele, revenirAuTexteOrigine, TexteRefuse, textesParDefaut } from "@/domaine/emailing/textes";
import type { TextesModele } from "@/emails/textes";
import { dbSite } from "@/lib/db/site";
import { ecrireParametre, lireParametre } from "@/lib/parametres";
import { exigerAdministrateur } from "@/lib/roles";

// Actions de Back-office → Emails (F10, US3, US8) : administrateur seulement, journalisées par le
// domaine. Erreurs de saisie renvoyées en message, sans perdre la page.

async function auteur() {
  const { user } = await exigerAdministrateur();
  return { id: user.id, libelle: `${user.name} (${user.email})`, email: user.email };
}

const t = (d: FormData, cle: string) => String(d.get(cle) ?? "");

function retour(chemin: string, r: { ok: string } | { erreur: string }): never {
  redirect(`${chemin}?${new URLSearchParams(r).toString()}`);
}

async function executer(chemin: string, succes: string, operation: () => Promise<unknown>): Promise<never> {
  try {
    await operation();
  } catch (e) {
    if (e instanceof CampagneRefusee) retour(chemin, { erreur: e.message });
    throw e;
  }
  retour(chemin, { ok: succes });
}

function saisie(d: FormData): SaisieCampagne {
  return {
    type: t(d, "type") as TypeCampagne,
    objet: t(d, "objet"),
    titre: t(d, "titre"),
    texte: t(d, "texte"),
    lien: t(d, "lien") || null,
    libelleLien: t(d, "libelleLien") || null,
  };
}

export async function actionCreerCampagne(d: FormData) {
  const a = await auteur();
  let id = "";
  try {
    id = (await creerCampagne(saisie(d), a)).id;
  } catch (e) {
    if (e instanceof CampagneRefusee) retour("/admin/emails/campagnes", { erreur: e.message });
    throw e;
  }
  retour(`/admin/emails/campagnes/${id}`, { ok: "Campagne enregistrée en brouillon. Envoyez-vous un email de test avant de la programmer." });
}

export async function actionModifierCampagne(d: FormData) {
  const a = await auteur();
  const id = t(d, "id");
  await executer(`/admin/emails/campagnes/${id}`, "Campagne modifiée. Envoyez-vous un nouvel email de test.", () => modifierCampagne(id, saisie(d), a));
}

export async function actionTesterCampagne(d: FormData) {
  const a = await auteur();
  const id = t(d, "id");
  await executer(`/admin/emails/campagnes/${id}`, `Email de test envoyé à ${a.email}.`, () => envoyerTestCampagne(id, a));
}

export async function actionProgrammerCampagne(d: FormData) {
  const a = await auteur();
  const id = t(d, "id");
  // Saisie « AAAA-MM-JJTHH:MM » à l'heure de Paris, quel que soit le fuseau du serveur.
  const m = t(d, "date").match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/);
  const date = m ? new Date(instantDeParis(m[1]!, Number(m[2])).getTime() + Number(m[3]) * 60_000) : null;
  let n = 0;
  try {
    n = (await programmerCampagne(id, date, a)).destinataires;
  } catch (e) {
    if (e instanceof CampagneRefusee) retour(`/admin/emails/campagnes/${id}`, { erreur: e.message });
    throw e;
  }
  retour(`/admin/emails/campagnes/${id}`, { ok: `Campagne programmée pour ${n} abonné${n > 1 ? "s" : ""}.` });
}

export async function actionLeverSuspension(d: FormData) {
  const a = await auteur();
  const email = t(d, "email").toLowerCase();
  await leverSuspension(email, a.libelle);
  await dbSite().journalAction.create({ data: { auteurId: a.id, auteur: a.libelle, action: "emailing.suspension_levee", objet: email, detail: {} } });
  retour(`/admin/emails`, { ok: `Suspension levée pour ${email}.` });
}

export async function actionDesinscriptionEquipe(d: FormData) {
  const a = await auteur();
  const email = t(d, "email").toLowerCase();
  const objet = t(d, "objet");
  if (!objetConnu(objet)) retour("/admin/emails", { erreur: "Type d'email inconnu." });
  if (objet === "newsletter") await desabonnerNewsletter(email, "equipe");
  else await changerPreference(email, objet, false, "equipe");
  await dbSite().journalAction.create({ data: { auteurId: a.id, auteur: a.libelle, action: "emailing.desinscription_equipe", objet: email, detail: { objet } } });
  retour(`/admin/emails?q=${encodeURIComponent(email)}`, { ok: "Désinscription enregistrée." });
}

export async function actionAnnulerCampagne(d: FormData) {
  const a = await auteur();
  const id = t(d, "id");
  await executer(`/admin/emails/campagnes/${id}`, "Campagne annulée : les envois en attente ne partiront pas.", () => annulerCampagne(id, a));
}

// Scénarios et règles d'envoi (F10, US8, FR-037) : paramètres du back-office, avec historique.
const BORNES: Record<string, [number, number, string]> = {
  "emailing.reappro.avance_jours": [1, 30, "Avance de la relance de réapprovisionnement (jours)"],
  "emailing.reappro.commandes_min": [2, 12, "Nombre minimum de commandes"],
  "emailing.reappro.ecart_max_pct": [10, 100, "Écart toléré entre les intervalles (%)"],
  "emailing.panier.delai_heures": [1, 168, "Délai du rappel de panier (heures)"],
  "emailing.frequence_max": [1, 20, "Nombre maximum d'emails facultatifs"],
  "emailing.frequence_jours": [1, 30, "Période de la fréquence (jours)"],
  "emailing.plage_debut": [0, 23, "Début des envois (heure)"],
  "emailing.plage_fin": [1, 24, "Fin des envois (heure)"],
};
const INTERRUPTEURS = ["emailing.reappro.actif", "emailing.panier.actif", "emailing.alerte_bons.actif", "emailing.alerte_droits.actif", "emailing.impayes.actif"];

export async function actionReglerEmails(d: FormData) {
  const { user } = await exigerAdministrateur();
  const valeurs: Record<string, string> = {};
  for (const [cle, [min, max, libelle]] of Object.entries(BORNES)) {
    const v = t(d, cle).trim();
    if (!/^\d+$/.test(v) || Number(v) < min || Number(v) > max) retour("/admin/emails/scenarios", { erreur: `${libelle} : entre ${min} et ${max}.` });
    valeurs[cle] = v;
  }
  if (Number(valeurs["emailing.plage_debut"]) >= Number(valeurs["emailing.plage_fin"])) retour("/admin/emails/scenarios", { erreur: "La plage d'envoi doit commencer avant de finir." });
  for (const cle of INTERRUPTEURS) valeurs[cle] = d.get(cle) === "oui" ? "true" : "false";
  const expediteur = t(d, "emailing.expediteur_nom").trim();
  if (!expediteur || expediteur.length > 60) retour("/admin/emails/scenarios", { erreur: "Nom de l'expéditeur : obligatoire, 60 caractères au plus." });
  valeurs["emailing.expediteur_nom"] = expediteur;
  for (const [cle, valeur] of Object.entries(valeurs)) {
    if ((await lireParametre(cle)) !== valeur) await ecrireParametre(cle, valeur, user.id);
  }
  retour("/admin/emails/scenarios", { ok: "Réglages enregistrés : ils s'appliquent aux envois suivants, y compris ceux déjà programmés." });
}

// Textes des modèles (F10, US8, FR-026, D2).
function textesSaisis(d: FormData, code: string): TextesModele {
  const defaut = textesParDefaut(code);
  return {
    objet: t(d, "objet"),
    apercu: t(d, "apercu"),
    titre: t(d, "titre") || undefined,
    blocs: Object.fromEntries(Object.keys(defaut.blocs).map((nom) => [nom, t(d, `bloc.${nom}`).replace(/\r\n/g, "\n")])),
  };
}

async function executerModele(code: string, succes: string, operation: () => Promise<unknown>): Promise<never> {
  const chemin = `/admin/emails/modeles/${code}`;
  try {
    await operation();
  } catch (e) {
    if (e instanceof TexteRefuse) retour(chemin, { erreur: e.message });
    throw e;
  }
  retour(chemin, { ok: succes });
}

export async function actionBrouillonModele(d: FormData) {
  const a = await auteur();
  const code = t(d, "code");
  await executerModele(code, "Brouillon enregistré : vérifiez l’aperçu, envoyez-vous un test, puis publiez.", () => enregistrerBrouillon(code, textesSaisis(d, code), a));
}

export async function actionTesterModele(d: FormData) {
  const a = await auteur();
  const code = t(d, "code");
  await executerModele(code, `Email de test envoyé à ${a.email}.`, () => envoyerTestModele(code, a));
}

export async function actionPublierModele(d: FormData) {
  const a = await auteur();
  const code = t(d, "code");
  await executerModele(code, "Texte publié : les emails suivants l’utilisent.", () => publierModele(code, a));
}

export async function actionOrigineModele(d: FormData) {
  const a = await auteur();
  const code = t(d, "code");
  await executerModele(code, "Texte d’origine rétabli.", () => revenirAuTexteOrigine(code, a));
}
