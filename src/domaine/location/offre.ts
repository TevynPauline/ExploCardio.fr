import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { jourDeParis } from "@/lib/calendrier";
import { lireParametre, lireParametreEntier } from "@/lib/parametres";
import { lireCatalogue } from "../catalogue/lecture";
import { prixTtc } from "../catalogue/prix";
import { SLUG_FORMULE } from "../catalogue/formules";
import { estLendemain, premiereDateLivraison, type ReglesLivraison } from "./calendrier";

// Offres de mise à disposition (F05, US1, FR-005) : prix et contenu du pack lus dans Odoo,
// première date de livraison calculée avec le parc lu en direct (SC-006 : un appareil passé
// en maintenance ou loué cesse d'être proposé aussitôt).

function listeJson(valeur: string | null): string[] {
  try {
    const v = JSON.parse(valeur ?? "[]") as unknown;
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export async function lireReglesLivraison(): Promise<ReglesLivraison> {
  return {
    heureLimite: (await lireParametre("commande.heure_limite_express"))?.trim() || "14:00",
    joursNonLivres: listeJson(await lireParametre("livraison.jours_non_livres")),
    zonesSansLendemain: listeJson(await lireParametre("livraison.zones_sans_lendemain")),
    delaiZonesJours: await lireParametreEntier("livraison.delai_zones_jours", 2),
  };
}

/** Première date de livraison d'un appareil (AAAA-MM-JJ), parc d'Odoo compris. */
export async function premiereDatePour(defaultCode: string, codePostal?: string | null, maintenant = new Date(), regles?: ReglesLivraison): Promise<string> {
  const r = regles ?? (await lireReglesLivraison());
  const souhaitee = premiereDateLivraison(maintenant, r, codePostal);
  const { premiereDate } = await registre.odoo().stock.lireDisponibiliteParc(defaultCode, new Date(`${souhaitee}T12:00:00Z`));
  return premiereDateLivraison(maintenant, r, codePostal, jourDeParis(premiereDate));
}

export type OffreDepannage = {
  defaultCode: string;
  nom: string;
  marque: string;
  configuration: string | null;
  chemin: string;
  premierMoisHt: number;
  premierMoisTtc: number;
  moisSuivantsHt: number;
  moisSuivantsTtc: number;
  contenuPack: string[];
  premiereDate: string;
  lendemain: boolean;
};

/** Équipements proposés en mise à disposition, du plus vite livrable au moins vite. */
export async function offresDepannage(maintenant = new Date()): Promise<{ offres: OffreDepannage[]; indisponible: boolean; heureLimite: string }> {
  const catalogue = await lireCatalogue();
  const regles = await lireReglesLivraison();
  if (catalogue.indisponible) return { offres: [], indisponible: true, heureLimite: regles.heureLimite };
  const offres: OffreDepannage[] = [];
  try {
    for (const e of catalogue.entrees) {
      if (!e.article.formules.includes("mise_a_disposition")) continue;
      for (const v of e.article.variantes) {
        const o = v.offreMiseADisposition;
        if (!o) continue;
        const premiereDate = await premiereDatePour(v.defaultCode, null, maintenant, regles);
        const url = new URLSearchParams({ formule: SLUG_FORMULE.mise_a_disposition });
        if (e.article.variantes.length > 1) url.set("config", v.defaultCode);
        offres.push({
          defaultCode: v.defaultCode,
          nom: e.article.nom,
          marque: e.article.marque,
          configuration: v.configuration,
          chemin: `${e.chemin}?${url.toString()}`,
          premierMoisHt: o.premierMoisHt,
          premierMoisTtc: prixTtc(o.premierMoisHt, v.tauxTva),
          moisSuivantsHt: o.moisSuivantsHt,
          moisSuivantsTtc: prixTtc(o.moisSuivantsHt, v.tauxTva),
          contenuPack: o.contenuPack,
          premiereDate,
          lendemain: estLendemain(maintenant, premiereDate),
        });
      }
    }
  } catch (e) {
    if (estErreurConnecteur(e)) return { offres: [], indisponible: true, heureLimite: regles.heureLimite };
    throw e;
  }
  offres.sort((a, b) => a.premiereDate.localeCompare(b.premiereDate) || a.premierMoisHt - b.premierMoisHt);
  return { offres, indisponible: false, heureLimite: regles.heureLimite };
}
