import { unstable_cache } from "next/cache";
import type { Categorie } from "@/connecteurs/odoo/interfaces";
import { ETIQUETTES } from "@/lib/cache";
import { grouperConsommables } from "./catalogue/consommables";
import { lireCatalogue, lireCategories, type EntreeCatalogue } from "./catalogue/lecture";
import { cheminDeCategorie } from "./familles";

// Barre de navigation et méga-menus (F27, contracts/navigation.md) : cinq entrées et deux liens
// discrets. « Produits » reprend l'arbre des catégories d'Odoo sur trois niveaux, « Consommables »
// les articles de type « Consommable » par examen. Préparé côté serveur ; si le connecteur Odoo
// est injoignable, la barre et les liens fixes restent disponibles.

export type Lien = { libelle: string; href: string };
export type LienNiveau2 = Lien & { enGras: boolean; sousLiens: Lien[] };
export type Colonne = { titre: string; href: string | null; liens: LienNiveau2[] };
export type CarteAppel = { titre: string; texte: string; bouton: Lien };

export type CleEntree = "produits" | "consommables" | "informatique" | "location" | "services";

export type EntreeNavigation = {
  cle: CleEntree;
  libelle: string;
  /** Page d'ensemble de l'entrée. */
  href: string;
  colonnes: Colonne[];
  carte: CarteAppel | null;
  /** Lien de fin de panneau (« Voir tous les produits »). */
  lienFinal: Lien | null;
};

export type Navigation = { entrees: EntreeNavigation[]; liensSecondaires: Lien[] };

/** Colonnes du panneau « Produits », dans cet ordre (FR-005). */
export const COLONNES_PRODUITS: readonly { rubrique: string; titre: string }[] = [
  { rubrique: "holter-ecg", titre: "Holter ECG" },
  { rubrique: "mapa", titre: "Holter tensionnel / MAPA" },
  { rubrique: "effort", titre: "Épreuve d'effort" },
  { rubrique: "ecg-repos", titre: "ECG de repos" },
];

const PAGE_IM = "/informatique-medicale";

export const LIENS_SECONDAIRES: Lien[] = [
  { libelle: "Qui sommes-nous", href: "/qui-sommes-nous" },
  { libelle: "Contact", href: "/qui-sommes-nous#contact" },
];

const lien = (libelle: string, href: string): LienNiveau2 => ({ libelle, href, enGras: false, sousLiens: [] });

/** Entrées sans catalogue (FR-014, FR-015, US2). */
export const ENTREES_FIXES: Record<"informatique" | "location" | "services", EntreeNavigation> = {
  informatique: {
    cle: "informatique",
    libelle: "Informatique médicale",
    href: PAGE_IM,
    colonnes: [
      { titre: "Accès à distance", href: null, liens: [lien("PCA, votre cabinet accessible partout", `${PAGE_IM}#pca`)] },
      { titre: "Équipement", href: null, liens: [lien("Matériel informatique", `${PAGE_IM}#prestataire`)] },
      {
        titre: "Accompagnement",
        href: null,
        liens: [lien("Support informatique du cabinet", `${PAGE_IM}#prestataire`), lien("Hébergement des données de santé", `${PAGE_IM}#hebergement`)],
      },
    ],
    carte: {
      titre: "Un projet informatique ?",
      texte: "Décrivez votre besoin en 2 minutes, nous vous rappelons.",
      bouton: { libelle: "Décrire mon besoin", href: `${PAGE_IM}#questionnaire` },
    },
    lienFinal: null,
  },
  location: {
    cle: "location",
    libelle: "Location et financement",
    href: "/mise-a-disposition",
    colonnes: [
      {
        titre: "Louer",
        href: null,
        liens: [lien("Mise à disposition au mois", "/mise-a-disposition"), lien("Dépannage express", "/mise-a-disposition#depannage-express")],
      },
      { titre: "Financer", href: null, liens: [lien("Financement longue durée", "/financement")] },
    ],
    carte: null,
    lienFinal: null,
  },
  services: {
    cle: "services",
    libelle: "Services",
    href: "/services",
    colonnes: [
      { titre: "Au quotidien", href: null, liens: [lien("Assistance et service", "/services/assistance"), lien("Centre d’aide", "/aide")] },
      { titre: "À l’installation", href: null, liens: [lien("Installation et formation", "/services/installation-formation")] },
    ],
    carte: null,
    lienFinal: null,
  },
};

const dans = (detail: string, code: string) => detail === code || detail.startsWith(`${code}/`);

/** Panneau « Produits » (FR-005 à FR-009) : catégories sans article publié masquées. */
export function entreeProduits(arbre: Categorie[], entrees: EntreeCatalogue[]): EntreeNavigation {
  const details = entrees.map((e) => e.article.categorieDetail);
  const nonVide = (c: Categorie) => details.some((d) => dans(d, c.code));
  const colonnes = COLONNES_PRODUITS.map(({ rubrique, titre }): Colonne => {
    const famille = cheminDeCategorie(rubrique);
    const href = (code: string) => `${famille}?categorie=${encodeURIComponent(code)}`;
    const niveau1 = arbre.filter((c) => c.niveau === 1 && c.parentCode === rubrique && nonVide(c));
    return {
      titre,
      href: famille,
      liens: niveau1.map((c) => {
        const sousLiens = arbre
          .filter((x) => x.niveau === 2 && x.parentCode === c.code && nonVide(x))
          .map((x) => ({ libelle: x.nom, href: href(x.code) }));
        return { libelle: c.nom, href: href(c.code), enGras: sousLiens.length > 0, sousLiens };
      }),
    };
  });
  return { cle: "produits", libelle: "Produits", href: "/catalogue", colonnes, carte: null, lienFinal: { libelle: "Voir tous les produits", href: "/catalogue" } };
}

/** Panneau « Consommables » (FR-011 à FR-013) : six fiches au plus par examen. */
export function entreeConsommables(entrees: EntreeCatalogue[]): EntreeNavigation {
  const colonnes = grouperConsommables(entrees).map((g) => ({
    titre: g.titre,
    href: `/consommables#${g.rubrique}`,
    liens: g.entrees.slice(0, 6).map((e) => lien(e.article.nom, e.chemin)),
  }));
  return {
    cle: "consommables",
    libelle: "Consommables",
    href: "/consommables",
    colonnes,
    carte: {
      titre: "Vos consommables",
      texte: "Retrouvez vos dernières commandes dans Mon compte pour les renouveler.",
      bouton: { libelle: "Mon compte", href: "/mon-compte" },
    },
    lienFinal: { libelle: "Tous les consommables", href: "/consommables" },
  };
}

export function construireNavigation(arbre: Categorie[], entrees: EntreeCatalogue[]): Navigation {
  return {
    entrees: [entreeProduits(arbre, entrees), entreeConsommables(entrees), ENTREES_FIXES.informatique, ENTREES_FIXES.location, ENTREES_FIXES.services],
    liensSecondaires: LIENS_SECONDAIRES,
  };
}

async function construire(): Promise<Navigation> {
  const [arbre, catalogue] = await Promise.all([lireCategories(), lireCatalogue()]);
  return construireNavigation(arbre, catalogue.entrees);
}

export const lireNavigation = unstable_cache(construire, ["navigation-f27"], {
  tags: [ETIQUETTES.catalogue, ETIQUETTES.contenus],
  revalidate: 300,
});
