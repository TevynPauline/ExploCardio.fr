import { randomUUID } from "node:crypto";
import { NotFound, OutOfStock } from "../../erreurs";
import { implementationRefusee } from "../../non-livre";
import type {
  ChangementCommande,
  Commande,
  CommandesOdoo,
  DemandeDevis,
  Devis,
  DevisEnregistre,
  EtatDevisEnregistre,
  NouveauDevis,
  NouvelleCommande,
  ResumeCommande,
  ResumeDevisEnregistre,
  StatutCommande,
} from "../interfaces";
import { idDe, texteDe, type ClientOdoo, type Enregistrement } from "./client";
import { calculerDevisReel } from "./devis";
import type { Ecritures } from "./ecritures";
import type { Instantane } from "./instantane";
import { conditionPartenaire, refPartenaire } from "./partenaires";

// Domaine « Commandes » en mode réel (F14 lot 3, plan-lots-2-3.md D6, D7).
// - Référence d'une commande ou d'un devis : son numéro Odoo (`name`), le même sur les
//   documents de Régis ; un devis confirmé garde son numéro.
// - Les lignes sont envoyées avec les prix calculés par le site (ceux payés par le client) ;
//   Odoo calcule taxes et totaux. Un écart de total est signalé au journal.
// - Payée : référence du paiement Stripe dans « Réf. de paiement » (`reference`), ou facture
//   réglée dans Odoo (virement saisi par Régis).
// - Virement : échéance dans « Expiration » (`validity_date`) de la commande confirmée.
// - Origine : « Site explocardio.fr (carte) », « (virement) », « (devis) » ; un devis confirmé
//   devient « (devis, carte) ».

export const ORIGINE = "Site explocardio.fr";
const DELAI_VIREMENT_JOURS = 7;
const VALIDITE_DEVIS_JOURS = 30;

type Vente = Enregistrement & {
  name: string;
  state: "draft" | "sent" | "sale" | "cancel";
  partner_id: unknown;
  date_order: string;
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
  order_line: number[];
  delivery_status: string | false;
  reference: string | false;
  origin: string | false;
  client_order_ref: string | false;
  validity_date: string | false;
  write_date: string;
  invoice_ids: number[];
  access_token: string | false;
};
type LigneVente = Enregistrement & {
  product_id: unknown;
  name: string;
  product_uom_qty: number;
  price_unit: number;
  discount: number;
  tax_ids: number[];
  display_type: string | false;
};
type Facture = Enregistrement & { move_type: string; state: string; payment_state: string; amount_total: number };

const CHAMPS_VENTE = [
  "name", "state", "partner_id", "date_order", "amount_untaxed", "amount_tax", "amount_total", "order_line", "delivery_status",
  "reference", "origin", "client_order_ref", "validity_date", "write_date", "invoice_ids", "access_token",
];
const CHAMPS_LIGNE = ["product_id", "name", "product_uom_qty", "price_unit", "discount", "tax_ids", "display_type"];

const centimes = (euros: number) => Math.round(euros * 100);
const euros = (c: number) => c / 100;
/** Datetime Odoo (UTC, sans fuseau) → Date. */
const dateOdoo = (s: string) => new Date(`${s.replace(" ", "T")}Z`);
const jourOdoo = (d: Date) => d.toISOString().slice(0, 10);
const instantOdoo = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
const ajouterJours = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

function modeDe(v: Vente): string {
  return /\((\w+)\)$/.exec(texteDe(v.origin) ?? "")?.[1] ?? "carte";
}

export type OptionsCommandesReelles = {
  /** Signalement d'un écart entre le total payé et celui d'Odoo (journal, email à l'équipe). */
  signalerEcart?: (detail: { ref: string; attenduTtc: number; odooTtc: number }) => void;
};

