import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import nextEnv from "@next/env";
import { rapportMarkdown, type ProduitOdoo } from "./odoo/analyse";
import { accesDepuisEnvironnement, creerClientLecture, ErreurOdoo, type ClientLecture } from "./odoo/client-lecture";

// `npm run odoo:sonder` — test de connexion à l'Odoo réel, en LECTURE SEULE : version, connexion,
// produits, catégories, taxes, applications installées ; rapport des écarts avec ce dont le site
// a besoin, dans rapports-odoo/ (non versionné). Aucune écriture dans Odoo, aucune donnée
// fictive envoyée. Identifiants dans .env.local seulement (ODOO_URL, ODOO_DATABASE, ODOO_USER,
// ODOO_API_KEY). Option : --limite=N (variantes analysées, 2 000 par défaut).

nextEnv.loadEnvConfig(process.cwd(), true);

const MODULES_UTILES: [string, string][] = [
  ["sale_management", "Ventes"],
  ["stock", "Inventaire (stock)"],
  ["account", "Facturation"],
  ["loyalty", "Fidélité, promotions et codes promo"],
  ["sale_subscription", "Abonnements (mises à disposition mensuelles)"],
  ["sale_renting", "Location"],
  ["product_expiry", "Dates de péremption"],
  ["stock_account", "Valorisation du stock"],
];

type Champs = Record<string, { type: string }>;
type Brut = Record<string, unknown>;

const nomDe = (v: unknown) => (Array.isArray(v) && typeof v[1] === "string" ? v[1] : null);
const idDe = (v: unknown) => (Array.isArray(v) && typeof v[0] === "number" ? v[0] : null);

async function essayer<T>(promesse: Promise<T>): Promise<T | null> {
  try {
    return await promesse;
  } catch (e) {
    if (e instanceof ErreurOdoo) return null; // droits insuffisants ou application absente
    throw e;
  }
}

async function lireProduits(odoo: ClientLecture, limite: number): Promise<ProduitOdoo[]> {
  const champs = await odoo.lire<Champs>("product.product", "fields_get", [], { attributes: ["type"] });
  const voulus = ["display_name", "default_code", "lst_price", "categ_id", "type", "detailed_type", "is_storable", "qty_available", "sale_ok", "uom_id", "taxes_id", "product_tmpl_id", "description_sale"];
  const presents = voulus.filter((c) => c in champs);
  const lignes = await odoo.lire<Brut[]>("product.product", "search_read", [[]], { fields: presents, limit: limite, order: "default_code, id" });

  const idsTaxes = [...new Set(lignes.flatMap((l) => (Array.isArray(l.taxes_id) ? (l.taxes_id as number[]) : [])))];
  const taxes = idsTaxes.length
    ? ((await essayer(odoo.lire<Brut[]>("account.tax", "read", [idsTaxes], { fields: ["amount", "price_include"] }))) ?? [])
    : [];
  const variantesParModele = new Map<number, number>();
  for (const l of lignes) {
    const m = idDe(l.product_tmpl_id);
    if (m !== null) variantesParModele.set(m, (variantesParModele.get(m) ?? 0) + 1);
  }

  return lignes.map((l): ProduitOdoo => {
    const type = String(l.type ?? "");
    const detaille = typeof l.detailed_type === "string" ? l.detailed_type : null;
    const stocke = typeof l.is_storable === "boolean" ? l.is_storable : detaille ? detaille === "product" : type ? type === "product" : null;
    const sesTaxes = taxes.filter((t) => Array.isArray(l.taxes_id) && (l.taxes_id as number[]).includes(t.id as number));
    const modeleId = idDe(l.product_tmpl_id);
    return {
      id: l.id as number,
      nom: String(l.display_name ?? ""),
      reference: typeof l.default_code === "string" && l.default_code ? l.default_code : null,
      prixVente: Number(l.lst_price ?? 0),
      categorie: nomDe(l.categ_id),
      nature: type === "service" || detaille === "service" ? "service" : type === "combo" ? "combo" : type ? "bien" : "inconnue",
      stocke,
      quantite: typeof l.qty_available === "number" ? l.qty_available : null,
      vendable: l.sale_ok !== false,
      unite: nomDe(l.uom_id),
      taxesIncluses: sesTaxes.some((t) => t.price_include === true),
      tauxTaxes: sesTaxes.map((t) => Number(t.amount)),
      modeleId,
      nbVariantesDuModele: modeleId !== null ? (variantesParModele.get(modeleId) ?? 1) : 1,
      description: typeof l.description_sale === "string" && l.description_sale.trim().length > 0,
    };
  });
}

