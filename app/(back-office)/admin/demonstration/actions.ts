"use server";

import { exigerDroit } from "@/lib/droits";
import { redirect } from "next/navigation";
import { ecranDemonstration, ValeurRefusee, type Auteur } from "@/connecteurs/demonstration";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { invaliderDepuisAction } from "@/lib/cache";
import { centimesDepuisSaisie } from "@/lib/montants";

// Actions de l'écran de démonstration (US5) : administrateur uniquement ; chaque modification
// est journalisée (T064) et invalide aussitôt le cache des pages concernées (T063, SC-009).

async function auteur(): Promise<Auteur> {
  const { user } = await exigerDroit("demonstration", "modifier");
  return { id: user.id, libelle: `${user.name} (${user.email})` };
}

function retour(chemin: string, resultat: { ok: string } | { erreur: string }): never {
  const parametres = new URLSearchParams(resultat);
  redirect(`${chemin}?${parametres.toString()}`);
}

async function executer(chemin: string, succes: string, operation: () => Promise<void>): Promise<never> {
  try {
    await operation();
  } catch (e) {
    if (e instanceof ValeurRefusee || estErreurConnecteur(e)) retour(chemin, { erreur: e.message });
    throw e;
  }
  retour(chemin, { ok: succes });
}

function texte(donnees: FormData, cle: string): string {
  return String(donnees.get(cle) ?? "").trim();
}

function montant(donnees: FormData, cle: string, libelle: string): number {
  const c = centimesDepuisSaisie(texte(donnees, cle));
  if (c === null) throw new ValeurRefusee(`${libelle} : montant invalide (exemple : 1290,50).`);
  return c;
}

function entier(donnees: FormData, cle: string, libelle: string): number {
  const v = texte(donnees, cle);
  if (!/^-?\d+$/.test(v)) throw new ValeurRefusee(`${libelle} : nombre entier attendu.`);
  return Number(v);
}

export async function modifierPrix(donnees: FormData) {
  const a = await auteur();
  const code = texte(donnees, "defaultCode");
  await executer("/admin/demonstration/prix", `Prix de ${code} modifié.`, async () => {
    await ecranDemonstration.modifierPrix(a, code, montant(donnees, "prix", "Prix HT"));
    invaliderDepuisAction("catalogue", "prix");
  });
}

export async function modifierOffreMad(donnees: FormData) {
  const a = await auteur();
  const code = texte(donnees, "defaultCode");
  await executer("/admin/demonstration/prix", `Mise à disposition de ${code} modifiée.`, async () => {
    await ecranDemonstration.modifierOffreMad(
      a,
      code,
      montant(donnees, "premierMois", "Premier mois"),
      montant(donnees, "moisSuivants", "Mois suivants"),
    );
    invaliderDepuisAction("catalogue", "prix");
  });
}

export async function modifierStock(donnees: FormData) {
  const a = await auteur();
  const code = texte(donnees, "defaultCode");
  await executer("/admin/demonstration/stocks", `Stock de ${code} modifié.`, async () => {
    const etat = texte(donnees, "etatHorsStock") === "indisponible" ? "indisponible" : "delai";
    const delai = texte(donnees, "delaiJours");
    await ecranDemonstration.modifierStock(a, code, {
      quantite: entier(donnees, "quantite", "Quantité"),
      etatHorsStock: etat,
      delaiJours: etat === "delai" ? (delai ? entier(donnees, "delaiJours", "Délai en jours") : null) : null,
    });
    invaliderDepuisAction("catalogue", "stock");
  });
}

