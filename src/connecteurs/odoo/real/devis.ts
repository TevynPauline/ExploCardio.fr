import { NotFound, OperationRefusee } from "../../erreurs";
import type { DemandeDevis, Devis, LigneDevisCalculee, ModeLivraisonDevis } from "../interfaces";
import { idDe, texteDe, type ClientOdoo, type Enregistrement } from "./client";
import type { Instantane } from "./instantane";
import { conditionPartenaire } from "./partenaires";
import { prixPour } from "./prix";

// Calcul du panier en mode réel (F14 lot 3, plan-lots-2-3.md D4). Odoo n'offre pas de calcul de
// prix public : le site applique les données lues dans Odoo (liste de prix du client, paliers,
// TVA des produits, produit « Livraison » et seuil de franco, frais des produits volumineux).
// À la création de la commande, Odoo recalcule ; un écart est signalé à l'équipe.
// À l'ouverture : ni promotions, ni codes promo, ni bons d'achat (décision du 2026-11-18).

export const MODE_STANDARD = { code: "standard", libelle: "Livraison standard", delaiJours: 3 } as const;

const tva = (montantHt: number, taux: number) => Math.round((montantHt * taux) / 100);

/** F12 : abonnement logiciel à prise d'effet différée : aucun premier mois dû maintenant. */
const differe = (l: { priseEffet?: Date | null }) => !!l.priseEffet && l.priseEffet.getTime() > Date.now();

type Partenaire = Enregistrement & { property_product_pricelist: unknown };
type LigneVente = Enregistrement & { product_id: unknown; price_unit: number; discount: number; product_uom_qty: number; display_type: string | false };
type Vente = Enregistrement & { name: string; state: string; partner_id: unknown; validity_date: string | false; order_line: number[] };

export type PrixFiges = Map<string, { prixUnitaireHt: number; remiseHt: number; quantite: number }>;

/** Liste de prix du client (ou la liste par défaut) ; NotFound pour un client inconnu. */
export async function listeDuClient(client: ClientOdoo, i: Instantane, partenaireRef: string | null): Promise<number | null> {
  if (!partenaireRef) return i.listeParDefaut;
  const [p] = await client.searchRead<Partenaire>("res.partner", [conditionPartenaire(partenaireRef)], ["property_product_pricelist"], { limite: 1 });
  if (!p) throw new NotFound("Partenaire", partenaireRef);
  return idDe(p.property_product_pricelist) ?? i.listeParDefaut;
}

/**
 * F16 : prix d'un devis Odoo encore valable, du même client, à l'état devis (brouillon ou
 * envoyé). `memeExpire` : à la confirmation, le prix payé reste celui du devis.
 */
export async function prixDuDevis(
  client: ClientOdoo,
  i: Instantane,
  demande: DemandeDevis,
  memeExpire = false,
  maintenant = new Date(),
): Promise<PrixFiges | null> {
  if (!demande.devisRef || !demande.partenaireRef) return null;
  const [v] = await client.searchRead<Vente>("sale.order", [["name", "=", demande.devisRef]], ["name", "state", "partner_id", "validity_date", "order_line"], { limite: 1 });
  if (!v || !["draft", "sent"].includes(v.state)) return null;
  const [p] = await client.searchRead("res.partner", [conditionPartenaire(demande.partenaireRef)], ["id"], { limite: 1 });
  if (!p || idDe(v.partner_id) !== p.id) return null;
  const validite = texteDe(v.validity_date);
  if (!memeExpire && validite && new Date(`${validite}T23:59:59`) < maintenant) return null;
  const lignes = await client.read<LigneVente>("sale.order.line", v.order_line, ["product_id", "price_unit", "discount", "product_uom_qty", "display_type"]);
  const parVariante = new Map([...i.parReference.values()].map((x) => [x.variante.id, x.variante.defaultCode]));
  const figes: PrixFiges = new Map();
  for (const l of lignes) {
    const code = parVariante.get(idDe(l.product_id) ?? -1);
    if (!code || l.display_type || !(l.price_unit > 0)) continue;
    const pu = Math.round(l.price_unit * 100);
    figes.set(code, { prixUnitaireHt: pu, remiseHt: Math.round(pu * l.product_uom_qty * (l.discount / 100)), quantite: l.product_uom_qty });
  }
  return figes;
}