async function principal() {
  const limite = Number(process.argv.find((a) => a.startsWith("--limite="))?.split("=")[1] ?? 2000);
  const acces = accesDepuisEnvironnement(process.env);
  const odoo = creerClientLecture(acces);

  console.log(`→ Odoo : ${acces.url} (base « ${acces.base} »)`);
  const version = await odoo.version();
  console.log(`✓ Joignable — version ${version.server_version ?? "inconnue"}`);
  await odoo.connecter();
  console.log(`✓ Connexion acceptée pour ${acces.utilisateur}`);

  const [totalVariantes, totalModeles] = await Promise.all([
    odoo.lire<number>("product.product", "search_count", [[]]),
    odoo.lire<number>("product.template", "search_count", [[]]),
  ]);
  const produits = await lireProduits(odoo, limite);
  console.log(`✓ Produits lus : ${totalModeles} modèles, ${totalVariantes} variantes (${produits.length} analysées)`);

  const categoriesBrutes = (await essayer(odoo.lire<Brut[]>("product.category", "search_read", [[]], { fields: ["complete_name", "product_count"], order: "complete_name" }))) ?? [];
  const categories = categoriesBrutes.map((c) => ({ nom: String(c.complete_name), nombre: Number(c.product_count ?? 0) }));

  const modulesBruts = await essayer(odoo.lire<Brut[]>("ir.module.module", "search_read", [[["name", "in", MODULES_UTILES.map(([n]) => n)]]], { fields: ["name", "state"] }));
  const modules = modulesBruts ? MODULES_UTILES.map(([n, nom]) => ({ nom, present: modulesBruts.some((m) => m.name === n && m.state === "installed") })) : null;

  const autres: { sujet: string; valeur: string }[] = [];
  const listes = await essayer(odoo.lire<number>("product.pricelist", "search_count", [[]]));
  if (listes !== null) autres.push({ sujet: "Listes de prix", valeur: String(listes) });
  const programmes = await essayer(odoo.lire<Brut[]>("loyalty.program", "search_read", [[]], { fields: ["name", "program_type"] }));
  if (programmes) autres.push({ sujet: "Programmes de fidélité et promotions", valeur: programmes.length ? programmes.map((p) => `${p.name} (${p.program_type})`).join(" ; ") : "aucun" });
  const entrepots = await essayer(odoo.lire<number>("stock.warehouse", "search_count", [[]]));
  if (entrepots !== null) autres.push({ sujet: "Entrepôts", valeur: String(entrepots) });

  let referencesDuSite: string[] = [];
  try {
    const { MODELES } = await import("../prisma/demo/seed/catalogue");
    referencesDuSite = MODELES.flatMap((m) => m.variantes.map((v) => v.defaultCode));
  } catch {
    // base de démonstration indisponible : la comparaison est simplement omise
  }

  const date = new Date();
  const rapport = rapportMarkdown({
    date,
    url: acces.url,
    base: acces.base,
    version: version.server_version ?? "inconnue",
    totalVariantes,
    totalModeles,
    produits,
    categories,
    modules,
    autres,
    referencesDuSite,
  });
  const dossier = join(process.cwd(), "rapports-odoo");
  mkdirSync(dossier, { recursive: true });
  const fichier = join(dossier, `sonde-${date.toISOString().slice(0, 16).replace(/[:T]/g, "-")}.md`);
  writeFileSync(fichier, rapport);
  console.log(`✓ Rapport : ${fichier}`);
}

principal()
  .then(() => process.exit(0))
  .catch((e: unknown) => {
    console.error(`\n✖ ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
