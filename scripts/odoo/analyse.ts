// Analyse des produits lus dans Odoo (test de connexion) : ce dont le site a besoin pour afficher
// le catalogue (F03), vendre (F04), louer (F05) et calculer la fidélité (F06). Fonctions pures,
// testées dans tests/unit/sonde-odoo.test.ts.

export type ProduitOdoo = {
  id: number;
  nom: string;
  reference: string | null;
  prixVente: number;
  categorie: string | null;
  /** « bien », « service », « combo » ou inconnu. */
  nature: "bien" | "service" | "combo" | "inconnue";
  /** Suivi du stock (article stockable). null : information absente. */
  stocke: boolean | null;
  quantite: number | null;
  vendable: boolean;
  unite: string | null;
  /** Prix saisi TTC (taxe « incluse dans le prix ») : le site affiche et calcule en HT. */
  taxesIncluses: boolean;
  tauxTaxes: number[];
  modeleId: number | null;
  nbVariantesDuModele: number;
  description: boolean;
};

export type Ecart = { gravite: "bloquant" | "a_corriger" | "information"; sujet: string; detail: string; produits: string[] };

const libelle = (p: ProduitOdoo) => `${p.reference ?? "(sans référence)"} — ${p.nom}`;
const MAX_EXEMPLES = 15;

function ecart(gravite: Ecart["gravite"], sujet: string, detail: string, produits: ProduitOdoo[]): Ecart[] {
  return produits.length ? [{ gravite, sujet, detail, produits: produits.map(libelle) }] : [];
}

export function analyserProduits(produits: ProduitOdoo[], referencesDuSite: string[] = []): { ecarts: Ecart[]; correspondances: string[] } {
  const parReference = new Map<string, ProduitOdoo[]>();
  for (const p of produits) if (p.reference) parReference.set(p.reference, [...(parReference.get(p.reference) ?? []), p]);
  const doublons = [...parReference.values()].filter((l) => l.length > 1).flat();
  const biens = produits.filter((p) => p.nature === "bien");

  const ecarts: Ecart[] = [
    ...ecart("bloquant", "Référence interne manquante", "Le site retrouve chaque article par sa référence interne (default_code) : elle est obligatoire et stable.", produits.filter((p) => !p.reference?.trim())),
    ...ecart("bloquant", "Référence interne en double", "Deux variantes ne peuvent pas partager la même référence interne.", doublons),
    ...ecart("bloquant", "Prix de vente à 0", "Le site affiche un prix HT pour chaque modèle standard (pas de « prix sur demande »).", produits.filter((p) => p.vendable && p.prixVente <= 0 && p.nature !== "combo")),
    ...ecart("a_corriger", "Prix saisi TTC", "La taxe est « incluse dans le prix » : le site affiche et calcule en HT, les prix doivent être saisis HT.", produits.filter((p) => p.taxesIncluses)),
    ...ecart("a_corriger", "Aucune taxe de vente", "Sans taxe, le site ne peut pas afficher le prix TTC ni facturer la TVA.", produits.filter((p) => p.vendable && p.tauxTaxes.length === 0)),
    ...ecart("a_corriger", "Stock non suivi", "Pour annoncer « en stock », « délai » ou « rupture », le matériel et les consommables doivent suivre le stock.", biens.filter((p) => p.stocke === false)),
    ...ecart("a_corriger", "Sans catégorie spécifique", "La catégorie permet de ranger l'article (Holter ECG, MAPA, effort, ECG de repos, accessoires et consommables).", produits.filter((p) => !p.categorie || /^all(\b|$)|^tous|^toutes/i.test(p.categorie))),
    ...ecart("information", "Non vendable", "Article marqué « ne peut pas être vendu » : il n'apparaîtra pas sur le site.", produits.filter((p) => !p.vendable)),
    ...ecart("information", "Sans description de vente", "Le texte de la fiche vient du back-office du site ; la description d'Odoo sert aux devis et factures.", produits.filter((p) => p.vendable && !p.description)),
  ];

  const references = new Set(produits.map((p) => p.reference).filter(Boolean));
  return { ecarts, correspondances: referencesDuSite.filter((r) => references.has(r)) };
}

export function rapportMarkdown(contexte: {
  date: Date;
  url: string;
  base: string;
  version: string;
  totalVariantes: number;
  totalModeles: number;
  produits: ProduitOdoo[];
  categories: { nom: string; nombre: number }[];
  modules: { nom: string; present: boolean }[] | null;
  autres: { sujet: string; valeur: string }[];
  referencesDuSite: string[];
}): string {
  const { ecarts, correspondances } = analyserProduits(contexte.produits, contexte.referencesDuSite);
  const l: string[] = [];
  l.push(`# Test de connexion à Odoo — ${contexte.date.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`, "");
  l.push(`- Odoo : ${contexte.url} — base « ${contexte.base} » — version ${contexte.version}`);
  l.push(`- Produits : ${contexte.totalModeles} modèles, ${contexte.totalVariantes} variantes (${contexte.produits.length} analysées)`);
  l.push(`- Lecture seule : aucune donnée n'a été écrite dans Odoo.`, "");

  l.push("## Écarts avec ce dont le site a besoin", "");
  if (!ecarts.length) l.push("Aucun écart relevé sur les produits analysés.", "");
  const titres = { bloquant: "Bloquant", a_corriger: "À corriger", information: "Pour information" } as const;
  for (const e of ecarts) {
    l.push(`### ${titres[e.gravite]} : ${e.sujet} (${e.produits.length})`, "", e.detail, "");
    for (const p of e.produits.slice(0, MAX_EXEMPLES)) l.push(`- ${p}`);
    if (e.produits.length > MAX_EXEMPLES) l.push(`- … et ${e.produits.length - MAX_EXEMPLES} autres`);
    l.push("");
  }

  l.push("## Catégories", "");
  for (const c of contexte.categories) l.push(`- ${c.nom} : ${c.nombre}`);
  l.push("");

  if (contexte.modules) {
    l.push("## Applications Odoo utiles au site", "");
    for (const m of contexte.modules) l.push(`- ${m.present ? "✅" : "❌"} ${m.nom}`);
    l.push("");
  }
  if (contexte.autres.length) {
    l.push("## Autres lectures", "");
    for (const a of contexte.autres) l.push(`- ${a.sujet} : ${a.valeur}`);
    l.push("");
  }

  l.push("## Références de la base de démonstration retrouvées dans Odoo", "");
  l.push(
    correspondances.length
      ? `${correspondances.length} sur ${contexte.referencesDuSite.length} : ${correspondances.join(", ")}`
      : `Aucune (les références de démonstration « EC-… » sont provisoires ; il faudra convenir avec Régis des références définitives).`,
    "",
  );

  l.push("## Aperçu des produits", "", "| Référence | Nom | Prix de vente | Nature | Stock | Catégorie |", "|---|---|---|---|---|---|");
  for (const p of contexte.produits.slice(0, 40)) {
    const stock = p.stocke === false ? "non suivi" : p.quantite === null ? "?" : String(p.quantite);
    l.push(`| ${p.reference ?? "—"} | ${p.nom.replace(/\|/g, "/")} | ${p.prixVente.toFixed(2)}${p.taxesIncluses ? " TTC" : ""} | ${p.nature} | ${stock} | ${p.categorie ?? "—"} |`);
  }
  if (contexte.produits.length > 40) l.push("", `… ${contexte.produits.length - 40} autres variantes non affichées.`);
  l.push("");
  return l.join("\n");
}
