import type { Anomalie, EtatDisponibilite, OffreMiseADisposition, TypeArticle } from "../interfaces";
import { idDe, texteDe, type ClientOdoo, type Enregistrement } from "./client";
import { rubriqueDe, type CodeRubrique, type Correspondance } from "./correspondance";
import { normaliser } from "./normaliser";
import { CHAMPS_REGLE, regleNonGeree, type Cible, type RegleOdoo } from "./prix";
import { lireProprietes } from "./proprietes";

// Instantané du catalogue d'Odoo (F14, lot 1) : une lecture groupée en quelques `search_read`,
// assemblée en articles et variantes, avec les anomalies du rapport de contrôle. Gardé en
// mémoire une minute ; le domaine du site ajoute son propre cache de 5 minutes.

export type VarianteLue = {
  id: number;
  defaultCode: string;
  referenceFabricant: string | null;
  configuration: string | null;
  attributs: Record<string, string>;
  prixHt: number;
  quantiteLibre: number;
  achat: EtatDisponibilite;
  delaiReassortJours: number | null;
  cible: Cible;
};

export type ModeleLu = {
  id: number;
  nom: string;
  categorie: CodeRubrique;
  marque: string;
  type: TypeArticle;
  description: string | null;
  tauxTva: number;
  suiviNumeroSerie: boolean;
  eligibleBonsAchat: boolean;
  quantiteParLot: number;
  offre: OffreMiseADisposition | null;
  /** Mise à disposition : un appareil (numéro de série) libre en stock. */
  appareilLibre: boolean;
  /** Variantes affichables, dans l'ordre d'Odoo. */
  variantes: VarianteLue[];
};

export type Instantane = {
  modeles: ModeleLu[];
  parReference: Map<string, { modele: ModeleLu; variante: VarianteLue }>;
  regles: RegleOdoo[];
  listeParDefaut: number | null;
  anomalies: Anomalie[];
};

type Template = Enregistrement & {
  name: string;
  categ_id: unknown;
  tracking: string | false;
  description_sale: string | false;
  taxes_id: number[];
  product_properties: unknown;
  product_variant_ids: number[];
};
type Variant = Enregistrement & {
  product_tmpl_id: unknown;
  default_code: string | false;
  barcode: string | false;
  lst_price: number;
  free_qty: number;
  product_template_attribute_value_ids: number[];
};

const CHAMPS_TEMPLATE = ["name", "categ_id", "tracking", "description_sale", "taxes_id", "product_properties", "product_variant_ids"];
const CHAMPS_VARIANTE = ["product_tmpl_id", "default_code", "barcode", "lst_price", "free_qty", "product_template_attribute_value_ids"];

async function lire(client: ClientOdoo) {
  const entrepots = await client.searchRead("stock.warehouse", [["code", "=", "WH"]], ["id"], { limite: 1 });
  const contexte = entrepots[0] ? { warehouse_id: entrepots[0].id } : {};
  const [categories, templates, taxes, listes] = await Promise.all([
    client.searchRead<Enregistrement & { complete_name: string; parent_id: unknown }>("product.category", [], ["complete_name", "parent_id"]),
    client.searchRead<Template>("product.template", [["sale_ok", "=", true], ["active", "=", true]], CHAMPS_TEMPLATE),
    client.searchRead<Enregistrement & { amount: number; amount_type: string; price_include: boolean }>("account.tax", [["type_tax_use", "=", "sale"]], ["amount", "amount_type", "price_include"]),
    client.searchRead<Enregistrement & { sequence: number }>("product.pricelist", [], ["sequence"], { ordre: "sequence, id" }),
  ]);
  const idsModeles = templates.map((t) => t.id);
  const [variantes, fournisseurs, regles] = await Promise.all([
    client.searchRead<Variant>("product.product", [["product_tmpl_id", "in", idsModeles], ["active", "=", true]], CHAMPS_VARIANTE, { contexte }),
    client.searchRead<Enregistrement & { product_tmpl_id: unknown; product_id: unknown; product_code: string | false; delay: number; sequence: number }>(
      "product.supplierinfo",
      [["product_tmpl_id", "in", idsModeles]],
      ["product_tmpl_id", "product_id", "product_code", "delay", "sequence"],
      { ordre: "sequence, id" },
    ),
    client.searchRead<RegleOdoo>("product.pricelist.item", [], CHAMPS_REGLE),
  ]);
  const idsValeurs = [...new Set(variantes.flatMap((v) => v.product_template_attribute_value_ids))];
  // Numéros de série : seulement pour les modèles suivis par numéro de série (filtre direct sur
  // les variantes, bien plus rapide qu'un filtre sur le modèle).
  const suivis = new Set(templates.filter((t) => t.tracking === "serial").map((t) => t.id));
  const idsSuivies = variantes.filter((v) => suivis.has(idDe(v.product_tmpl_id) ?? -1)).map((v) => v.id);
  const [valeurs, lots] = await Promise.all([
    client.read<Enregistrement & { name: string; attribute_id: unknown }>("product.template.attribute.value", idsValeurs, ["name", "attribute_id"]),
    idsSuivies.length
      ? client.searchRead<Enregistrement & { product_id: unknown; product_qty: number }>("stock.lot", [["product_id", "in", idsSuivies]], ["product_id", "product_qty"])
      : Promise.resolve([]),
  ]);
  return { categories, templates, taxes, listes, variantes, fournisseurs, regles, lots, valeurs };
}