export async function modifierParametresCommerciaux(donnees: FormData) {
  const a = await auteur();
  await executer("/admin/demonstration/parametres-commerciaux", "Paramètres commerciaux modifiés.", async () => {
    const planchers = donnees.getAll("plancher").map(String);
    const taux = donnees.getAll("taux").map(String);
    const paliers = planchers
      .map((p, i) => ({ plancher: p.trim(), taux: (taux[i] ?? "").trim(), inclusif: donnees.get(`inclusif-${i}`) === "oui" }))
      .filter((p) => p.plancher !== "" || p.taux !== "")
      .map((p) => {
        const plancherCentimes = centimesDepuisSaisie(p.plancher);
        const tauxPourcent = Number(p.taux.replace(",", "."));
        if (plancherCentimes === null || !Number.isFinite(tauxPourcent)) {
          throw new ValeurRefusee("Paliers : chaque palier demande un montant et un taux valides.");
        }
        return { plancherCentimes, inclusif: p.inclusif, tauxPourcent };
      });
    await ecranDemonstration.modifierParametresCommerciaux(a, {
      paliers,
      validiteBonsMois: entier(donnees, "validiteBonsMois", "Validité des bons"),
      seuilDroitsCentimes: montant(donnees, "seuilDroits", "Seuil des droits"),
      dureeDroitsJours: entier(donnees, "dureeDroitsJours", "Durée des droits"),
      prolongation: texte(donnees, "prolongation") === "remise_a_zero" ? "remise_a_zero" : "cumul",
      plafondDroitsJours: entier(donnees, "plafondDroitsJours", "Plafond des droits"),
      prixAssistanceActeCentimes: montant(donnees, "prixActe", "Prix de l'assistance à l'acte"),
    });
    invaliderDepuisAction("fidelite");
  });
}

export async function modifierRemisePromotion(donnees: FormData) {
  const a = await auteur();
  await executer("/admin/demonstration/parametres-commerciaux", "Promotion modifiée.", async () => {
    const remise = Number(texte(donnees, "remise").replace(",", "."));
    await ecranDemonstration.modifierRemisePromotion(a, entier(donnees, "id", "Promotion"), remise);
    invaliderDepuisAction("catalogue", "prix", "fidelite");
  });
}

// --- F05 : règles de location (ce que l'équipe règle dans Odoo) ----------------------------

export async function modifierReglesLocation(donnees: FormData) {
  const a = await auteur();
  await executer("/admin/demonstration/parametres-commerciaux", "Règles de location enregistrées.", async () => {
    const { locationsDemo } = await import("@/connecteurs/demonstration");
    await locationsDemo.modifierRegles(a, {
      tentativesPrelevement: entier(donnees, "tentatives", "Nouvelles tentatives"),
      espacementTentativesJours: entier(donnees, "espacement", "Espacement des tentatives"),
      delaiRegularisationJours: entier(donnees, "regularisation", "Délai de régularisation"),
      delaiRetourJoursOuvres: entier(donnees, "retour", "Délai de retour"),
      toleranceRetardJours: entier(donnees, "tolerance", "Tolérance de retard"),
      delaiNonRetourJours: entier(donnees, "nonRetour", "Délai de non-retour"),
    });
  });
}

// --- F06 : programme de fidélité (ce que l'équipe fait dans Odoo) ---------------------------

const FIDELITE = "/admin/demonstration/fidelite";

async function suivreFideliteAussitot() {
  const { suivreFidelite } = await import("@/domaine/fidelite/suivi");
  await suivreFidelite();
}

export async function ajusterCagnotte(donnees: FormData) {
  const a = await auteur();
  await executer(FIDELITE, "Cagnotte ajustée : le client voit le mouvement et son motif.", async () => {
    const { fideliteDemoOps } = await import("@/connecteurs/demonstration");
    const sens = texte(donnees, "sens") === "debit" ? -1 : 1;
    await fideliteDemoOps.ajusterCagnotte(a, texte(donnees, "partenaire"), sens * montant(donnees, "montant", "Montant"), texte(donnees, "motif"));
    await suivreFideliteAussitot();
  });
}

export async function ajusterDroits(donnees: FormData) {
  const a = await auteur();
  await executer(FIDELITE, "Droits d'assistance ajustés.", async () => {
    const { fideliteDemoOps } = await import("@/connecteurs/demonstration");
    const jour = texte(donnees, "fin");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(jour)) throw new ValeurRefusee("Date de fin invalide.");
    await fideliteDemoOps.ajusterDroits(a, texte(donnees, "partenaire"), new Date(`${jour}T21:59:59Z`), texte(donnees, "motif"));
    await suivreFideliteAussitot();
  });
}

export async function cloreIntervention(donnees: FormData) {
  const a = await auteur();
  await executer(FIDELITE, "Intervention close : le client est prévenu.", async () => {
    const { fideliteDemoOps } = await import("@/connecteurs/demonstration");
    await fideliteDemoOps.cloreIntervention(a, entier(donnees, "id", "Intervention"));
    await suivreFideliteAussitot();
  });
}

