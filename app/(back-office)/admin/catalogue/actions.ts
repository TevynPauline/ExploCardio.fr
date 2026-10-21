"use server";

import { dbSite } from "@/lib/db/site";

import { exigerDroit } from "@/lib/droits";
import { redirect } from "next/navigation";
import {
  ContenuInvalide,
  creerSousCategorie,
  deplacerSousCategorie,
  enregistrerContenu,
  publier,
  retirer,
  supprimerSousCategorie,
  type SaisieContenu,
} from "@/domaine/catalogue/administration";
import type { DocumentProduit, PhotoProduit } from "@/domaine/catalogue/publication";
import { invaliderDepuisAction } from "@/lib/cache";
import { centimesDepuisSaisie } from "@/lib/montants";
import { ecrireParametre, lireParametre } from "@/lib/parametres";
import { exigerAdministrateur } from "@/lib/roles";
import { deposerDocument, deposerImage, FichierRefuse } from "@/lib/stockage";

// Back-office du catalogue (F03, US6) : administrateur uniquement pour toute écriture.

async function auteur() {
  const { user } = await exigerDroit("catalogue", "modifier");
  return { id: user.id, libelle: `${user.name} (${user.email})` };
}

function retour(chemin: string, r: Record<string, string>): never {
  redirect(`${chemin}?${new URLSearchParams(r).toString()}`);
}

export type EtatContenu = { erreurs: Record<string, string>; message?: string; ok?: string };

const t = (d: FormData, n: string) => String(d.get(n) ?? "");

export async function actionEnregistrerContenu(_e: EtatContenu, d: FormData): Promise<EtatContenu> {
  const a = await auteur();
  const reference = t(d, "reference");
  const nouvellesPhotos: PhotoProduit[] = [];
  const nouveauxDocuments: DocumentProduit[] = [];
  try {
    const photo = d.get("nouvellePhoto");
    if (photo instanceof File && photo.size > 0) {
      nouvellesPhotos.push({ chemin: await deposerImage(photo, "produits"), texteRemplacement: t(d, "nouvellePhotoTexte").trim() });
    }
    const doc = d.get("nouveauDocument");
    if (doc instanceof File && doc.size > 0) {
      const { chemin, octets } = await deposerDocument(doc);
      const titre = t(d, "nouveauDocumentTitre").trim() || doc.name.replace(/\.pdf$/i, "");
      nouveauxDocuments.push({ chemin, octets, titre, type: t(d, "nouveauDocumentType") === "fiche_technique" ? "fiche_technique" : "notice" });
    }
  } catch (e) {
    if (e instanceof FichierRefuse) return { erreurs: { fichiers: e.message }, message: "Le contenu n'a pas été enregistré : corrigez les champs signalés." };
    throw e;
  }
  const saisie: SaisieContenu = {
    slug: t(d, "slug"),
    sousCategorieId: t(d, "sousCategorieId"),
    ordre: t(d, "ordre"),
    descriptionCourte: t(d, "descriptionCourte"),
    caracteristiques: t(d, "caracteristiques"),
    contenuCoffret: t(d, "contenuCoffret"),
    contenuPackMad: t(d, "contenuPackMad"),
    logicielAssocie: t(d, "logicielAssocie"),
    garantie: t(d, "garantie"),
    compatibilites: t(d, "compatibilites"),
    produitsAssocies: t(d, "produitsAssocies"),
    textesPhotos: d.getAll("textePhoto").map(String),
    photosRetirees: d.getAll("photoRetiree").map(String),
    documentsRetires: d.getAll("documentRetire").map(String),
    nouvellesPhotos,
    nouveauxDocuments,
  };
  try {
    await enregistrerContenu(reference, saisie, a);
  } catch (e) {
    if (e instanceof ContenuInvalide) return { erreurs: e.erreurs, message: "Le contenu n'a pas été enregistré : corrigez les champs signalés." };
    throw e;
  }
  return { erreurs: {}, ok: "Contenu enregistré." };
}

export async function actionPublier(d: FormData) {
  const a = await auteur();
  const reference = t(d, "reference");
  const chemin = `/admin/catalogue/${encodeURIComponent(reference)}`;
  const r = await publier(reference, a);
  if (!r.ok) retour(chemin, { erreur: `Publication impossible. Il manque : ${r.manquants.join(" ")}` });
  retour(chemin, { ok: "Produit publié : il est visible dans sa catégorie et dans la recherche." });
}

export async function actionRetirer(d: FormData) {
  const a = await auteur();
  const reference = t(d, "reference");
  const etat = t(d, "etat") === "retire" ? "retire" : "preparation";
  await retirer(reference, etat, a);
  retour(`/admin/catalogue/${encodeURIComponent(reference)}`, {
    ok: etat === "retire" ? "Produit retiré du catalogue : son adresse indique qu'il n'est plus proposé." : "Produit remis en préparation : il est invisible du public.",
  });
}

export async function actionSousCategorie(d: FormData) {
  const a = await auteur();
  const chemin = "/admin/catalogue/sous-categories";
  try {
    const action = t(d, "action");
    if (action === "creer") await creerSousCategorie(t(d, "categorie"), t(d, "libelle"), a);
    else if (action === "monter") await deplacerSousCategorie(t(d, "id"), -1, a);
    else if (action === "descendre") await deplacerSousCategorie(t(d, "id"), 1, a);
    else if (action === "supprimer") await supprimerSousCategorie(t(d, "id"), a);
  } catch (e) {
    if (e instanceof ContenuInvalide) retour(chemin, { erreur: Object.values(e.erreurs).join(" ") });
    throw e;
  }
  retour(chemin, { ok: "Types enregistrés." });
}

const CLES_SERVICES = [
  "accueil.badge_hebergement",
  "services.hebergement.tarif",
  "services.assistance.tarif",
  "services.financement.tarif",
  "services.installation.tarif",
  "financement.mention",
] as const;

export async function actionServices(d: FormData) {
  const { user } = await exigerAdministrateur();
  const chemin = "/admin/catalogue/services";
  for (const cle of CLES_SERVICES) {
    const valeur = t(d, cle).trim();
    if (cle.endsWith(".tarif") && valeur && (centimesDepuisSaisie(valeur) ?? 0) <= 0) {
      retour(chemin, { erreur: "Un tarif doit être un montant en euros HT, par exemple 490,00." });
    }
    if (cle === "financement.mention" && !valeur) retour(chemin, { erreur: "La mention sous les mensualités est obligatoire." });
  }
  for (const cle of CLES_SERVICES) {
    const valeur = t(d, cle).trim();
    const avant = await lireParametre(cle);
    if (avant === valeur) continue;
    await ecrireParametre(cle, valeur, user.id);
    await dbSite().journalAction.create({ data: { auteurId: user.id, auteur: `${user.name} (${user.email})`, action: "catalogue.parametre.modifie", objet: cle, detail: { avant, apres: valeur } } });
  }
  invaliderDepuisAction("contenus");
  retour(chemin, { ok: "Réglages enregistrés." });
}
