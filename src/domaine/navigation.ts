import { unstable_cache } from "next/cache";
import { registre } from "@/connecteurs/registre";
import type { ResumeArticle } from "@/connecteurs/odoo/interfaces";
import { ETIQUETTES } from "@/lib/cache";
import { dbSite } from "@/lib/db/site";
import { FAMILLES, GROUPES_TYPES, cheminArticle, type Famille } from "./familles";

// Contenu de la barre de navigation et des méga-menus (F01, T034, FR-003 à FR-009) :
// sous-catégories issues du catalogue (connecteur Odoo), produits phares et liens rapides
// choisis par l'administrateur. Préparé côté serveur : aucun appel au connecteur depuis le
// navigateur. En cas de panne du connecteur, les liens fixes restent disponibles.

export type Lien = { libelle: string; href: string };
export type ProduitPhare = { libelle: string; sousTitre: string; href: string; prixHt: number };

export type EntreeNavigation = {
  cle: string;
  libelle: string;
  href: string;
  sousCategories: Lien[];
  produitsPhares: ProduitPhare[];
  liensRapides: Lien[];
};

const ENTREES = [
  { cle: "holter_ecg", libelle: "Holter ECG", href: "/holter-ecg", famille: FAMILLES["holter-ecg"] },
  { cle: "holter_tensionnel", libelle: "Holter tensionnel", href: "/holter-tensionnel", famille: FAMILLES["holter-tensionnel"] },
  { cle: "epreuve_effort", libelle: "Épreuve d'effort", href: "/epreuve-effort", famille: FAMILLES["epreuve-effort"] },
  { cle: "accessoires", libelle: "Accessoires & consommables", href: "/accessoires-consommables", famille: FAMILLES["accessoires-consommables"] },
  { cle: "services", libelle: "Services", href: "/services", famille: null },
  { cle: "financement", libelle: "Financement", href: "/financement", famille: null },
  { cle: "qui_sommes_nous", libelle: "Qui sommes-nous / Contact", href: "/qui-sommes-nous", famille: null },
] as const;

/** Sous-catégories et liens fixes des entrées sans famille du catalogue. */
const FIXES: Record<string, Lien[]> = {
  services: [
    { libelle: "Hébergement des données de santé", href: "/services/hebergement-donnees-sante" },
    { libelle: "Assistance et service", href: "/services/assistance" },
    { libelle: "Financement", href: "/financement" },
    { libelle: "Mise à disposition", href: "/mise-a-disposition" },
  ],
  financement: [
    { libelle: "Financement longue durée", href: "/financement" },
    { libelle: "Mise à disposition au mois", href: "/mise-a-disposition" },
    { libelle: "Dépannage express", href: "/mise-a-disposition#depannage-express" },
  ],
  qui_sommes_nous: [
    { libelle: "Qui sommes-nous", href: "/qui-sommes-nous" },
    { libelle: "Nous écrire", href: "/qui-sommes-nous#contact" },
    { libelle: "Aide en ligne", href: "/services/assistance#aide" },
  ],
};

function sousCategoriesDeFamille(famille: Famille, articles: ResumeArticle[]): Lien[] {
  const presents = new Set(articles.map((a) => a.type));
  const liens: Lien[] = GROUPES_TYPES.filter((g) => presents.has(g.type)).map((g) => ({
    libelle: g.libelle,
    href: `${famille.chemin}#${g.ancre}`,
  }));
  if (famille.cle === "holter-ecg") liens.push({ libelle: "ECG de repos", href: FAMILLES["ecg-de-repos"].chemin });
  return liens.length ? liens : [{ libelle: `Tous les produits ${famille.libelle}`, href: famille.chemin }];
}

async function construire(): Promise<EntreeNavigation[]> {
  const elements = await dbSite().elementMenu.findMany({ orderBy: { ordre: "asc" } });
  const odoo = registre.odoo();
  return Promise.all(
    ENTREES.map(async (e) => {
      let articles: ResumeArticle[] = [];
      if (e.famille) {
        try {
          articles = await odoo.catalogue.listerArticles(e.famille.categorie);
        } catch {
          articles = []; // connecteur indisponible : liens fixes seulement
        }
      }
      const choisis = elements.filter((x) => x.entree === e.cle);
      const phares = choisis
        .filter((x) => x.type === "produit_phare" && x.defaultCode)
        .map((x) => articles.find((a) => a.reference === x.defaultCode))
        .filter((a): a is ResumeArticle => Boolean(a));
      const produitsPhares = (phares.length ? phares : articles.filter((a) => a.type === "equipement").slice(0, 3))
        .slice(0, 4)
        .map((a) => ({ libelle: a.nom, sousTitre: a.marque, href: cheminArticle(a.categorie, a.reference), prixHt: a.prixAPartirDeHt }));
      const liensRapides = choisis
        .filter((x) => x.type === "lien_rapide" && x.libelle && x.lien)
        .slice(0, 4)
        .map((x) => ({ libelle: x.libelle!, href: x.lien! }));
      return {
        cle: e.cle,
        libelle: e.libelle,
        href: e.href,
        sousCategories: e.famille ? sousCategoriesDeFamille(e.famille, articles) : (FIXES[e.cle] ?? []),
        produitsPhares,
        liensRapides,
      };
    }),
  );
}

export const lireNavigation = unstable_cache(construire, ["navigation"], {
  tags: [ETIQUETTES.catalogue, ETIQUETTES.contenus],
  revalidate: 300,
});