export function creerCommandesReelles(
  client: ClientOdoo,
  instantane: () => Promise<Instantane>,
  ecritures: Ecritures,
  options: OptionsCommandesReelles = {},
): CommandesOdoo {
  const signalerEcart = options.signalerEcart ?? ((d) => console.error(`[odoo] écart de total sur ${d.ref} : payé ${d.attenduTtc}, Odoo ${d.odooTtc} (centimes)`));
  const nonLivre = implementationRefusee<CommandesOdoo>("odoo", []);

  async function idPartenaire(ref: string): Promise<number> {
    const [p] = await client.searchRead("res.partner", [conditionPartenaire(ref)], ["id"], { limite: 1, contexte: { active_test: false } });
    if (!p) throw new NotFound("Partenaire", ref);
    return p.id;
  }

  async function lireVente(ref: string): Promise<Vente | null> {
    const [v] = await client.searchRead<Vente>("sale.order", [["name", "=", ref]], CHAMPS_VENTE, { limite: 1 });
    return v ?? null;
  }

  async function payee(v: Vente): Promise<boolean> {
    if (texteDe(v.reference)) return true;
    if (!v.invoice_ids.length) return false;
    const factures = await client.read<Facture>("account.move", v.invoice_ids, ["move_type", "state", "payment_state", "amount_total"]);
    const f = factures.filter((x) => x.move_type === "out_invoice" && x.state === "posted");
    return f.length > 0 && f.every((x) => ["paid", "in_payment"].includes(x.payment_state));
  }

  async function statutDe(v: Vente): Promise<StatutCommande> {
    if (v.state === "cancel") return "annulee";
    if (!(await payee(v))) return "en_attente_paiement";
    // Sans module Livraison, le bon de livraison validé vaut expédition (question 3 à Régis).
    if (v.delivery_status === "full" || v.delivery_status === "partial" || v.delivery_status === "started") return "expediee";
    return "payee";
  }

  /** Adresse de livraison : fiche enfant « Livraison » identique, sinon créée. */
  async function adresseLivraison(partenaireId: number, l: NouvelleCommande["livraison"]): Promise<number> {
    const enfants = await client.searchRead<Enregistrement & { street: string | false; zip: string | false; city: string | false }>(
      "res.partner",
      [["parent_id", "=", partenaireId], ["type", "=", "delivery"]],
      ["street", "zip", "city"],
    );
    const meme = enfants.find((e) => texteDe(e.street) === l.adresse.trim() && texteDe(e.zip) === l.codePostal.trim() && texteDe(e.city) === l.ville.trim());
    if (meme) return meme.id;
    return (await client.appeler("res.partner", "create", [
      { parent_id: partenaireId, type: "delivery", name: "Livraison", street: l.adresse, zip: l.codePostal, city: l.ville },
    ])) as number;
  }

  /** Lignes Odoo (commandes `(0, 0, valeurs)`) d'après le calcul du site. */
  function lignesOdoo(i: Instantane, devis: Devis): unknown[] {
    const lignes: unknown[] = devis.lignes
      .filter((l) => l.formule === "achat")
      .map((l) => {
        const v = i.parReference.get(l.defaultCode)!.variante;
        const brut = l.prixUnitaireHt * l.quantite;
        return [0, 0, {
          product_id: v.id,
          product_uom_qty: l.quantite,
          price_unit: euros(l.prixUnitaireHt),
          discount: brut > 0 && l.remiseHt > 0 ? Math.round((l.remiseHt / brut) * 10_000) / 100 : 0,
          ...(l.offerte ? { name: l.libelle } : {}),
        }];
      });
    const achat = devis.achat;
    if (achat && i.livraison) {
      if (achat.fraisPortHt > 0) lignes.push([0, 0, { product_id: i.livraison.varianteId, product_uom_qty: 1, price_unit: euros(achat.fraisPortHt) }]);
      if (achat.fraisSpecifiquesHt > 0) {
        lignes.push([0, 0, { product_id: i.livraison.varianteId, product_uom_qty: 1, price_unit: euros(achat.fraisSpecifiquesHt), name: "Livraison et installation des équipements volumineux" }]);
      }
    }
    return lignes;
  }

  function verifierStock(i: Instantane, c: NouvelleCommande) {
    const manquants = c.lignes
      .filter((l) => {
        const v = i.parReference.get(l.defaultCode)!.variante;
        return l.quantite > v.quantiteLibre && v.delaiReassortJours === null;
      })
      .map((l) => l.defaultCode);
    if (manquants.length) throw new OutOfStock(manquants);
  }

  function demandeDe(c: NouvelleCommande): DemandeDevis {
    return {
      partenaireRef: c.partenaireRef,
      lignes: c.lignes.map((l) => ({ defaultCode: l.defaultCode, formule: "achat", quantite: l.quantite, offerte: l.offerte })),
      codePromo: c.codePromo ?? null,
      modeLivraison: c.livraison.mode ?? null,
      devisRef: c.devisRef ?? null,
    };
  }

  async function creer(c: NouvelleCommande, cle: string, mode: "paye" | "virement"): Promise<{ ref: string; echeance: Date | null }> {
    const maintenant = new Date();
    const echeance = mode === "virement" ? ajouterJours(maintenant, DELAI_VIREMENT_JOURS) : null;
    const { resultat } = await ecritures.uneFois(`commande:${cle}`, `commandes.${mode}`, async () => {
      // Trace absente après une coupure : la commande est retrouvée par sa clé dans Odoo.
      const [deja] = await client.searchRead<Vente>("sale.order", [["client_order_ref", "=", cle]], ["name", "validity_date"], { limite: 1 });
      if (deja) return { ref: deja.name, echeance: texteDe(deja.validity_date) };
      const i = await instantane();
      for (const l of c.lignes) if (!i.parReference.has(l.defaultCode)) throw new NotFound("Article", l.defaultCode);
      const partenaireId = await idPartenaire(c.partenaireRef);
      verifierStock(i, c);
      const devis = await calculerDevisReel(client, i, demandeDe(c), { devisMemeExpire: true, maintenant });
      const valeurs: Record<string, unknown> = {
        partner_id: partenaireId,
        partner_shipping_id: await adresseLivraison(partenaireId, c.livraison),
        client_order_ref: cle,
        origin: `${ORIGINE} (${c.paiement.mode})`,
        ...(mode === "paye" ? { reference: c.paiement.reference } : { validity_date: jourOdoo(echeance!) }),
      };
      // F16 : « Commander » un devis du client le confirme sous son numéro.
      const devisOdoo = c.devisRef ? await lireVente(c.devisRef) : null;
      const aConfirmer = devisOdoo && ["draft", "sent"].includes(devisOdoo.state) && idDe(devisOdoo.partner_id) === partenaireId ? devisOdoo : null;
      let id: number;
      if (aConfirmer) {
        id = aConfirmer.id;
        // L'origine garde la trace du devis (Mon compte → Devis : « commandé »).
        valeurs.origin = `${ORIGINE} (devis, ${c.paiement.mode})`;
        await client.appeler("sale.order", "write", [[id], { ...valeurs, order_line: [[5, 0, 0], ...lignesOdoo(i, devis)] }]);
      } else {
        id = (await client.appeler("sale.order", "create", [{ ...valeurs, order_line: lignesOdoo(i, devis) }])) as number;
      }
      await client.appeler("sale.order", "action_confirm", [[id]]);
      const [v] = await client.read<Vente>("sale.order", [id], ["name", "amount_total"]);
      const attendu = devis.achat?.totalTtc ?? 0;
      if (Math.abs(centimes(v!.amount_total) - attendu) > 1) signalerEcart({ ref: v!.name, attenduTtc: attendu, odooTtc: centimes(v!.amount_total) });
      return { ref: v!.name, echeance: echeance ? jourOdoo(echeance) : null };
    });
    return { ref: resultat.ref, echeance: resultat.echeance ? new Date(`${resultat.echeance}T23:59:59`) : null };
  }

  async function versCommande(v: Vente): Promise<Commande> {
    const i = await instantane();
    const lignes = await client.read<LigneVente>("sale.order.line", v.order_line, CHAMPS_LIGNE);
    const taxes = [...new Set(lignes.flatMap((l) => l.tax_ids))];
    const taux = new Map((await client.read<Enregistrement & { amount: number }>("account.tax", taxes, ["amount"])).map((t) => [t.id, t.amount]));
    const parVariante = new Map([...i.parReference.values()].map((x) => [x.variante.id, x]));
    const livraisonId = i.livraison?.varianteId ?? -1;
    const articles = lignes.filter((l) => !l.display_type && idDe(l.product_id) !== livraisonId);
    const port = lignes.filter((l) => idDe(l.product_id) === livraisonId).reduce((s, l) => s + centimes(l.price_unit * l.product_uom_qty), 0);
    const statut = await statutDe(v);
    return {
      ref: v.name,
      date: dateOdoo(v.date_order),
      montantHt: centimes(v.amount_untaxed),
      montantTtc: centimes(v.amount_total),
      tva: centimes(v.amount_tax),
      statut,
      estFictif: false,
      partenaireRef: refPartenaire(idDe(v.partner_id)!),
      fraisPortHt: port,
      bonsUtilisesHt: 0,
      modePaiement: modeDe(v),
      referencePaiement: texteDe(v.reference),
      financee: modeDe(v) === "financement",
      transporteur: null,
      suivi: null,
      echeancePaiement: statut === "en_attente_paiement" && texteDe(v.validity_date) ? new Date(`${v.validity_date}T23:59:59`) : null,
      remboursementsTtc: 0,
      lignes: articles.map((l) => {
        const x = parVariante.get(idDe(l.product_id) ?? -1);
        const brut = centimes(l.price_unit * l.product_uom_qty);
        return {
          defaultCode: x?.variante.defaultCode ?? "",
          libelle: x ? `${x.modele.marque} ${x.modele.nom}${x.variante.configuration ? ` — ${x.variante.configuration}` : ""}` : l.name,
          quantite: l.product_uom_qty,
          prixUnitaireHt: centimes(l.price_unit),
          remiseHt: Math.round((brut * l.discount) / 100),
          tauxTva: l.tax_ids.reduce((s, t) => s + (taux.get(t) ?? 0), 0),
        };
      }),
    };
  }

  // --- Devis enregistrés (F16, D7) --------------------------------------------------------

  const etatDevis = (v: Vente, maintenant = new Date()): EtatDevisEnregistre => {
    if (v.state === "sale") return "commande";
    const validite = texteDe(v.validity_date);
    return validite && new Date(`${validite}T23:59:59`) < maintenant ? "expire" : "valide";
  };

  async function devisDuClient(partenaireRef: string, ref: string): Promise<Vente> {
    const partenaireId = await idPartenaire(partenaireRef);
    const v = await lireVente(ref);
    const estDevis = v && (["draft", "sent"].includes(v.state) || (v.state === "sale" && (texteDe(v.origin) ?? "").startsWith(`${ORIGINE} (devis`)));
    if (!v || !estDevis || idDe(v.partner_id) !== partenaireId) throw new NotFound("Devis", ref);
    return v;
  }

  function resumeDevis(v: Vente): ResumeDevisEnregistre {
    const etat = etatDevis(v);
    const cree = dateOdoo(v.date_order);
    return {
      ref: v.name,
      creeLe: cree,
      validiteLe: texteDe(v.validity_date) && etat !== "commande" ? new Date(`${v.validity_date}T23:59:59`) : ajouterJours(cree, VALIDITE_DEVIS_JOURS),
      totalHt: centimes(v.amount_untaxed),
      totalTtc: centimes(v.amount_total),
      etat,
      commandeRef: etat === "commande" ? v.name : null,
      estFictif: false,
    };
  }

  async function versDevisEnregistre(partenaireRef: string, v: Vente): Promise<DevisEnregistre> {
    const i = await instantane();
    const lignes = await client.read<LigneVente>("sale.order.line", v.order_line, CHAMPS_LIGNE);
    const parVariante = new Map([...i.parReference.values()].map((x) => [x.variante.id, x.variante.defaultCode]));
    const demande = lignes
      .map((l) => ({ defaultCode: parVariante.get(idDe(l.product_id) ?? -1), quantite: l.product_uom_qty, offerte: !(l.price_unit > 0) }))
      .filter((l): l is { defaultCode: string; quantite: number; offerte: boolean } => Boolean(l.defaultCode) && !l.offerte)
      .map((l) => ({ defaultCode: l.defaultCode, formule: "achat" as const, quantite: l.quantite }));
    const calcul = await calculerDevisReel(client, i, { partenaireRef, lignes: demande, devisRef: v.state === "sale" ? null : v.name }, { devisMemeExpire: true });
    return { ...resumeDevis(v), partenaireRef, demande, calcul };
  }

  return {
    async calculerDevis(demande) {
      return calculerDevisReel(client, await instantane(), demande);
    },

    async creerCommandePayee(c, cle) {
      return { ref: (await creer(c, cle, "paye")).ref };
    },

    async creerCommandeVirement(c, cle) {
      const r = await creer(c, cle, "virement");
      return { ref: r.ref, echeance: r.echeance! };
    },

    async annulerCommandeEnAttente(ref, motif) {
      const v = await lireVente(ref);
      if (!v || ["draft", "sent"].includes(v.state)) throw new NotFound("Commande", ref);
      if (v.state === "cancel" || (await statutDe(v)) !== "en_attente_paiement") return;
      // Annulation sans l'assistant d'Odoo (pas d'email au client) ; stock libéré par Odoo.
      await client.appeler("sale.order", "action_cancel", [[v.id]], { context: { disable_cancel_warning: true } });
      await client.appeler("sale.order", "message_post", [[v.id]], { body: `Annulée par le site : ${motif}`, message_type: "comment", subtype_xmlid: "mail.mt_note" });
    },

    async listerCommandes(partenaireRef): Promise<ResumeCommande[]> {
      const id = await idPartenaire(partenaireRef);
      const ventes = await client.searchRead<Vente>("sale.order", [["partner_id", "child_of", id], ["state", "in", ["sale", "cancel"]]], CHAMPS_VENTE, { ordre: "date_order desc, id desc" });
      return Promise.all(
        ventes.map(async (v) => ({ ref: v.name, date: dateOdoo(v.date_order), montantHt: centimes(v.amount_untaxed), montantTtc: centimes(v.amount_total), statut: await statutDe(v), estFictif: false })),
      );
    },

    async lireCommande(ref) {
      const v = await lireVente(ref);
      if (!v || ["draft", "sent"].includes(v.state)) throw new NotFound("Commande", ref);
      return versCommande(v);
    },

    async listerChangements(depuis): Promise<ChangementCommande[]> {
      const ventes = await client.searchRead<Vente>(
        "sale.order",
        [["write_date", ">", instantOdoo(depuis)], ["state", "in", ["sale", "cancel"]], ["origin", "=like", `${ORIGINE}%`]],
        CHAMPS_VENTE,
        { ordre: "write_date asc" },
      );
      return Promise.all(
        ventes.map(async (v) => ({
          ref: v.name,
          partenaireRef: refPartenaire(idDe(v.partner_id)!),
          statut: await statutDe(v),
          transporteur: null,
          suivi: null,
          remboursementsTtc: 0,
          modifieLe: dateOdoo(v.write_date),
        })),
      );
    },

    // Remboursements par avoir : après la réponse de Régis sur la facturation (L3-08).
    listerRemboursementsAExecuter: (...a) => nonLivre.listerRemboursementsAExecuter(...a),
    enregistrerRemboursement: (...a) => nonLivre.enregistrerRemboursement(...a),

    async creerDevis(d: NouveauDevis, cle) {
      const { resultat } = await ecritures.uneFois(`devis:${cle}`, "commandes.creerDevis", async () => {
        const [deja] = await client.searchRead<Vente>("sale.order", [["client_order_ref", "=", cle]], ["name"], { limite: 1 });
        if (deja) return { ref: deja.name };
        const i = await instantane();
        const partenaireId = await idPartenaire(d.partenaireRef);
        const devis = await calculerDevisReel(client, i, d);
        const id = (await client.appeler("sale.order", "create", [
          {
            partner_id: partenaireId,
            partner_shipping_id: await adresseLivraison(partenaireId, d.livraison),
            client_order_ref: cle,
            origin: `${ORIGINE} (devis)`,
            validity_date: jourOdoo(ajouterJours(new Date(), VALIDITE_DEVIS_JOURS)),
            order_line: lignesOdoo(i, devis),
          },
        ])) as number;
        const [v] = await client.read<Vente>("sale.order", [id], ["name"]);
        return { ref: v!.name };
      });
      return this.lireDevis(d.partenaireRef, resultat.ref);
    },

    async listerDevis(partenaireRef) {
      const id = await idPartenaire(partenaireRef);
      const ventes = await client.searchRead<Vente>(
        "sale.order",
        ["&", ["partner_id", "child_of", id], "|", ["state", "in", ["draft", "sent"]], "&", ["state", "=", "sale"], ["origin", "=like", `${ORIGINE} (devis%`]],
        CHAMPS_VENTE,
        { ordre: "date_order desc, id desc" },
      );
      return ventes.map(resumeDevis);
    },

    async lireDevis(partenaireRef, ref) {
      return versDevisEnregistre(partenaireRef, await devisDuClient(partenaireRef, ref));
    },

    async lireDevisPdf(partenaireRef, ref) {
      const v = await devisDuClient(partenaireRef, ref);
      // Document QWeb de Régis, servi par le portail d'Odoo avec le jeton du devis.
      let jeton = texteDe(v.access_token);
      if (!jeton) {
        jeton = randomUUID();
        await client.appeler("sale.order", "write", [[v.id], { access_token: jeton }]);
      }
      return client.telecharger(`/my/orders/${v.id}?access_token=${encodeURIComponent(jeton)}&report_type=pdf&download=true`);
    },
  };
}