type Lu = Awaited<ReturnType<typeof lire>>;

export function assembler(lu: Lu, correspondance: Correspondance): Instantane {
  const anomalies: Anomalie[] = [];
  const categorie = new Map(lu.categories.map((c) => [c.id, c]));
  const chaine = (id: number | null) => {
    const ids: number[] = [];
    for (let c = id; c !== null && !ids.includes(c); c = idDe(categorie.get(c)?.parent_id)) ids.push(c);
    return ids;
  };
  const taxe = new Map(lu.taxes.map((t) => [t.id, t]));
  const valeur = new Map(lu.valeurs.map((v) => [v.id, v]));
  const listeParDefaut = lu.listes[0]?.id ?? null;

  // Références en double parmi toutes les variantes vendables.
  const compte = new Map<string, number>();
  for (const v of lu.variantes) {
    const code = texteDe(v.default_code);
    if (code) compte.set(code, (compte.get(code) ?? 0) + 1);
  }

  const categoriesNonReliees = new Map<string, number>();
  const modeles: ModeleLu[] = [];
  for (const t of lu.templates) {
    const variantesDuModele = t.product_variant_ids
      .map((id) => lu.variantes.find((v) => v.id === id))
      .filter((v): v is Variant => Boolean(v));
    const codes = variantesDuModele.map((v) => texteDe(v.default_code)).filter((c): c is string => Boolean(c));
    const idCategorie = idDe(t.categ_id);
    const chemin = categorie.get(idCategorie ?? -1)?.complete_name ?? "";
    const rubrique = chemin ? rubriqueDe(chemin, correspondance) : null;
    // Produit sans aucune référence hors des rubriques (cartes cadeaux, porte-monnaie) : pas un
    // produit du site, ignoré sans anomalie.
    if (!rubrique && !codes.length) continue;
    const reference = codes[0] ?? `modèle ${t.id}`;
    const nom = t.name;
    const signaler = (a: Omit<Anomalie, "nom" | "objet" | "reference"> & Partial<Pick<Anomalie, "objet" | "reference" | "nom">>) =>
      anomalies.push({ objet: "article", reference, nom, ...a });

    if (!rubrique) {
      categoriesNonReliees.set(chemin || "(sans catégorie)", (categoriesNonReliees.get(chemin || "(sans catégorie)") ?? 0) + 1);
      continue;
    }
    const proprietes = lireProprietes(t.product_properties);
    let bloque = false;
    const bloquer = (a: Parameters<typeof signaler>[0]) => {
      bloque = true;
      signaler(a);
    };
    if (!proprietes.marque) bloquer({ code: "PROPRIETE_MANQUANTE", detail: "Marque", bloquant: true });
    if (!proprietes.type) bloquer({ code: "PROPRIETE_MANQUANTE", detail: "Type d'article", bloquant: true });
    if (proprietes.offreIncomplete) {
      signaler({ code: "OFFRE_INCOMPLETE", detail: "premier mois, mois suivants et valeur de remplacement sont tous nécessaires", bloquant: false });
    }
    const taxesVente = t.taxes_id.map((id) => taxe.get(id)).filter((x): x is NonNullable<typeof x> => Boolean(x) && x!.amount_type === "percent" && !x!.price_include);
    if (!taxesVente.length) bloquer({ code: "SANS_TVA", detail: null, bloquant: true });

    const variantesLues: VarianteLue[] = [];
    for (const v of variantesDuModele) {
      const code = texteDe(v.default_code);
      const attributs = Object.fromEntries(
        v.product_template_attribute_value_ids
          .map((id) => valeur.get(id))
          .filter((x): x is NonNullable<typeof x> => Boolean(x))
          .map((x) => [Array.isArray(x.attribute_id) ? String(x.attribute_id[1]) : "", x.name]),
      );
      const configuration = Object.values(attributs).join(", ") || null;
      const libelle = configuration ? `${nom} (${configuration})` : nom;
      if (!code) {
        anomalies.push({ objet: "variante", reference: `variante ${v.id}`, nom: libelle, code: "SANS_REFERENCE", detail: null, bloquant: true });
        continue;
      }
      if ((compte.get(code) ?? 0) > 1) {
        anomalies.push({ objet: "variante", reference: code, nom: libelle, code: "REFERENCE_EN_DOUBLE", detail: null, bloquant: true });
        continue;
      }
      if (!(v.lst_price > 0)) {
        anomalies.push({ objet: "variante", reference: code, nom: libelle, code: "SANS_PRIX", detail: null, bloquant: true });
        continue;
      }
      const fournisseur =
        lu.fournisseurs.find((f) => idDe(f.product_id) === v.id) ?? lu.fournisseurs.find((f) => idDe(f.product_tmpl_id) === t.id && !idDe(f.product_id));
      const delai = fournisseur && fournisseur.delay > 0 ? fournisseur.delay : null;
      const libre = Math.max(0, Math.floor(v.free_qty ?? 0));
      variantesLues.push({
        id: v.id,
        defaultCode: code,
        referenceFabricant: texteDe(fournisseur?.product_code) ?? texteDe(v.barcode),
        configuration,
        attributs,
        prixHt: Math.round(v.lst_price * 100),
        quantiteLibre: libre,
        achat: libre > 0 ? { etat: "disponible" } : delai ? { etat: "delai", delaiJours: delai } : { etat: "indisponible" },
        delaiReassortJours: delai,
        cible: { varianteId: v.id, modeleId: t.id, categories: chaine(idCategorie), prixVente: v.lst_price },
      });
    }

    const suiviNumeroSerie = t.tracking === "serial";
    const ids = new Set(variantesDuModele.map((v) => v.id));
    const appareilLibre = lu.lots.some((l) => ids.has(idDe(l.product_id) ?? -1) && l.product_qty > 0);
    if (proprietes.offre && suiviNumeroSerie && !appareilLibre) {
      signaler({ code: "SANS_NUMERO_SERIE", detail: "aucun appareil du parc en stock", bloquant: false });
    }
    if (bloque || !variantesLues.length) continue;
    modeles.push({
      id: t.id,
      nom,
      categorie: rubrique,
      marque: proprietes.marque!,
      type: proprietes.type!,
      description: texteDe(t.description_sale),
      tauxTva: taxesVente.reduce((s, x) => s + x.amount, 0),
      suiviNumeroSerie,
      eligibleBonsAchat: proprietes.eligibleBonsAchat,
      quantiteParLot: proprietes.quantiteParLot,
      offre: proprietes.offre,
      appareilLibre,
      variantes: variantesLues,
    });
  }

  for (const [chemin, n] of categoriesNonReliees) {
    anomalies.push({ objet: "categorie", reference: chemin, nom: chemin, code: "CATEGORIE_NON_RELIEE", detail: `${n} produit${n > 1 ? "s" : ""} à vendre`, bloquant: true });
  }
  for (const r of lu.regles) {
    const motif = regleNonGeree(r);
    if (motif) {
      const liste = Array.isArray(r.pricelist_id) ? String(r.pricelist_id[1]) : "liste de prix";
      anomalies.push({ objet: "regle_prix", reference: `${liste} · règle ${r.id}`, nom: liste, code: "REGLE_PRIX_NON_GEREE", detail: motif, bloquant: false });
    }
  }

  const parReference = new Map<string, { modele: ModeleLu; variante: VarianteLue }>();
  for (const m of modeles) for (const v of m.variantes) parReference.set(v.defaultCode, { modele: m, variante: v });
  return { modeles, parReference, regles: lu.regles, listeParDefaut, anomalies };
}

const DUREE_MEMOIRE_MS = 60_000;

/** Lecture de l'instantané, gardé une minute (une seule lecture à la fois). */
export function creerLecteurInstantane(client: ClientOdoo, correspondance: () => Promise<Correspondance>) {
  let courant: { quand: number; valeur: Promise<Instantane> } | null = null;
  return function instantane(): Promise<Instantane> {
    if (courant && Date.now() - courant.quand < DUREE_MEMOIRE_MS) return courant.valeur;
    const valeur = Promise.all([lire(client), correspondance()]).then(([lu, c]) => assembler(lu, c));
    courant = { quand: Date.now(), valeur };
    valeur.catch(() => {
      if (courant?.valeur === valeur) courant = null;
    });
    return valeur;
  };
}

/** Recherche insensible à la casse et aux accents. */
export function correspond(m: ModeleLu, texte: string): boolean {
  const t = normaliser(texte);
  if (!t) return false;
  const champs = [m.nom, m.marque, ...m.variantes.flatMap((v) => [v.defaultCode, v.referenceFabricant ?? ""])];
  return champs.some((c) => normaliser(c).includes(t));
}
