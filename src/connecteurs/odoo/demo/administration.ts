import { NotFound } from "../../erreurs";
import type { Palier } from "./fidelite";
import { db } from "./outils";

// Opérations réservées au mode démonstration (T061, FR-024, FR-026) : modifier les prix, les
// stocks et les paramètres commerciaux FICTIFS. Elles n'existent pas en mode réel : ces
// réglages se font alors dans Odoo (FR-027). Toute valeur incohérente est refusée, avec
// l'explication.

export class ValeurRefusee extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValeurRefusee";
  }
}

function entierPositif(valeur: number, libelle: string, { zero = true } = {}) {
  if (!Number.isFinite(valeur) || !Number.isInteger(valeur)) throw new ValeurRefusee(`${libelle} : nombre entier attendu.`);
  if (valeur < 0 || (!zero && valeur === 0)) {
    throw new ValeurRefusee(`${libelle} : ${zero ? "une valeur négative" : "une valeur nulle ou négative"} n'est pas acceptée.`);
  }
}

// ------------------------------------------------------------------ Consultation

export async function apercuBase() {
  const [variantes, regles, programme, promotions] = await Promise.all([
    db().variante.findMany({
      include: { modele: { include: { categorie: true } }, stock: true, offreMad: true },
      orderBy: [{ modele: { categorie: { ordre: "asc" } } }, { modele: { marque: "asc" } }, { defaultCode: "asc" }],
    }),
    db().regleAssistance.findFirst({ orderBy: { id: "desc" } }),
    db().programmeFidelite.findFirst({ orderBy: { id: "desc" } }),
    db().promotion.findMany({ orderBy: { id: "asc" } }),
  ]);
  const compteurs = {
    partenaires: await db().partenaire.count(),
    commandes: await db().commandeVente.count(),
    factures: await db().facture.count(),
    abonnements: await db().abonnement.count(),
    accesCloud: await db().accesCloud.count(),
  };
  return { variantes, regles, programme, promotions, compteurs };
}

// ------------------------------------------------------------------ Prix et stocks

export async function modifierPrix(defaultCode: string, prixHtCentimes: number) {
  entierPositif(prixHtCentimes, "Prix HT", { zero: false });
  const v = await db().variante.findUnique({ where: { defaultCode } });
  if (!v) throw new NotFound("Article", defaultCode);
  await db().variante.update({ where: { defaultCode }, data: { prixHtCentimes, prixInvente: true } });
  return { avant: v.prixHtCentimes, apres: prixHtCentimes };
}

export type ModificationStock = {
  quantite: number;
  etatHorsStock: "delai" | "indisponible";
  delaiJours: number | null;
};

export async function modifierStock(defaultCode: string, m: ModificationStock) {
  entierPositif(m.quantite, "Quantité");
  if (m.etatHorsStock === "delai") {
    if (m.delaiJours === null) throw new ValeurRefusee("Délai : indiquez un nombre de jours pour l'état « délai ».");
    entierPositif(m.delaiJours, "Délai en jours", { zero: false });
  }
  const v = await db().variante.findUnique({ where: { defaultCode }, include: { stock: true } });
  if (!v) throw new NotFound("Article", defaultCode);
  const data = {
    quantite: m.quantite,
    etatHorsStock: m.etatHorsStock,
    delaiJours: m.etatHorsStock === "delai" ? m.delaiJours : null,
  };
  await db().stock.upsert({ where: { varianteId: v.id }, create: { varianteId: v.id, ...data }, update: data });
  return { avant: v.stock, apres: data };
}

// ------------------------------------------------------------------ Paramètres commerciaux

/** Paliers valides : le premier commence à 0 €, planchers croissants, taux entre 0 et 100 %. */
export function validerPaliers(paliers: Palier[]): Palier[] {
  if (paliers.length === 0) throw new ValeurRefusee("Paliers : au moins un palier est nécessaire.");
  const tries = [...paliers].sort((a, b) => a.plancherCentimes - b.plancherCentimes);
  if (tries[0]!.plancherCentimes !== 0) {
    throw new ValeurRefusee("Paliers : le premier palier doit commencer à 0 €, sinon une partie des montants n'a aucun taux (trou).");
  }
  for (let i = 0; i < tries.length; i++) {
    const p = tries[i]!;
    entierPositif(p.plancherCentimes, "Plancher du palier");
    if (!(p.tauxPourcent >= 0 && p.tauxPourcent <= 100)) throw new ValeurRefusee("Paliers : un taux doit être compris entre 0 et 100 %.");
    const precedent = tries[i - 1];
    if (precedent && precedent.plancherCentimes === p.plancherCentimes) {
      throw new ValeurRefusee("Paliers : deux paliers ne peuvent pas commencer au même montant (chevauchement).");
    }
  }
  return tries;
}