export async function calculerDevisReel(
  client: ClientOdoo,
  i: Instantane,
  demande: DemandeDevis,
  options: { devisMemeExpire?: boolean; maintenant?: Date } = {},
): Promise<Devis> {
  const maintenant = options.maintenant ?? new Date();
  for (const l of demande.lignes) if (!i.parReference.has(l.defaultCode)) throw new NotFound("Article", l.defaultCode);
  const liste = await listeDuClient(client, i, demande.partenaireRef);
  const figes = await prixDuDevis(client, i, demande, options.devisMemeExpire ?? false, maintenant);

  const lignes: LigneDevisCalculee[] = demande.lignes.map((l) => {
    const { modele, variante } = i.parReference.get(l.defaultCode)!;
    const libelle = `${modele.marque} ${modele.nom}${variante.configuration ? ` — ${variante.configuration}` : ""}${l.offerte ? " (offert)" : ""}`;
    const base = { defaultCode: variante.defaultCode, formule: l.formule, libelle, quantite: l.quantite, remiseHt: 0, tauxTva: modele.tauxTva, offerte: false, promotion: null };
    if (l.formule === "mise_a_disposition") {
      const mois = differe(l) ? 0 : (modele.offre?.premierMoisHt ?? 0);
      return { ...base, prixUnitaireHt: mois, totalHt: mois * l.quantite };
    }
    if (l.offerte) return { ...base, prixUnitaireHt: 0, totalHt: 0, offerte: true };
    const fige = figes?.get(variante.defaultCode);
    if (fige) {
      const remise = fige.quantite === l.quantite ? fige.remiseHt : Math.round((fige.remiseHt * l.quantite) / fige.quantite);
      return { ...base, prixUnitaireHt: fige.prixUnitaireHt, remiseHt: remise, totalHt: fige.prixUnitaireHt * l.quantite - remise };
    }
    const pu = liste === null ? variante.prixHt : prixPour(i.regles, liste, variante.cible, l.quantite, maintenant).prixHt;
    return { ...base, prixUnitaireHt: pu, totalHt: pu * l.quantite };
  });

  const achats = lignes.filter((l) => l.formule === "achat");
  const locations = lignes.filter((l) => l.formule === "mise_a_disposition");
  const seuilFranco = i.livraison?.seuilFrancoHt ?? 0;

  let achat: Devis["achat"] = null;
  let modesLivraison: ModeLivraisonDevis[] = [];
  if (achats.length) {
    const sousTotal = achats.reduce((s, l) => s + l.prixUnitaireHt * l.quantite, 0);
    const net = achats.reduce((s, l) => s + l.totalHt, 0);
    // Une commande de services seuls (assistance à l'acte) n'est pas expédiée.
    const servicesSeuls = achats.every((l) => i.parReference.get(l.defaultCode)!.modele.type === "service");
    if (!servicesSeuls && !i.livraison) {
      throw new OperationRefusee("Les frais de port ne sont pas encore réglés dans Odoo (produit « Livraison » absent) : la commande ne peut pas être calculée.", {
        cause: "livraison_absente",
      });
    }
    const francoAtteint = seuilFranco > 0 && net >= seuilFranco;
    const forfait = servicesSeuls || francoAtteint ? 0 : i.livraison!.forfaitHt;
    modesLivraison = [{ ...MODE_STANDARD, forfaitHt: forfait, disponible: true, motif: null, francoAtteint }];
    const specifiques = achats.reduce((s, l) => {
      const m = i.parReference.get(l.defaultCode)!.modele;
      return s + (m.fraisLivraisonHt + m.fraisInstallationHt) * l.quantite;
    }, 0);
    const tauxFrais = i.livraison?.tauxTva ?? 20;
    const totalHt = net + forfait + specifiques;
    const montantTva = achats.reduce((s, l) => s + tva(l.totalHt, l.tauxTva), 0) + tva(forfait + specifiques, tauxFrais);
    achat = {
      sousTotalHt: sousTotal,
      remisesAutomatiquesHt: achats.reduce((s, l) => s + l.remiseHt, 0),
      remiseCodePromoHt: 0,
      bonsHt: 0,
      fraisPortHt: forfait,
      fraisSpecifiquesHt: specifiques,
      totalHt,
      tva: montantTva,
      totalTtc: totalHt + montantTva,
    };
  }

  let abonnement: Devis["abonnement"] = null;
  if (locations.length) {
    let premier = 0, suivants = 0, premierTtc = 0, suivantsTtc = 0;
    for (const l of locations) {
      const m = i.parReference.get(l.defaultCode)!.modele;
      const s = (m.offre?.moisSuivantsHt ?? 0) * l.quantite;
      premier += l.totalHt;
      suivants += s;
      premierTtc += l.totalHt + tva(l.totalHt, m.tauxTva);
      suivantsTtc += s + tva(s, m.tauxTva);
    }
    abonnement = { premierMoisHt: premier, moisSuivantsHt: suivants, premierMoisTtc: premierTtc, moisSuivantsTtc: suivantsTtc };
  }

  const code = demande.codePromo?.trim().toUpperCase();
  return {
    lignes,
    achat,
    abonnement,
    codePromo: code ? { code, applique: false, motif: "Les codes promo ne sont pas encore proposés sur le site." } : null,
    regleCumul: "Les prix de votre compte et les prix dégressifs sont appliqués automatiquement.",
    modesLivraison,
    modeLivraison: modesLivraison[0]?.code ?? null,
    seuilFrancoHt: seuilFranco,
    estFictif: false,
  };
}
