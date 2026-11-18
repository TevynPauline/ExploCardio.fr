import { describe, expect, it } from "vitest";
import { CORRESPONDANCE_PAR_DEFAUT } from "@/connecteurs/odoo/real/correspondance";
import { creerOdooReel } from "@/connecteurs/odoo/real";
import { stockageMemoire } from "@/connecteurs/odoo/real/ecritures";
import { CLE_TEST, fauxOdoo } from "./faux-odoo";
import { jeuOdoo } from "./jeu-odoo";

// F14 lot 3 : panier, commandes et devis enregistrés en mode réel (plan-lots-2-3.md D4-D7).
// Le faux Odoo calcule taxes et totaux des commandes comme Odoo 20 (vérifié sur la copie).

type Ligne = Record<string, unknown> & { id: number };

const ENV = { ODOO_URL: "https://odoo.test", ODOO_DATABASE: "copie-test", ODOO_USER: "site@test", ODOO_API_KEY: CLE_TEST, ODOO_ENVIRONNEMENT: "recette" };

function monter(options: { livraison?: boolean; franco?: number } = {}) {
  const d = jeuOdoo() as Record<string, Ligne[]>;
  if (options.livraison !== false) {
    d["product.template"]!.push({
      id: 50, name: "Livraison", categ_id: [3, "Services"], tracking: "none", description_sale: false, taxes_id: [30], product_variant_ids: [90],
      product_properties: options.franco ? [{ string: "Seuil de franco HT", type: "float", value: options.franco }] : [],
    });
    d["product.product"]!.push({ id: 90, product_tmpl_id: [50, "Livraison"], default_code: "LIVRAISON", barcode: false, lst_price: 15, free_qty: 0, product_template_attribute_value_ids: [] });
  }
  // ULKE : produit volumineux avec frais de livraison et d'installation.
  const ulke = d["product.template"]!.find((t) => t.id === 6)!;
  ulke.product_properties = [
    { string: "Marque", type: "char", value: "ULKE" },
    { string: "Type d'article", type: "selection", value: "eq", selection: [["eq", "Équipement"]] },
    { string: "Frais de livraison HT", type: "float", value: 150 },
    { string: "Frais d'installation HT", type: "float", value: 80 },
  ];
  d["product.product"]!.find((v) => v.default_code === "ULKE")!.free_qty = 1;
  d["sale.order"] = [];
  d["sale.order.line"] = [];
  d["account.move"] = [];
  let numero = 0;
  const taux = (ids: unknown) => ((ids as number[]) ?? []).reduce((s, id) => s + Number(d["account.tax"]!.find((t) => t.id === id)?.amount ?? 0), 0);
  const recalculer = (v: Ligne) => {
    const lignes = d["sale.order.line"]!.filter((l) => (v.order_line as number[]).includes(l.id));
    const ht = lignes.reduce((s, l) => s + Math.round(Number(l.price_unit) * Number(l.product_uom_qty) * (1 - Number(l.discount ?? 0) / 100) * 100) / 100, 0);
    const tva = lignes.reduce((s, l) => s + (Math.round(Number(l.price_unit) * Number(l.product_uom_qty) * (1 - Number(l.discount ?? 0) / 100) * 100) / 100) * taux(l.tax_ids) / 100, 0);
    Object.assign(v, { amount_untaxed: Math.round(ht * 100) / 100, amount_tax: Math.round(tva * 100) / 100, amount_total: Math.round((ht + tva) * 100) / 100 });
  };
  const creerLignes = (commandes: unknown[], orderId: number): number[] =>
    commandes.filter((c) => Array.isArray(c) && c[0] === 0).map((c) => {
      const val = (c as [number, number, Record<string, unknown>])[2];
      const variante = d["product.product"]!.find((p) => p.id === val.product_id)!;
      const modele = d["product.template"]!.find((t) => t.id === (variante.product_tmpl_id as [number])[0])!;
      const id = 5000 + d["sale.order.line"]!.length;
      d["sale.order.line"]!.push({ id, order_id: [orderId, ""], product_id: [variante.id, ""], name: val.name ?? "", discount: 0, display_type: false, tax_ids: modele.taxes_id, ...val, product_id_: undefined });
      d["sale.order.line"]!.at(-1)!.product_id = [variante.id, ""];
      return id;
    });
  const faux = fauxOdoo(d, (appel) => {
    const [, , , modele, methode, a, kw] = appel.args as [string, number, string, string, string, unknown[], Record<string, unknown>];
    if (modele !== "sale.order") return undefined;
    if (methode === "create") {
      const val = a[0] as Record<string, unknown>;
      const id = 700 + d["sale.order"]!.length;
      const v: Ligne = {
        id, name: `D202611-${String(++numero).padStart(4, "0")}`, state: "draft", date_order: "2026-11-18 10:00:00", write_date: "2026-11-18 10:00:00",
        delivery_status: false, reference: false, origin: false, client_order_ref: false, validity_date: "2026-12-18", invoice_ids: [], access_token: false,
        ...val, partner_id: [val.partner_id, ""], order_line: [],
      };
      v.order_line = creerLignes(val.order_line as unknown[], id);
      d["sale.order"]!.push(v);
      recalculer(v);
      return id;
    }
    const ids = a[0] as number[];
    const ventes = d["sale.order"]!.filter((v) => ids.includes(v.id));
    if (methode === "write") {
      const val = { ...(a[1] as Record<string, unknown>) };
      for (const v of ventes) {
        if (val.order_line) {
          v.order_line = creerLignes(val.order_line as unknown[], v.id);
          delete val.order_line;
        }
        for (const [k, x] of Object.entries(val)) if (k.endsWith("_id") && typeof x === "number") val[k] = [x, ""];
        Object.assign(v, val);
        recalculer(v);
      }
      return true;
    }
    if (methode === "action_confirm") ventes.forEach((v) => Object.assign(v, { state: "sale", delivery_status: "pending" }));
    else if (methode === "action_cancel") ventes.forEach((v) => Object.assign(v, { state: "cancel", contexte: kw?.context }));
    else if (methode === "message_post") ventes.forEach((v) => Object.assign(v, { note_interne: kw?.body }));
    else return undefined;
    return true;
  });
  const ecarts: unknown[] = [];
  const odoo = creerOdooReel([], ENV, { fetch: faux.fetch, stockageEcritures: stockageMemoire(), correspondance: async () => CORRESPONDANCE_PAR_DEFAUT });
  return { odoo, d, faux, ecarts };
}