export async function expirerBons(donnees: FormData) {
  const a = await auteur();
  const jour = texte(donnees, "date");
  await executer(FIDELITE, `Bons échus au ${jour} expirés ; rappels envoyés.`, async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(jour)) throw new ValeurRefusee("Date invalide.");
    const date = new Date(`${jour}T21:59:59Z`);
    const { fideliteDemoOps } = await import("@/connecteurs/demonstration");
    await fideliteDemoOps.expirerBons(a, date);
    await suivreFideliteAussitot();
    const { envoyerRappelsFidelite } = await import("@/domaine/fidelite/rappels");
    await envoyerRappelsFidelite(date);
  });
}

export async function creerPromotion(donnees: FormData) {
  const a = await auteur();
  await executer(FIDELITE, "Promotion créée.", async () => {
    const { fideliteDemoOps } = await import("@/connecteurs/demonstration");
    const type = texte(donnees, "type") as "vente_flash" | "remise_automatique" | "code_promo";
    const debut = texte(donnees, "debut");
    const fin = texte(donnees, "fin");
    await fideliteDemoOps.creerPromotion(a, {
      nom: texte(donnees, "nom"),
      type: ["vente_flash", "remise_automatique", "code_promo"].includes(type) ? type : "vente_flash",
      code: texte(donnees, "code").toUpperCase() || undefined,
      remisePourcent: Number(texte(donnees, "remise").replace(",", ".")),
      defaultCodes: texte(donnees, "references").split(/[\s,]+/).filter(Boolean),
      debut: debut ? new Date(debut) : new Date(),
      fin: new Date(fin),
      annoncee: donnees.get("annoncee") === "oui",
    });
    invaliderDepuisAction("catalogue", "prix", "fidelite");
  });
}

export async function terminerPromotion(donnees: FormData) {
  const a = await auteur();
  await executer(FIDELITE, "Promotion terminée.", async () => {
    const { fideliteDemoOps } = await import("@/connecteurs/demonstration");
    await fideliteDemoOps.terminerPromotion(a, entier(donnees, "id", "Promotion"));
    invaliderDepuisAction("catalogue", "prix", "fidelite");
  });
}

export async function modifierNiveauxRelance(donnees: FormData) {
  const a = await auteur();
  await executer("/admin/demonstration/parametres-commerciaux", "Niveaux de relance enregistrés.", async () => {
    const { relancesDemo } = await import("@/connecteurs/demonstration");
    await relancesDemo.modifierNiveaux(a, [1, 2, 3].map((niveau) => ({ niveau, joursAvantConsequence: entier(donnees, `niveau${niveau}`, `Niveau ${niveau}`) })));
  });
}

// F10 : emails automatisés (historique de commandes régulières, scénarios à la demande).
const EMAILS = "/admin/demonstration/emails";

export async function simulerCommandesRegulieres(donnees: FormData) {
  const a = await auteur();
  await executer(EMAILS, "Historique de commandes créé.", async () => {
    const { emailingDemoOps } = await import("@/connecteurs/demonstration");
    await emailingDemoOps.simulerCommandesRegulieres(a, {
      partenaireRef: texte(donnees, "partenaire"),
      defaultCode: texte(donnees, "article"),
      quantite: entier(donnees, "quantite", "Quantité"),
      intervalleJours: entier(donnees, "intervalle", "Intervalle"),
      nombre: entier(donnees, "nombre", "Nombre de commandes"),
      derniereIlYaJours: entier(donnees, "derniere", "Dernière commande"),
    });
  });
}

export async function lancerScenariosEmails() {
  const a = await auteur();
  const { emailingDemoOps } = await import("@/connecteurs/demonstration");
  let bilan: Awaited<ReturnType<typeof emailingDemoOps.lancerScenarios>>;
  try {
    bilan = await emailingDemoOps.lancerScenarios(a);
  } catch (e) {
    if (e instanceof ValeurRefusee || estErreurConnecteur(e)) retour(EMAILS, { erreur: e.message });
    throw e;
  }
  retour(EMAILS, { ok: `Scénarios lancés : ${bilan.reapprovisionnement} relance(s) de réapprovisionnement, ${bilan.paniers} rappel(s) de panier, ${bilan.impayes} relance(s) de paiement.` });
}
