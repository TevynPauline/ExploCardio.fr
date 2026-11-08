import copie from "./fixtures/copie-odoo20.json";
import { CORRESPONDANCE_PAR_DEFAUT } from "@/connecteurs/odoo/real/correspondance";
import { creerOdooReel } from "@/connecteurs/odoo/real";
import { fauxOdoo } from "./faux-odoo";

// Jeu de test du mode réel : réponses d'Odoo 20 enregistrées sur la copie (catalogue seul,
// aucune donnée personnelle), complétées des cas absents de la copie (T002).

type Ligne = Record<string, unknown> & { id: number };
const prop = (string: string, value: unknown, extra: Record<string, unknown> = {}) => ({ name: string, string, type: "char", value, ...extra });
const typeArticle = (v: string) => prop("Type d'article", v, { type: "selection", selection: [["eq", "Équipement"], ["co", "Consommable"], ["ac", "Accessoire"]] });

export function jeuOdoo() {
  const d = structuredClone(copie) as unknown as Record<string, Ligne[]>;
  const tpl = (id: number) => d["product.template"]!.find((t) => t.id === id)!;
  const variante = (code: string) => d["product.product"]!.find((v) => v.default_code === code)!;

  // DMS 300-4L : équipement complet, proposé en mise à disposition, un appareil en stock.
  tpl(7).product_properties = [
    prop("Marque", "DMS"),
    typeArticle("eq"),
    prop("Mise à disposition – premier mois HT", 89, { type: "float" }),
    prop("Mise à disposition – mois suivants HT", 69, { type: "float" }),
    prop("Valeur de remplacement HT", 1800, { type: "float" }),
  ];
  variante("DMS 300-4L4B").free_qty = 3;
  d["stock.lot"] = [{ id: 1, name: "SN-0001", product_id: [variante("DMS 300-4L5B").id, "x"], product_qty: 1 }];
  // DMS 300-3A : offre incomplète, pas d'appareil.
  tpl(1).product_properties = [prop("Marque", "DMS"), typeArticle("eq"), prop("Mise à disposition – premier mois HT", 79, { type: "float" })];
  // Brassard Orbit : accessoire à variantes, délai fournisseur 1 jour.
  tpl(11).product_properties = [prop("Marque", "SunTech"), typeArticle("ac")];
  // SaniCuff : consommable par lot de 100, sans TVA.
  tpl(13).product_properties = [prop("Marque", "SunTech"), typeArticle("co"), prop("Quantité par lot", 100, { type: "integer" })];
  tpl(13).taxes_id = [];
  // Oscar 2 : marque seule (type manquant). ULKE et l'adaptateur : aucune propriété.
  tpl(8).product_properties = [prop("Marque", "SunTech")];
  // Une variante du brassard sans référence, une autre en double.
  variante("98-0239-24").default_code = false;
  variante("98-0239-23").default_code = "98-0239-22";

  // Liste de prix « Clinique » (remise 10 %) et paliers sur la liste par défaut.
  d["product.pricelist"]!.push({ id: 2, name: "Clinique", sequence: 20, item_ids: [] });
  const regle = (r: Partial<Ligne> & { id: number }) => ({
    pricelist_id: [1, "Par défaut"], applied_on: "3_global", categ_id: false, product_tmpl_id: false, product_id: false, min_quantity: 0,
    date_start: false, date_end: false, compute_price: "fixed", base: "list_price", fixed_price: 0, price_discount: 0, price_surcharge: 0,
    price_round: 0, price_min_margin: 0, price_max_margin: 0, ...r,
  });
  d["product.pricelist.item"] = [
    regle({ id: 1, pricelist_id: [2, "Clinique"], compute_price: "discount", price_discount: 10 }),
    regle({ id: 2, applied_on: "1_product", product_tmpl_id: [11, "Brassard"], min_quantity: 5, fixed_price: 150 }),
    regle({ id: 3, pricelist_id: [2, "Clinique"], applied_on: "1_product", product_tmpl_id: [6, "ULKE"], compute_price: "markup" }),
  ];
  d["res.partner"] = [
    { id: 100, name: "Cabinet A", ref: "C-A", property_product_pricelist: [2, "Clinique"], l10n_fr_siret: "12345678900011", customer_rank: 1, is_company: true, active: true },
    { id: 101, name: "Cabinet B", ref: "C-B", property_product_pricelist: [1, "Par défaut"], l10n_fr_siret: "123 456 789 00011", customer_rank: 1, is_company: true, active: true },
    { id: 102, name: "Cabinet C", ref: false, property_product_pricelist: false, l10n_fr_siret: false, customer_rank: 1, is_company: true, active: true },
  ];
  d["ir.config_parameter"] = [{ id: 1, key: "database.is_neutralized", value: "True" }];
  return d;
}

const ENV = {
  ODOO_URL: "https://odoo.test",
  ODOO_DATABASE: "base-test",
  ODOO_USER: "site@test",
  ODOO_API_KEY: "cle-secrete-de-test-0123456789",
  ODOO_ENVIRONNEMENT: "recette",
};

export function odooReelDeTest(donnees = jeuOdoo()) {
  const faux = fauxOdoo(donnees);
  const odoo = creerOdooReel([], ENV, { fetch: faux.fetch, correspondance: async () => CORRESPONDANCE_PAR_DEFAUT });
  return { odoo, faux, donnees };
}