const livraison = { adresse: "2 rue du Cœur", codePostal: "69001", ville: "Lyon", mode: "standard" };

describe("panier en mode réel (lot 3, D4)", () => {
  it("prix de la liste du client, TVA des produits, forfait de port du produit « Livraison »", async () => {
    const { odoo } = monter();
    const devis = await odoo.commandes.calculerDevis({ partenaireRef: "P100", lignes: [{ defaultCode: "DMS 300-4L4B", formule: "achat", quantite: 1 }] });
    // Cabinet A : liste « Clinique », -10 % → 2 205 € → 1 984,50 €.
    expect(devis.lignes[0]).toMatchObject({ prixUnitaireHt: 198450, totalHt: 198450, tauxTva: 20, remiseHt: 0, promotion: null });
    expect(devis.achat).toEqual({
      sousTotalHt: 198450, remisesAutomatiquesHt: 0, remiseCodePromoHt: 0, bonsHt: 0, fraisPortHt: 1500, fraisSpecifiquesHt: 0,
      totalHt: 199950, tva: 39990, totalTtc: 239940,
    });
    expect(devis.modesLivraison).toEqual([{ code: "standard", libelle: "Livraison standard", delaiJours: 3, forfaitHt: 1500, disponible: true, motif: null, francoAtteint: false }]);
    expect(devis.estFictif).toBe(false);
  });

  it("franco au-delà du seuil ; frais des produits volumineux ; code promo non proposé", async () => {
    const { odoo } = monter({ franco: 500 });
    const devis = await odoo.commandes.calculerDevis({ partenaireRef: null, codePromo: "bienvenue", lignes: [{ defaultCode: "ULKE", formule: "achat", quantite: 1 }] });
    expect(devis.achat).toMatchObject({ fraisPortHt: 0, fraisSpecifiquesHt: 23000 });
    expect(devis.modesLivraison[0]!.francoAtteint).toBe(true);
    expect(devis.seuilFrancoHt).toBe(50000);
    expect(devis.codePromo).toEqual({ code: "BIENVENUE", applique: false, motif: "Les codes promo ne sont pas encore proposés sur le site." });
  });

  it("produit « Livraison » absent : refus explicite (et anomalie bloquante au rapport)", async () => {
    const { odoo } = monter({ livraison: false });
    await expect(odoo.commandes.calculerDevis({ partenaireRef: null, lignes: [{ defaultCode: "98-0239-01", formule: "achat", quantite: 1 }] })).rejects.toMatchObject({
      code: "OPERATION_REFUSED",
      details: { cause: "livraison_absente" },
    });
    const anomalies = await odoo.catalogue.controlerDonnees();
    expect(anomalies.find((a) => a.code === "LIVRAISON_ABSENTE")).toMatchObject({ bloquant: true, reference: "LIVRAISON" });
  });

  it("article ou client inconnu → NotFound", async () => {
    const { odoo } = monter();
    await expect(odoo.commandes.calculerDevis({ partenaireRef: null, lignes: [{ defaultCode: "X", formule: "achat", quantite: 1 }] })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(odoo.commandes.calculerDevis({ partenaireRef: "P999", lignes: [{ defaultCode: "98-0239-01", formule: "achat", quantite: 1 }] })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("commandes en mode réel (lot 3, D6)", () => {
  const commande = (cle: string, extra: Record<string, unknown> = {}) => ({
    partenaireRef: "P100",
    lignes: [{ defaultCode: "DMS 300-4L4B", quantite: 1 }, { defaultCode: "98-0239-02", quantite: 1, offerte: true }],
    livraison,
    paiement: { mode: "carte" as const, reference: `pi_${cle}` },
    ...extra,
  });

  it("crée et confirme la commande payée une seule fois, avec lignes, port, adresse et référence Stripe ; la relit", async () => {
    const { odoo, d } = monter();
    const a = await odoo.commandes.creerCommandePayee(commande("1"), "commande:1");
    const b = await odoo.commandes.creerCommandePayee(commande("1"), "commande:1");
    expect(b).toEqual(a);
    expect(d["sale.order"]).toHaveLength(1);
    const v = d["sale.order"]![0]!;
    expect(v).toMatchObject({ state: "sale", client_order_ref: "commande:1", origin: "Site explocardio.fr (carte)", reference: "pi_1" });
    expect(d["res.partner"]!.find((p) => p.type === "delivery")).toMatchObject({ street: "2 rue du Cœur", parent_id: [100, ""] });

    const c = await odoo.commandes.lireCommande(a.ref);
    expect(c).toMatchObject({
      ref: "D202611-0001", partenaireRef: "P100", statut: "payee", modePaiement: "carte", referencePaiement: "pi_1",
      montantHt: 199950, tva: 39990, montantTtc: 239940, fraisPortHt: 1500, estFictif: false,
    });
    expect(c.lignes.map((l) => [l.defaultCode, l.prixUnitaireHt, l.tauxTva])).toEqual([["DMS 300-4L4B", 198450, 20], ["98-0239-02", 0, 20]]);
    expect(await odoo.commandes.listerCommandes("P100")).toEqual([expect.objectContaining({ ref: a.ref, statut: "payee", montantTtc: 239940 })]);
  });

  it("trace perdue après une coupure : la commande est retrouvée dans Odoo par sa clé", async () => {
    const { odoo, d } = monter();
    const a = await odoo.commandes.creerCommandePayee(commande("2"), "commande:2");
    const autre = creerOdooReel([], ENV, { fetch: (await import("./faux-odoo")).fauxOdoo(d).fetch, stockageEcritures: stockageMemoire(), correspondance: async () => CORRESPONDANCE_PAR_DEFAUT });
    expect(await autre.commandes.creerCommandePayee(commande("2"), "commande:2")).toEqual(a);
    expect(d["sale.order"]).toHaveLength(1);
  });

  it("article épuisé sans délai : OutOfStock, rien n'est créé", async () => {
    const { odoo, d } = monter();
    d["product.supplierinfo"] = [];
    await expect(odoo.commandes.creerCommandePayee({ ...commande("3"), lignes: [{ defaultCode: "DMS 300-4L4B", quantite: 5 }] }, "commande:3")).rejects.toMatchObject({ code: "OUT_OF_STOCK" });
    expect(d["sale.order"]).toHaveLength(0);
  });

  it("virement : commande en attente avec échéance, annulée à l'échéance ; virement reçu → payée", async () => {
    const { odoo, d } = monter();
    const r = await odoo.commandes.creerCommandeVirement({ ...commande("4"), paiement: { mode: "virement", reference: "CMD-4" } }, "commande:4");
    expect(r.echeance.getTime()).toBeGreaterThan(Date.now() + 6 * 86_400_000);
    expect((await odoo.commandes.lireCommande(r.ref)).statut).toBe("en_attente_paiement");
    await odoo.commandes.annulerCommandeEnAttente(r.ref, "virement non reçu");
    expect(d["sale.order"]![0]).toMatchObject({ state: "cancel", note_interne: "Annulée par le site : virement non reçu" });
    expect((await odoo.commandes.lireCommande(r.ref)).statut).toBe("annulee");

    const r2 = await odoo.commandes.creerCommandeVirement({ ...commande("5"), paiement: { mode: "virement", reference: "CMD-5" } }, "commande:5");
    // Régis saisit la référence du virement reçu (ou règle la facture) dans Odoo.
    d["sale.order"]!.find((v) => v.name === r2.ref)!.reference = "VIR-123";
    expect((await odoo.commandes.lireCommande(r2.ref)).statut).toBe("payee");
    await odoo.commandes.annulerCommandeEnAttente(r2.ref, "trop tard");
    expect(d["sale.order"]!.find((v) => v.name === r2.ref)!.state).toBe("sale");
  });

  it("changements : état d'expédition des commandes du site modifiées depuis une date", async () => {
    const { odoo, d } = monter();
    const { ref } = await odoo.commandes.creerCommandePayee(commande("6"), "commande:6");
    Object.assign(d["sale.order"]![0]!, { delivery_status: "full", write_date: "2026-11-18 12:00:00" });
    const changements = await odoo.commandes.listerChangements(new Date("2026-11-18T11:00:00Z"));
    expect(changements).toEqual([expect.objectContaining({ ref, partenaireRef: "P100", statut: "expediee", modifieLe: new Date("2026-11-18T12:00:00Z") })]);
    expect(await odoo.commandes.listerChangements(new Date("2026-11-18T13:00:00Z"))).toEqual([]);
  });
});

describe("devis enregistrés en mode réel (lot 3, D7)", () => {
  const adresse = { adresse: "2 rue du Cœur", codePostal: "69001", ville: "Lyon" };
  const lignes = [{ defaultCode: "98-0239-01", formule: "achat" as const, quantite: 3 }];

  it("crée un devis Odoo une seule fois, 30 jours ; ce n'est pas une commande ; confirmé sous son numéro aux prix du devis", async () => {
    const { odoo, d } = monter();
    const a = await odoo.commandes.creerDevis({ partenaireRef: "P100", lignes, livraison: adresse }, "devis:1");
    const b = await odoo.commandes.creerDevis({ partenaireRef: "P100", lignes, livraison: adresse }, "devis:1");
    expect(b.ref).toBe(a.ref);
    expect(a).toMatchObject({ etat: "valide", commandeRef: null, partenaireRef: "P100", demande: [{ defaultCode: "98-0239-01", formule: "achat", quantite: 3 }] });
    expect(d["sale.order"]![0]).toMatchObject({ state: "draft", origin: "Site explocardio.fr (devis)" });
    expect(await odoo.commandes.listerCommandes("P100")).toEqual([]);
    await expect(odoo.commandes.lireCommande(a.ref)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await odoo.commandes.listerDevis("P100")).map((x) => x.ref)).toEqual([a.ref]);

    // Régis baisse le prix du devis dans Odoo : le panier et la commande reprennent ce prix.
    d["sale.order.line"]!.find((l) => (d["sale.order"]![0]!.order_line as number[]).includes(l.id))!.price_unit = 60;
    const calcul = await odoo.commandes.calculerDevis({ partenaireRef: "P100", lignes, devisRef: a.ref });
    expect(calcul.lignes[0]!.prixUnitaireHt).toBe(6000);
    const { ref } = await odoo.commandes.creerCommandePayee(
      { partenaireRef: "P100", lignes: [{ defaultCode: "98-0239-01", quantite: 3 }], livraison: { ...adresse, mode: "standard" }, paiement: { mode: "carte", reference: "pi_d" }, devisRef: a.ref },
      "commande:devis",
    );
    expect(ref).toBe(a.ref);
    expect(d["sale.order"]).toHaveLength(1);
    expect((await odoo.commandes.lireCommande(ref)).lignes[0]!.prixUnitaireHt).toBe(6000);
    expect(await odoo.commandes.lireDevis("P100", a.ref)).toMatchObject({ etat: "commande", commandeRef: ref });
  });

  it("devis d'un autre client → NotFound ; devis expiré ; PDF par le lien de portail", async () => {
    const { odoo, d, faux } = monter();
    d["res.partner"]!.push({ id: 200, name: "Autre", active: true, parent_id: false });
    const a = await odoo.commandes.creerDevis({ partenaireRef: "P100", lignes, livraison: adresse }, "devis:2");
    await expect(odoo.commandes.lireDevis("P200", a.ref)).rejects.toMatchObject({ code: "NOT_FOUND" });
    d["sale.order"]![0]!.validity_date = "2026-01-01";
    expect((await odoo.commandes.lireDevis("P100", a.ref)).etat).toBe("expire");

    const telechargements: string[] = [];
    const fetchPdf = (async (url: string, init?: RequestInit) => {
      if (String(url).includes("/my/orders/")) {
        telechargements.push(String(url));
        return new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), { status: 200 });
      }
      return faux.fetch(url, init);
    }) as unknown as typeof fetch;
    const avecPdf = creerOdooReel([], ENV, { fetch: fetchPdf, stockageEcritures: stockageMemoire(), correspondance: async () => CORRESPONDANCE_PAR_DEFAUT });
    const pdf = await avecPdf.commandes.lireDevisPdf("P100", a.ref);
    expect(Buffer.from(pdf).toString()).toBe("%PDF-");
    const jeton = String(d["sale.order"]![0]!.access_token);
    expect(jeton).toMatch(/^[0-9a-f-]{36}$/);
    expect(telechargements[0]).toBe(`https://odoo.test/my/orders/${d["sale.order"]![0]!.id}?access_token=${jeton}&report_type=pdf&download=true`);
    expect(telechargements[0]).not.toContain(CLE_TEST);
    await expect(avecPdf.commandes.lireDevisPdf("P200", a.ref)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
