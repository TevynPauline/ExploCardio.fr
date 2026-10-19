import { NotFound } from "../../erreurs";
import type { DemandeDevis, Devis, LigneDevisCalculee, ModeLivraisonDevis } from "../interfaces";
import { prixClient } from "./catalogue";
import { INCLURE_DISPONIBILITE, etatsAchat } from "./disponibilite";
import { soldeUtilisable } from "./fidelite";
import { db, tva, type Tx } from "./outils";

// Calcul d'un devis en démonstration (F04, R1) : les règles qu'appliquera Odoo — liste de prix
// du client, prix dégressifs, promotions en cours, code promo et règle de cumul, bons d'achat,
// frais de port (forfait, franco, frais des équipements volumineux), TVA. La commande est créée
// avec ce même calcul : les montants affichés sont ceux qui sont facturés.

const TVA_FRAIS = 20;

type RegleListePrix = { defaultCode: string; quantiteMin?: number; prixHtCentimes?: number; dureeMois?: number };

type CodePromo = { code: string; applique: boolean; motif: string | null; remisePourcent: number; cumulable: boolean };

type LimitesCode = { usagesMax?: number; parClient?: number; montantMinimumCentimes?: number; nouveauxClients?: boolean };

async function lireCodePromo(tx: Tx, code: string | null | undefined, maintenant: Date, partenaireRef: string | null | undefined, brutAchats: number): Promise<CodePromo | null> {
  const propre = code?.trim().toUpperCase();
  if (!propre) return null;
  const promo = await tx.promotion.findUnique({ where: { code: propre } });
  const refus = (motif: string): CodePromo => ({ code: propre, applique: false, motif, remisePourcent: 0, cumulable: false });
  if (!promo || promo.type !== "code_promo") return refus("Ce code n'existe pas.");
  if (promo.debut && promo.debut > maintenant) return refus("Ce code n'est pas encore valable.");
  if (promo.fin && promo.fin <= maintenant) return refus("Ce code a expiré.");
  // F06 (FR-032) : limites d'usage fixées dans Odoo.
  const limites = (promo.limites ?? {}) as LimitesCode;
  const actives = { codePromo: propre, statut: { notIn: ["annulee" as const, "brouillon" as const] } };
  if (limites.usagesMax !== undefined && (await tx.commandeVente.count({ where: actives })) >= limites.usagesMax) return refus("Ce code a atteint son nombre d'utilisations.");
  if (limites.montantMinimumCentimes && brutAchats < limites.montantMinimumCentimes) {
    return refus(`Ce code est valable dès ${(limites.montantMinimumCentimes / 100).toLocaleString("fr-FR")} € HT d'achats.`);
  }
  if (partenaireRef && (limites.parClient !== undefined || limites.nouveauxClients)) {
    const p = await tx.partenaire.findUnique({ where: { ref: partenaireRef } });
    if (p && limites.parClient !== undefined && (await tx.commandeVente.count({ where: { ...actives, partenaireId: p.id } })) >= limites.parClient) {
      return refus("Vous avez déjà utilisé ce code.");
    }
    if (p && limites.nouveauxClients && (await tx.commandeVente.count({ where: { partenaireId: p.id, statut: { notIn: ["annulee", "brouillon"] } } })) > 0) {
      return refus("Ce code est réservé à une première commande.");
    }
  }
  return { code: propre, applique: true, motif: null, remisePourcent: Number(promo.remisePourcent ?? 0), cumulable: promo.cumulable };
}

/** Promotions automatiques en cours (ventes flash, remises automatiques) par référence. */
async function promotionsEnCours(tx: Tx, maintenant: Date): Promise<Map<string, { nom: string; remisePourcent: number }>> {
  const promos = await tx.promotion.findMany({ where: { type: { in: ["vente_flash", "remise_automatique"] } } });
  const parRef = new Map<string, { nom: string; remisePourcent: number }>();
  for (const p of promos) {
    // Arrêt à la minute de la date de fin (SC-010).
    if ((p.debut && p.debut > maintenant) || (p.fin && p.fin <= maintenant) || !p.remisePourcent) continue;
    for (const ref of ((p.cible as { defaultCodes?: string[] }).defaultCodes ?? [])) {
      const existante = parRef.get(ref);
      if (!existante || Number(p.remisePourcent) > existante.remisePourcent) parRef.set(ref, { nom: p.nom, remisePourcent: Number(p.remisePourcent) });
    }
  }
  return parRef;
}

function texteCumul(code: CodePromo | null): string {
  const base = "Un seul code promo par commande. Il s'ajoute aux prix dégressifs et aux bons d'achat";
  if (code?.applique && code.cumulable) return `${base}, ainsi qu'aux promotions en cours.`;
  return `${base} ; sur un article déjà en promotion, la remise la plus avantageuse est appliquée.`;
}

