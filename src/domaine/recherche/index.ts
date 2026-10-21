import { registre } from "@/connecteurs/registre";
import type { ReferenceArticle } from "@/connecteurs/odoo/interfaces";
import { cheminsDesFiches } from "../catalogue/lecture";
import { FAMILLES } from "../familles";
import { rechercherDans, type ResultatRecherche } from "./classer";
import { normaliserReference, normaliserTexte } from "./normaliser";

// Index de recherche en mémoire du serveur (R4) : un cache reconstruit au plus toutes les
// 5 minutes à partir du connecteur Odoo et des pages du site ; jamais une copie durable.

export type TypeGroupe = "produits" | "consommables" | "services" | "tutoriels" | "faq";

export type ElementIndex = {
  code: string;
  article: string;
  groupe: TypeGroupe;
  titre: string;
  titreNormalise: string;
  sousTitre: string;
  texte: string;
  references: string[];
  destination: string;
  prixHt: number | null;
};

const GROUPE_PAR_TYPE: Record<ReferenceArticle["type"], TypeGroupe> = {
  equipement: "produits",
  logiciel: "produits",
  consommable: "consommables",
  accessoire: "consommables",
  service: "services",
};

/** Pages du site trouvables par la recherche (services et familles). */
const PAGES: { titre: string; sousTitre: string; destination: string; motsCles: string }[] = [
  ...Object.values(FAMILLES).map((f) => ({ titre: f.libelle, sousTitre: "Famille de produits", destination: f.chemin, motsCles: "catalogue" })),
  { titre: "Hébergement des données de santé", sousTitre: "Service · en préparation", destination: "/services/hebergement-donnees-sante", motsCles: "hds cloud logiciel plateforme" },
  { titre: "Assistance et service", sousTitre: "Service", destination: "/services/assistance", motsCles: "hotline aide sav whatsapp fidelite bons d'achat" },
  { titre: "Financement", sousTitre: "Service", destination: "/financement", motsCles: "leasing credit mensualite" },
  { titre: "Installation et formation", sousTitre: "Service", destination: "/services/installation-formation", motsCles: "installation formation parametrage mise en service" },
  { titre: "Mise à disposition", sousTitre: "Service", destination: "/mise-a-disposition", motsCles: "location louer mois depannage express" },
  { titre: "Qui sommes-nous / Contact", sousTitre: "ExploCardio.fr", destination: "/qui-sommes-nous", motsCles: "contact equipe telephone email" },
];

/**
 * Éléments de l'index : seules les variantes d'un article publié (F03, US6-3), qui mènent à sa
 * fiche (`chemins` : référence de variante → adresse de la fiche).
 */
export type ElementAide = { slug: string; type: "video" | "mode_emploi" | "notice" | "faq"; titre: string; resume: string; texte: string; references: string[] };

export function construireElements(references: ReferenceArticle[], chemins: Map<string, string>, aide: ElementAide[] = []): ElementIndex[] {
  const articles: ElementIndex[] = references.filter((r) => chemins.has(r.defaultCode)).map((r) => {
    const titre = r.configuration ? `${r.nom} — ${r.configuration}` : r.nom;
    return {
      code: r.defaultCode,
      article: r.referenceArticle,
      groupe: GROUPE_PAR_TYPE[r.type],
      titre,
      titreNormalise: normaliserTexte(titre),
      sousTitre: [r.marque, r.referenceFabricant ? `réf. ${r.referenceFabricant}` : null].filter(Boolean).join(" · "),
      texte: normaliserTexte([r.nom, r.marque, r.configuration, r.defaultCode, r.referenceFabricant].filter(Boolean).join(" ")),
      references: [r.defaultCode, r.referenceFabricant].filter((x): x is string => Boolean(x)).map(normaliserReference),
      // La fiche s'ouvre sur la configuration trouvée (F03, US2-8).
      destination: r.defaultCode === r.referenceArticle ? chemins.get(r.defaultCode)! : `${chemins.get(r.defaultCode)!}?config=${encodeURIComponent(r.defaultCode)}`,
      prixHt: r.prixHt,
    };
  });
  const pages: ElementIndex[] = PAGES.map((p) => ({
    code: p.destination,
    article: p.destination,
    groupe: "services",
    titre: p.titre,
    titreNormalise: normaliserTexte(p.titre),
    sousTitre: p.sousTitre,
    texte: normaliserTexte(`${p.titre} ${p.motsCles}`),
    references: [],
    destination: p.destination,
    prixHt: null,
  }));
  // F09 : contenus publiés du centre d'aide (groupes Tutoriels et Questions fréquentes).
  const contenusAide: ElementIndex[] = aide.map((a) => ({
    code: `aide:${a.slug}`,
    article: `aide:${a.slug}`,
    groupe: a.type === "faq" ? "faq" : "tutoriels",
    titre: a.titre,
    titreNormalise: normaliserTexte(a.titre),
    sousTitre: a.type === "faq" ? "Question fréquente" : a.type === "video" ? "Tutoriel vidéo" : a.type === "notice" ? "Notice" : "Mode d’emploi",
    texte: normaliserTexte(`${a.titre} ${a.resume} ${a.texte}`),
    references: a.references.map(normaliserReference),
    destination: a.type === "faq" ? `/aide?q=${encodeURIComponent(a.titre)}` : `/aide/${a.slug}`,
    prixHt: null,
  }));
  return [...articles, ...pages, ...contenusAide];
}

async function contenusAideIndexes(): Promise<ElementAide[]> {
  const { contenusPublies, etapesDe } = await import("../aide/lecture");
  return (await contenusPublies({}, true)).map((c) => ({
    slug: c.slug,
    type: c.type,
    titre: c.titre,
    resume: c.resume,
    texte: [c.reponse, c.transcription, ...etapesDe(c).map((e) => e.texte)].filter(Boolean).join(" "),
    references: c.references,
  }));
}

const DUREE_MS = 5 * 60_000;
const globale = globalThis as unknown as { __indexRecherche?: { elements: ElementIndex[]; construitLe: number } };

/** Oublie l'index (après une modification de l'écran de démonstration). */
export function invaliderIndexRecherche() {
  globale.__indexRecherche = undefined;
}

async function index(): Promise<ElementIndex[] | null> {
  const actuel = globale.__indexRecherche;
  if (actuel && Date.now() - actuel.construitLe < DUREE_MS) return actuel.elements;
  try {
    const [references, chemins, aide] = await Promise.all([registre.odoo().catalogue.listerReferences(), cheminsDesFiches(), contenusAideIndexes().catch(() => [])]);
    // Catalogue illisible (connecteur injoignable) : on garde l'ancien index s'il existe.
    if (chemins.size === 0 && actuel) return actuel.elements;
    const elements = construireElements(references, chemins, aide);
    globale.__indexRecherche = { elements, construitLe: Date.now() };
    return elements;
  } catch {
    // Connecteur indisponible : on garde l'ancien index s'il existe (R4).
    return actuel?.elements ?? null;
  }
}

export async function rechercher(
  saisie: string,
  options?: { maxParGroupe?: number },
): Promise<ResultatRecherche & { indisponible: boolean }> {
  const elements = await index();
  if (!elements) return { requete: saisie, groupes: [], indisponible: true };
  return { ...rechercherDans(elements, saisie, options), indisponible: false };
}