export type ParametresCommerciaux = {
  paliers: Palier[];
  validiteBonsMois: number;
  seuilDroitsCentimes: number;
  dureeDroitsJours: number;
  prolongation: "cumul" | "remise_a_zero";
  plafondDroitsJours: number;
  prixAssistanceActeCentimes: number;
};

export async function lireParametresCommerciaux(): Promise<ParametresCommerciaux> {
  const programme = await db().programmeFidelite.findFirstOrThrow({ orderBy: { id: "desc" } });
  const regle = await db().regleAssistance.findFirstOrThrow({ orderBy: { id: "desc" } });
  return {
    paliers: programme.paliers as Palier[],
    validiteBonsMois: programme.validiteMois,
    seuilDroitsCentimes: regle.seuilCentimes,
    dureeDroitsJours: regle.dureeJours,
    prolongation: regle.prolongation as "cumul" | "remise_a_zero",
    plafondDroitsJours: regle.plafondJours,
    prixAssistanceActeCentimes: regle.prixActeCentimes,
  };
}

export async function modifierParametresCommerciaux(p: ParametresCommerciaux) {
  const paliers = validerPaliers(p.paliers);
  entierPositif(p.validiteBonsMois, "Validité des bons (mois)", { zero: false });
  entierPositif(p.seuilDroitsCentimes, "Seuil des droits d'assistance");
  entierPositif(p.dureeDroitsJours, "Durée des droits (jours)", { zero: false });
  entierPositif(p.plafondDroitsJours, "Plafond des droits (jours)", { zero: false });
  entierPositif(p.prixAssistanceActeCentimes, "Prix de l'assistance à l'acte", { zero: false });
  if (p.plafondDroitsJours < p.dureeDroitsJours) {
    throw new ValeurRefusee("Plafond des droits : il ne peut pas être inférieur à la durée des droits.");
  }
  if (p.prolongation !== "cumul" && p.prolongation !== "remise_a_zero") {
    throw new ValeurRefusee("Règle de prolongation : « cumul » ou « remise à zéro » attendu.");
  }
  const avant = await lireParametresCommerciaux();
  await db().$transaction(async (tx) => {
    const programme = await tx.programmeFidelite.findFirstOrThrow({ orderBy: { id: "desc" } });
    await tx.programmeFidelite.update({ where: { id: programme.id }, data: { paliers, validiteMois: p.validiteBonsMois } });
    const regle = await tx.regleAssistance.findFirstOrThrow({ orderBy: { id: "desc" } });
    await tx.regleAssistance.update({
      where: { id: regle.id },
      data: {
        seuilCentimes: p.seuilDroitsCentimes,
        dureeJours: p.dureeDroitsJours,
        prolongation: p.prolongation,
        plafondJours: p.plafondDroitsJours,
        prixActeCentimes: p.prixAssistanceActeCentimes,
      },
    });
  });
  return { avant, apres: { ...p, paliers } };
}

export async function modifierOffreMad(defaultCode: string, premierMoisCentimes: number, moisSuivantsCentimes: number) {
  entierPositif(premierMoisCentimes, "Prix du premier mois");
  entierPositif(moisSuivantsCentimes, "Prix des mois suivants", { zero: false });
  const v = await db().variante.findUnique({ where: { defaultCode }, include: { offreMad: true } });
  if (!v?.offreMad) throw new NotFound("Offre de mise à disposition", defaultCode);
  await db().offreMiseADisposition.update({
    where: { id: v.offreMad.id },
    data: { premierMoisCentimes, moisSuivantsCentimes },
  });
  return {
    avant: { premierMois: v.offreMad.premierMoisCentimes, moisSuivants: v.offreMad.moisSuivantsCentimes },
    apres: { premierMois: premierMoisCentimes, moisSuivants: moisSuivantsCentimes },
  };
}

export async function modifierRemisePromotion(id: number, remisePourcent: number) {
  if (!(remisePourcent > 0 && remisePourcent < 100)) {
    throw new ValeurRefusee("Remise : un pourcentage strictement compris entre 0 et 100 est attendu.");
  }
  const promo = await db().promotion.findUnique({ where: { id } });
  if (!promo) throw new NotFound("Promotion", String(id));
  await db().promotion.update({ where: { id }, data: { remisePourcent } });
  return { avant: promo.remisePourcent ? Number(promo.remisePourcent) : null, apres: remisePourcent };
}