export type OptionsDevis = {
  /** Frais de port imposés (jeu de départ de F11, sans mode de livraison). */
  fraisPortImposeHt?: number;
  maintenant?: Date;
};

export async function calculerDevis(demande: DemandeDevis, tx: Tx = db(), options: OptionsDevis = {}): Promise<Devis> {
  const maintenant = options.maintenant ?? new Date();
  const refs = [...new Set(demande.lignes.map((l) => l.defaultCode))];
  const variantes = await tx.variante.findMany({ where: { defaultCode: { in: refs } }, include: { ...INCLURE_DISPONIBILITE, modele: true } });
  const inconnue = refs.find((r) => !variantes.some((v) => v.defaultCode === r));
  if (inconnue) throw new NotFound("Article", inconnue);

  const prix = demande.partenaireRef ? await prixClient(demande.partenaireRef, refs, tx) : [];
  const publiques = (await tx.listePrix.findMany({ where: { partenaireId: null } })).flatMap((l) => l.regles as RegleListePrix[]);
  const promotions = await promotionsEnCours(tx, maintenant);
  // Montant d'achats avant remises, pour le minimum d'un code promo.
  const brutAchats = demande.lignes
    .filter((l) => l.formule === "achat" && !l.offerte)
    .reduce((s, l) => s + (prix.find((p) => p.defaultCode === l.defaultCode)?.prixHt ?? variantes.find((v) => v.defaultCode === l.defaultCode)!.prixHtCentimes) * l.quantite, 0);
  const code = await lireCodePromo(tx, demande.codePromo, maintenant, demande.partenaireRef, brutAchats);

  let remisesAuto = 0;
  let remiseCode = 0;
  const lignes: LigneDevisCalculee[] = demande.lignes.map((l) => {
    const v = variantes.find((x) => x.defaultCode === l.defaultCode)!;
    const libelle = `${v.modele.marque} ${v.modele.nom}${v.configuration ? ` — ${v.configuration}` : ""}${l.offerte ? " (offert)" : ""}`;
    const tauxTva = Number(v.tauxTva);
    if (l.formule === "mise_a_disposition") {
      const mois = v.offreMad?.premierMoisCentimes ?? 0;
      return { defaultCode: v.defaultCode, formule: l.formule, libelle, quantite: l.quantite, prixUnitaireHt: mois, remiseHt: 0, totalHt: mois * l.quantite, tauxTva, offerte: false, promotion: null };
    }
    if (l.offerte) {
      return { defaultCode: v.defaultCode, formule: l.formule, libelle, quantite: l.quantite, prixUnitaireHt: 0, remiseHt: 0, totalHt: 0, tauxTva, offerte: true, promotion: null };
    }
    // Prix unitaire : le plus favorable entre le prix du client et le prix dégressif atteint.
    const palier = publiques
      .filter((r) => r.defaultCode === v.defaultCode && r.quantiteMin && r.prixHtCentimes !== undefined && l.quantite >= r.quantiteMin)
      .sort((a, b) => b.quantiteMin! - a.quantiteMin!)[0];
    const prixUnitaire = Math.min(prix.find((p) => p.defaultCode === v.defaultCode)?.prixHt ?? v.prixHtCentimes, palier?.prixHtCentimes ?? Infinity);
    const brut = prixUnitaire * l.quantite;
    const promo = promotions.get(v.defaultCode);
    const auto = promo ? Math.round((brut * promo.remisePourcent) / 100) : 0;
    const parCode = code?.applique ? Math.round((brut * code.remisePourcent) / 100) : 0;
    let remise: number;
    if (promo && parCode && !code!.cumulable) {
      // Pas de cumul : la remise la plus avantageuse.
      if (parCode > auto) {
        remise = parCode;
        remiseCode += parCode;
      } else {
        remise = auto;
        remisesAuto += auto;
      }
    } else {
      remise = auto + parCode;
      remisesAuto += auto;
      remiseCode += parCode;
    }
    return {
      defaultCode: v.defaultCode,
      formule: l.formule,
      libelle,
      quantite: l.quantite,
      prixUnitaireHt: prixUnitaire,
      remiseHt: remise,
      totalHt: brut - remise,
      tauxTva,
      offerte: false,
      promotion: promo?.nom ?? null,
    };
  });

  const parametres = await tx.parametresVente.findFirst({ orderBy: { id: "desc" } });
  const seuilFranco = parametres?.seuilFrancoCentimes ?? 0;
  const achats = lignes.filter((l) => l.formule === "achat");
  const locations = lignes.filter((l) => l.formule === "mise_a_disposition");

  // --- Bloc « Paiement unique »
  let blocAchat: Devis["achat"] = null;
  let modesLivraison: ModeLivraisonDevis[] = [];
  let modeRetenu: string | null = null;
  if (achats.length) {
    const sousTotal = achats.reduce((s, l) => s + l.prixUnitaireHt * l.quantite, 0);
    const net = achats.reduce((s, l) => s + l.totalHt, 0);

    // Bons d'achat : plafonnés au solde et au montant éligible (consommables et accessoires).
    let bons = 0;
    if (demande.partenaireRef && (demande.bonsDemandesHt ?? 0) > 0) {
      const partenaire = await tx.partenaire.findUnique({ where: { ref: demande.partenaireRef } });
      // F06 : bons encore valables ; utilisables sur les achats (hors port et mises à disposition).
      const solde = partenaire ? await soldeUtilisable(tx, partenaire.id, maintenant) : 0;
      const montantAchats = achats.reduce((s, l) => s + l.totalHt, 0);
      bons = Math.max(0, Math.min(demande.bonsDemandesHt ?? 0, solde, montantAchats));
    }

    // Livraison : modes actifs ; express seulement si tous les articles sont en stock.
    const etats = await etatsAchat(variantes);
    const toutEnStock = achats.every((l) => {
      const v = variantes.find((x) => x.defaultCode === l.defaultCode)!;
      const etat = etats.get(v.defaultCode);
      return etat?.etat === "disponible" && (v.composants.length > 0 || (v.stock?.quantite ?? 0) >= l.quantite);
    });
    const modes = await tx.modeLivraison.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } });
    const francoAtteint = seuilFranco > 0 && net >= seuilFranco;
    // F06 (D5) : une commande de services seuls (assistance à l'acte) n'est pas expédiée.
    const servicesSeuls = achats.every((l) => variantes.find((x) => x.defaultCode === l.defaultCode)?.modele.type === "service");
    modesLivraison = modes.map((m) => ({
      code: m.code,
      libelle: m.libelle,
      forfaitHt: servicesSeuls || (m.franco && francoAtteint) ? 0 : m.forfaitCentimes,
      delaiJours: m.delaiJours,
      disponible: !m.exigeStock || toutEnStock,
      motif: m.exigeStock && !toutEnStock ? "Proposé seulement quand tous les articles sont en stock." : null,
      francoAtteint: m.franco && francoAtteint,
    }));
    const demande_ = modesLivraison.find((m) => m.code === demande.modeLivraison && m.disponible);
    const mode = demande_ ?? modesLivraison.find((m) => m.disponible) ?? null;
    modeRetenu = mode?.code ?? null;
    const port = options.fraisPortImposeHt ?? mode?.forfaitHt ?? 0;
    const specifiques =
      options.fraisPortImposeHt !== undefined
        ? 0
        : achats.reduce((s, l) => {
            const v = variantes.find((x) => x.defaultCode === l.defaultCode)!;
            return s + ((v.fraisLivraisonCentimes ?? 0) + (v.fraisInstallationCentimes ?? 0)) * l.quantite;
          }, 0);

    const totalHt = net + port + specifiques - bons;
    const montantTva = achats.reduce((s, l) => s + tva(l.totalHt, l.tauxTva), 0) + tva(port + specifiques, TVA_FRAIS) - tva(bons, TVA_FRAIS);
    blocAchat = {
      sousTotalHt: sousTotal,
      remisesAutomatiquesHt: remisesAuto,
      remiseCodePromoHt: remiseCode,
      bonsHt: bons,
      fraisPortHt: port,
      fraisSpecifiquesHt: specifiques,
      totalHt,
      tva: montantTva,
      totalTtc: totalHt + montantTva,
    };
  }

  // --- Bloc « Abonnement mensuel »
  let blocAbonnement: Devis["abonnement"] = null;
  if (locations.length) {
    let premier = 0;
    let suivants = 0;
    let premierTtc = 0;
    let suivantsTtc = 0;
    for (const l of locations) {
      const v = variantes.find((x) => x.defaultCode === l.defaultCode)!;
      const p = (v.offreMad?.premierMoisCentimes ?? 0) * l.quantite;
      const s = (v.offreMad?.moisSuivantsCentimes ?? 0) * l.quantite;
      premier += p;
      suivants += s;
      premierTtc += p + tva(p, Number(v.tauxTva));
      suivantsTtc += s + tva(s, Number(v.tauxTva));
    }
    blocAbonnement = { premierMoisHt: premier, moisSuivantsHt: suivants, premierMoisTtc: premierTtc, moisSuivantsTtc: suivantsTtc };
  }

  return {
    lignes,
    achat: blocAchat,
    abonnement: blocAbonnement,
    codePromo: code ? { code: code.code, applique: code.applique, motif: code.motif } : null,
    regleCumul: texteCumul(code),
    modesLivraison,
    modeLivraison: modeRetenu,
    seuilFrancoHt: seuilFranco,
    estFictif: true,
  };
}
