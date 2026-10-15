"use server";

import { redirect } from "next/navigation";
import { ecranDemonstration, ValeurRefusee, type Auteur } from "@/connecteurs/demonstration";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { invaliderDepuisAction } from "@/lib/cache";
import { exigerAdministrateur } from "@/lib/roles";
import { centimesDepuisSaisie } from "@/lib/montants";

// Actions de l'écran de démonstration (US5) : administrateur uniquement ; chaque modification
// est journalisée (T064) et invalide aussitôt le cache des pages concernées (T063, SC-009).

async function auteur(): Promise<Auteur> {
  const { user } = await exigerAdministrateur();
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
    invaliderDepuisAction("catalogue", "prix");
  });
}
