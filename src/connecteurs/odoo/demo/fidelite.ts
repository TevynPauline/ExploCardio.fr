import type { Prisma } from "@generated/demo/client";
import { NotFound } from "../../erreurs";
import { disponibiliteAchat, INCLURE_DISPONIBILITE } from "./disponibilite";
import type {
  Cagnotte,
  ChangementFidelite,
  DroitsAssistance,
  EstimationGains,
  EvenementDroits,
  FideliteOdoo,
  Intervention,
  LigneNouvelleCommande,
  MouvementCagnotte,
  OffreBienvenue,
  PromotionAnnoncee,
  ReglesProgramme,
  TypeMouvement,
} from "../interfaces";
import { prixClient } from "./catalogue";
import { ajouterJours, ajouterMois, db, type Tx } from "./outils";

// Domaine « Fidélité » en démonstration : applique les règles de F06 COMME LE FERA ODOO, à
// partir des paramètres de la base de démonstration (principe III). Ce calcul n'existe qu'en
// mode démonstration ; en mode réel, c'est Odoo qui calcule (F06, FR-019 et FR-020). Le jeu de
// commandes de référence des tests de contrat vérifie que les deux modes concordent (FR-039).

export type Palier = { plancherCentimes: number; inclusif: boolean; tauxPourcent: number };

/** Paliers par défaut de F06 : 0 % sous 500 €, 5 % de 500 € à 1 000 €, 10 % au-delà. */
export const PALIERS_PAR_DEFAUT: Palier[] = [
  { plancherCentimes: 0, inclusif: true, tauxPourcent: 0 },
  { plancherCentimes: 50_000, inclusif: true, tauxPourcent: 5 },
  { plancherCentimes: 100_000, inclusif: false, tauxPourcent: 10 },
];

export const ARTICLE_ASSISTANCE_ACTE = "EC-ASSISTANCE-ACTE";
/** Bons rendus déjà expirés : délai de grâce (hypothèse confirmée de F06). */
export const GRACE_RESTITUTION_JOURS = 30;

/** Règles figées sur une commande au paiement (FR-016, FR-021). */
export type ReglesFigees = {
  paliers: Palier[];
  validiteMois: number;
  seuilCentimes: number;
  dureeJours: number;
  prolongation: string;
  plafondJours: number;
};

const STATUTS_PAYES = ["payee", "confirmee", "en_preparation", "expediee", "livree", "remboursee_partiellement"];
const STATUTS_ANNULES = ["annulee", "remboursee"];

/** Taux du palier atteint, appliqué à la totalité du montant éligible (F06, FR-007). */
export function tauxDuPalier(paliers: Palier[], montantEligible: number): number {
  let taux = 0;
  for (const p of [...paliers].sort((a, b) => a.plancherCentimes - b.plancherCentimes)) {
    const atteint = p.inclusif ? montantEligible >= p.plancherCentimes : montantEligible > p.plancherCentimes;
    if (atteint) taux = p.tauxPourcent;
  }
  return taux;
}

/** Palier suivant : montant encore nécessaire et taux, ou null au dernier palier. */
export function palierSuivant(paliers: Palier[], montantEligible: number): { manqueHt: number; tauxPourcent: number } | null {
  const actuel = tauxDuPalier(paliers, montantEligible);
  for (const p of [...paliers].sort((a, b) => a.plancherCentimes - b.plancherCentimes)) {
    if (p.tauxPourcent <= actuel) continue;
    const cible = p.inclusif ? p.plancherCentimes : p.plancherCentimes + 1;
    if (cible > montantEligible) return { manqueHt: cible - montantEligible, tauxPourcent: p.tauxPourcent };
  }
  return null;
}

export async function reglesEnVigueur(tx: Tx): Promise<ReglesFigees & { prixActeCentimes: number }> {
  const programme = await tx.programmeFidelite.findFirst({ orderBy: { id: "desc" } });
  const assistance = await tx.regleAssistance.findFirst({ orderBy: { id: "desc" } });
  if (!programme || !assistance) {
    throw new Error("Base de démonstration incomplète : programme de fidélité absent (lancez npm run demo:seed).");
  }
  return {
    paliers: programme.paliers as Palier[],
    validiteMois: programme.validiteMois,
    seuilCentimes: assistance.seuilCentimes,
    dureeJours: assistance.dureeJours,
    prolongation: assistance.prolongation,
    plafondJours: assistance.plafondJours,
    prixActeCentimes: assistance.prixActeCentimes,
  };
}

export async function soldeCagnotte(tx: Tx, partenaireId: number): Promise<number> {
  const somme = await tx.mouvementCagnotte.aggregate({ where: { partenaireId }, _sum: { montantCentimes: true } });
  return somme._sum.montantCentimes ?? 0;
}

/** Bons utilisables : reste des lots encore valables (FR-011). */
export async function soldeUtilisable(tx: Tx, partenaireId: number, maintenant = new Date()): Promise<number> {
  const somme = await tx.lotBons.aggregate({ where: { partenaireId, resteCentimes: { gt: 0 }, validiteFin: { gt: maintenant } }, _sum: { resteCentimes: true } });
  return somme._sum.resteCentimes ?? 0;
}

type LigneEvaluee = { net: number; eligible: boolean };

/**
 * Montant éligible (F06, FR-008 et FR-009) : consommables et accessoires seulement, hors frais
 * de port, remises, lignes à 0 € et part payée en bons d'achat.
 */
function montantEligible(lignes: LigneEvaluee[], bonsUtilises: number): number {
  const brut = lignes.filter((l) => l.eligible && l.net > 0).reduce((s, l) => s + l.net, 0);
  return Math.max(0, brut - bonsUtilises);
}

/** Nouvelle date de fin des droits après une commande éligible (F06, FR-003). */
function prolonger(finActuelle: Date | null, dateCommande: Date, regle: { dureeJours: number; prolongation: string; plafondJours: number }): Date {
  const plafond = ajouterJours(dateCommande, regle.plafondJours);
  const base = finActuelle && finActuelle > dateCommande ? finActuelle : dateCommande;
  const candidate = regle.prolongation === "remise_a_zero" ? ajouterJours(dateCommande, regle.dureeJours) : ajouterJours(base, regle.dureeJours);
  // Aucune règle ne raccourcit une période acquise.
  const plafonnee = candidate > plafond ? plafond : candidate;
  return finActuelle && finActuelle > plafonnee ? finActuelle : plafonnee;
}

function versMouvement(m: { type: string; montantCentimes: number; date: Date; validiteFin: Date | null; motif: string | null; commande: { ref: string } | null }): MouvementCagnotte {
  return { type: m.type as TypeMouvement, montantHt: m.montantCentimes, commandeRef: m.commande?.ref ?? null, date: m.date, validiteFin: m.validiteFin, motif: m.motif };
}

// ------------------------------------------------------------------ Lots de bons (R3)

/** Crée un lot et son mouvement (crédit, restitution ou ajustement positif). */
async function crediterLot(
  tx: Tx,
  d: { partenaireId: number; commandeId: number | null; type: TypeMouvement; montant: number; validiteFin: Date; cle: string; regles?: object; motif?: string; auteur?: string; date?: Date },
) {
  if (d.montant <= 0 || (await tx.mouvementCagnotte.findUnique({ where: { cle: d.cle } }))) return null;
  const lot = await tx.lotBons.create({
    data: { partenaireId: d.partenaireId, origine: d.type, montantInitialCentimes: d.montant, resteCentimes: d.montant, validiteFin: d.validiteFin, commandeId: d.commandeId },
  });
  return tx.mouvementCagnotte.create({
    data: {
      partenaireId: d.partenaireId,
      type: d.type,
      montantCentimes: d.montant,
      commandeId: d.commandeId,
      cle: d.cle,
      validiteFin: d.validiteFin,
      lotId: lot.id,
      regles: d.regles as Prisma.InputJsonValue | undefined,
      motif: d.motif,
      auteur: d.auteur,
      ...(d.date ? { date: d.date } : {}),
    },
    include: { commande: true },
  });
}

/**
 * Consomme des bons dans l'ordre de leur fin de validité (FR-012) ; un mouvement négatif par lot.
 * `priorite` : lots consommés d'abord (retrait des bons crédités par une commande). Renvoie le
 * montant effectivement consommé (le reste manquait).
 */
export async function consommerLots(
  tx: Tx,
  d: { partenaireId: number; commandeId: number | null; type: TypeMouvement; montant: number; cle: string; priorite?: number[]; motif?: string; auteur?: string; maintenant?: Date },
): Promise<number> {
  if (d.montant <= 0) return 0;
  const maintenant = d.maintenant ?? new Date();
  const lots = await tx.lotBons.findMany({ where: { partenaireId: d.partenaireId, resteCentimes: { gt: 0 }, validiteFin: { gt: maintenant } }, orderBy: [{ validiteFin: "asc" }, { id: "asc" }] });
  const ordonnes = [...lots.filter((l) => d.priorite?.includes(l.id)), ...lots.filter((l) => !d.priorite?.includes(l.id))];
  let reste = d.montant;
  let consomme = 0;
  for (const lot of ordonnes) {
    if (reste <= 0) break;
    const cle = `${d.cle}:${lot.id}`;
    if (await tx.mouvementCagnotte.findUnique({ where: { cle } })) continue;
    const pris = Math.min(reste, lot.resteCentimes);
    await tx.lotBons.update({ where: { id: lot.id }, data: { resteCentimes: { decrement: pris } } });
    await tx.mouvementCagnotte.create({
      data: { partenaireId: d.partenaireId, type: d.type, montantCentimes: -pris, commandeId: d.commandeId, cle, lotId: lot.id, validiteFin: lot.validiteFin, motif: d.motif, auteur: d.auteur },
    });
    reste -= pris;
    consomme += pris;
  }
  return consomme;
}

/** Utilisation des bons à la création d'une commande (appelée par commandes.ts). */
export async function utiliserBons(tx: Tx, partenaireId: number, commandeId: number, ref: string, montant: number) {
  const pris = await consommerLots(tx, { partenaireId, commandeId, type: "utilisation", montant, cle: `utilisation:${ref}` });
  if (pris < montant) throw new Error(`Solde de bons insuffisant pour la commande ${ref}.`);
}

/**
 * Bons utilisés par une commande annulée ou remboursée, rendus à leur validité d'origine ;
 * déjà expirés, ils bénéficient de 30 jours de grâce (FR-017, hypothèse confirmée).
 */
export async function restituerBons(tx: Tx, commandeId: number, maintenant = new Date()) {
  const utilisations = await tx.mouvementCagnotte.findMany({ where: { commandeId, type: "utilisation" }, include: { lot: true } });
  for (const u of utilisations) {
    const origine = u.lot?.validiteFin ?? u.validiteFin ?? maintenant;
    const validite = origine > maintenant ? origine : ajouterJours(maintenant, GRACE_RESTITUTION_JOURS);
    await crediterLot(tx, { partenaireId: u.partenaireId, commandeId, type: "restitution", montant: -u.montantCentimes, validiteFin: validite, cle: `restitution:${u.cle}` });
  }
}

// ------------------------------------------------------------------ Droits d'assistance

async function noterDroits(tx: Tx, partenaireId: number, e: EvenementDroits) {
  const d = await tx.droitAssistance.findUnique({ where: { partenaireId } });
  if (!d) return;
  const historique = Array.isArray(d.historique) ? (d.historique as object[]) : [];
  await tx.droitAssistance.update({ where: { partenaireId }, data: { historique: [...historique, { ...e, date: e.date.toISOString(), fin: e.fin.toISOString() }] as Prisma.InputJsonValue } });
}

function versEvenements(brut: unknown): EvenementDroits[] {
  return (Array.isArray(brut) ? (brut as { date: string; type: EvenementDroits["type"]; commandeRef?: string | null; fin: string; motif?: string | null }[]) : []).map((e) => ({
    date: new Date(e.date),
    type: e.type,
    commandeRef: e.commandeRef ?? null,
    fin: new Date(e.fin),
    motif: e.motif ?? null,
  }));
}

async function partenaire(tx: Tx, ref: string) {
  const p = await tx.partenaire.findUnique({ where: { ref } });
  if (!p) throw new NotFound("Partenaire", ref);
  return p;
}

/** Applique les règles à une commande (FR-001 à FR-018). Idempotent ; appelé par Odoo à chaque changement d'état. */
export async function appliquerReglesTx(tx: Tx, commandeRef: string, maintenant = new Date()): Promise<MouvementCagnotte[]> {
  const c = await tx.commandeVente.findUnique({
    where: { ref: commandeRef },
    include: { lignes: { include: { variante: { include: { modele: true } } } }, mouvements: true, remboursements: { where: { etat: "execute" } } },
  });
  if (!c) throw new NotFound("Commande", commandeRef);
  const annulee = STATUTS_ANNULES.includes(c.statut);
  const payee = STATUTS_PAYES.includes(c.statut);
  const avant = new Set(c.mouvements.map((m) => m.id));

  // Bons utilisés rendus si la commande est annulée ou remboursée (y compris un virement jamais payé).
  if (annulee) await restituerBons(tx, c.id, maintenant);
  if (!payee && !annulee) return [];
  if (!c.reglesFidelite && !payee) return collecter(tx, c.id, avant); // annulée sans avoir été payée : rien n'a été crédité

  // Règles figées au premier paiement (FR-016, FR-021).
  let regles = c.reglesFidelite as ReglesFigees | null;
  if (!regles) {
    const r = await reglesEnVigueur(tx);
    regles = { paliers: r.paliers, validiteMois: r.validiteMois, seuilCentimes: r.seuilCentimes, dureeJours: r.dureeJours, prolongation: r.prolongation, plafondJours: r.plafondJours };
    await tx.commandeVente.update({ where: { id: c.id }, data: { reglesFidelite: regles } });
  }

  // 1. Bons d'achat : crédit au montant éligible restant après remboursements, au taux figé.
  const eligible = c.financee
    ? 0
    : montantEligible(
        c.lignes.map((l) => ({ net: l.prixUnitaireHtCentimes * l.quantite - l.remiseCentimes, eligible: l.variante.modele.eligibleBonsAchat })),
        c.bonsUtilisesCentimes,
      );
  const rembourse = c.remboursements.reduce((s, r) => s + r.montantTtcCentimes, 0);
  const restant = annulee || c.montantTtcCentimes === 0 ? 0 : Math.round(eligible * Math.max(0, 1 - rembourse / c.montantTtcCentimes));
  const taux = tauxDuPalier(regles.paliers, restant);
  const cible = Math.round((restant * taux) / 100);
  const credite = c.mouvements.filter((m) => m.type === "credit").reduce((s, m) => s + m.montantCentimes, 0);
  const retire = -c.mouvements.filter((m) => m.type === "retrait").reduce((s, m) => s + m.montantCentimes, 0) + c.bonsManquantsCentimes;
  const ecart = cible - (credite - retire);
  const reglesAppliquees = { ...regles, tauxPourcent: taux, montantEligibleCentimes: restant };
  if (ecart > 0) {
    await crediterLot(tx, { partenaireId: c.partenaireId, commandeId: c.id, type: "credit", montant: ecart, validiteFin: ajouterMois(c.date, regles.validiteMois), cle: `credit:${c.ref}:${cible}`, regles: reglesAppliquees, date: maintenant });
  } else if (ecart < 0) {
    // Les bons crédités par la commande sont repris d'abord, puis les autres dans l'ordre d'expiration.
    const lotsCommande = (await tx.lotBons.findMany({ where: { commandeId: c.id, origine: "credit" } })).map((l) => l.id);
    const pris = await consommerLots(tx, { partenaireId: c.partenaireId, commandeId: c.id, type: "retrait", montant: -ecart, cle: `retrait:${c.ref}:${cible}`, priorite: lotsCommande, maintenant });
    // Bons déjà dépensés : le montant manquant est déduit du remboursement (D4).
    if (pris < -ecart) await tx.commandeVente.update({ where: { id: c.id }, data: { bonsManquantsCentimes: { increment: -ecart - pris } } });
  }

  // 2. Droits d'assistance : ouverts ou prolongés par une commande éligible, retirés si elle est annulée.
  const droit = await tx.droitAssistance.findUnique({ where: { partenaireId: c.partenaireId } });
  const apports = (droit?.apports ?? {}) as Record<string, number>;
  const dejaApporte = apports[c.ref];
  if (!annulee && dejaApporte === undefined && eligible >= regles.seuilCentimes) {
    const nouvelleFin = prolonger(droit?.fin ?? null, c.date, regles);
    const ancienneFin = droit && droit.fin > c.date ? droit.fin : c.date;
    const jours = Math.max(0, Math.round((nouvelleFin.getTime() - ancienneFin.getTime()) / 86_400_000));
    const actif = Boolean(droit && droit.fin > c.date);
    await tx.droitAssistance.upsert({
      where: { partenaireId: c.partenaireId },
      create: { partenaireId: c.partenaireId, fin: nouvelleFin, origine: c.ref, apports: { [c.ref]: jours } },
      update: { fin: nouvelleFin, origine: c.ref, apports: { ...apports, [c.ref]: jours } },
    });
    await noterDroits(tx, c.partenaireId, { date: maintenant, type: actif ? "prolongation" : "ouverture", commandeRef: c.ref, fin: nouvelleFin, motif: null });
  } else if (annulee && droit && dejaApporte !== undefined) {
    const { [c.ref]: jours, ...reste } = apports;
    const fin = ajouterJours(droit.fin, -(jours ?? 0));
    await tx.droitAssistance.update({ where: { partenaireId: c.partenaireId }, data: { fin, apports: reste } });
    await noterDroits(tx, c.partenaireId, { date: maintenant, type: "retrait", commandeRef: c.ref, fin, motif: null });
  }
  return collecter(tx, c.id, avant);
}

async function collecter(tx: Tx, commandeId: number, avant: Set<number>): Promise<MouvementCagnotte[]> {
  const tous = await tx.mouvementCagnotte.findMany({ where: { commandeId }, include: { commande: true }, orderBy: { id: "asc" } });
  return tous.filter((m) => !avant.has(m.id)).map(versMouvement);
}

/** Estimation des gains d'un panier (FR-024) ; sans client : prix publics, droits inconnus. */
async function estimer(partenaireRef: string | null, lignes: LigneNouvelleCommande[]): Promise<EstimationGains> {
  const tx = db();
  const r = await reglesEnVigueur(tx);
  const codes = lignes.map((l) => l.defaultCode);
  const variantes = await tx.variante.findMany({ where: { defaultCode: { in: codes } }, include: { modele: true } });
  const prix = partenaireRef ? await prixClient(partenaireRef, codes, tx) : variantes.map((v) => ({ defaultCode: v.defaultCode, prixHt: v.prixHtCentimes }));
  const evaluees = lignes.map((l) => ({
    net: l.offerte ? 0 : (prix.find((p) => p.defaultCode === l.defaultCode)?.prixHt ?? 0) * l.quantite,
    eligible: variantes.find((v) => v.defaultCode === l.defaultCode)?.modele.eligibleBonsAchat ?? false,
  }));
  const eligible = montantEligible(evaluees, 0);
  const taux = tauxDuPalier(r.paliers, eligible);
  const finDroits = partenaireRef ? ((await tx.droitAssistance.findFirst({ where: { partenaire: { ref: partenaireRef } } }))?.fin ?? null) : null;
  return {
    montantEligibleHt: eligible,
    tauxPourcent: taux,
    bonsAchatHt: Math.round((eligible * taux) / 100),
    droitsJusquAu: eligible >= r.seuilCentimes ? prolonger(finDroits, new Date(), r) : null,
    seuilDroitsHt: r.seuilCentimes,
    palierSuivant: palierSuivant(r.paliers, eligible),
  };
}

export const fideliteDemo: FideliteOdoo = {
  async lireCagnotte(partenaireRef: string): Promise<Cagnotte> {
    const p = await partenaire(db(), partenaireRef);
    const maintenant = new Date();
    const [mouvements, lots] = await Promise.all([
      db().mouvementCagnotte.findMany({ where: { partenaireId: p.id }, include: { commande: true }, orderBy: [{ date: "desc" }, { id: "desc" }] }),
      db().lotBons.findMany({ where: { partenaireId: p.id, resteCentimes: { gt: 0 }, validiteFin: { gt: maintenant } }, include: { commande: true }, orderBy: { validiteFin: "asc" } }),
    ]);
    const solde = mouvements.reduce((s, m) => s + m.montantCentimes, 0);
    const premier = lots[0];
    return {
      soldeHt: solde,
      mouvements: mouvements.map(versMouvement),
      lots: lots.map((l) => ({ resteHt: l.resteCentimes, validiteFin: l.validiteFin, commandeRef: l.commande?.ref ?? null })),
      prochaineExpiration: premier ? { date: premier.validiteFin, montantHt: lots.filter((l) => l.validiteFin.getTime() === premier.validiteFin.getTime()).reduce((s, l) => s + l.resteCentimes, 0) } : null,
    };
  },

  async lireDroitsAssistance(partenaireRef: string): Promise<DroitsAssistance> {
    const p = await db().partenaire.findUnique({ where: { ref: partenaireRef }, include: { droits: true } });
    if (!p) throw new NotFound("Partenaire", partenaireRef);
    const d = p.droits;
    const historique = versEvenements(d?.historique);
    if (d && d.fin > new Date()) return { statut: "actif", fin: d.fin, origine: d.origine, historique };
    return { statut: "inactif", fin: d?.fin ?? null, origine: d?.origine ?? null, historique };
  },

  estimerGains: estimer,

  async lireOffreBienvenue(): Promise<OffreBienvenue | null> {
    // Programme de fidélité de type « cadeau de bienvenue » (vocabulaire d'Odoo).
    const programme = await db().promotion.findFirst({ where: { type: "bienvenue" }, orderBy: { id: "desc" } });
    const code = (programme?.cible as { defaultCode?: string } | null)?.defaultCode;
    if (!code) return null;
    const v = await db().variante.findUnique({ where: { defaultCode: code }, include: INCLURE_DISPONIBILITE });
    if (!v) return null;
    return { defaultCode: v.defaultCode, disponibilite: disponibiliteAchat(v) };
  },

  async appliquerRegles(commandeRef: string) {
    return { mouvements: await db().$transaction((tx) => appliquerReglesTx(tx, commandeRef)) };
  },

  async listerChangementsDepuis(depuis: Date): Promise<ChangementFidelite[]> {
    const [mouvements, droits, interventions] = await Promise.all([
      db().mouvementCagnotte.findMany({ where: { date: { gt: depuis } }, include: { commande: true, partenaire: true }, orderBy: { id: "asc" } }),
      db().droitAssistance.findMany({ where: { modifieLe: { gt: depuis } }, include: { partenaire: true } }),
      db().interventionPayee.findMany({ where: { modifieLe: { gt: depuis } }, include: { partenaire: true, commande: true } }),
    ]);
    return [
      ...mouvements.map((m) => ({ genre: "mouvement" as const, cle: `mouvement:${m.id}`, partenaireRef: m.partenaire.ref, mouvement: versMouvement(m) })),
      ...droits.flatMap((d) =>
        versEvenements(d.historique)
          .filter((e) => e.date > depuis)
          .map((e) => ({ genre: "droits" as const, cle: `droits:${d.partenaire.ref}:${e.type}:${e.date.toISOString()}`, partenaireRef: d.partenaire.ref, evenement: e })),
      ),
      ...interventions.map((i) => ({ genre: "intervention" as const, cle: `intervention:${i.id}:${i.etat}`, partenaireRef: i.partenaire.ref, intervention: versIntervention(i) })),
    ];
  },

  async lireReglesProgramme(): Promise<ReglesProgramme> {
    const r = await reglesEnVigueur(db());
    return {
      paliers: r.paliers.map((p) => ({ plancherHt: p.plancherCentimes, inclusif: p.inclusif, tauxPourcent: p.tauxPourcent })),
      validiteMois: r.validiteMois,
      seuilDroitsHt: r.seuilCentimes,
      dureeDroitsJours: r.dureeJours,
      prolongation: r.prolongation === "remise_a_zero" ? "remise_a_zero" : "cumul",
      plafondDroitsJours: r.plafondJours,
      prixAssistanceActeHt: r.prixActeCentimes,
      articleAssistanceActe: ARTICLE_ASSISTANCE_ACTE,
    };
  },

  async listerInterventions(partenaireRef: string): Promise<Intervention[]> {
    const p = await partenaire(db(), partenaireRef);
    const liste = await db().interventionPayee.findMany({ where: { partenaireId: p.id }, include: { commande: true }, orderBy: { acheteeLe: "desc" } });
    return liste.map(versIntervention);
  },

  async promotionsEnCours(date: Date): Promise<PromotionAnnoncee[]> {
    const promos = await db().promotion.findMany({
      where: {
        OR: [{ type: { in: ["remise_automatique", "vente_flash"] } }, { type: "code_promo", annoncee: true }],
        AND: [{ OR: [{ debut: null }, { debut: { lte: date } }] }, { OR: [{ fin: null }, { fin: { gt: date } }] }],
      },
      orderBy: { fin: "asc" },
    });
    const resultat: PromotionAnnoncee[] = [];
    for (const p of promos) {
      const codes = (p.cible as { defaultCodes?: string[] }).defaultCodes ?? [];
      const variantes = codes.length ? await db().variante.findMany({ where: { defaultCode: { in: codes } } }) : [];
      const pourcent = p.remisePourcent ? Number(p.remisePourcent) : null;
      resultat.push({
        nom: p.nom,
        type: p.type as PromotionAnnoncee["type"],
        code: p.code,
        remisePourcent: pourcent,
        fin: p.fin,
        articles: variantes.map((v) => ({
          defaultCode: v.defaultCode,
          prixHt: v.prixHtCentimes,
          prixRemiseHt: pourcent ? Math.round(v.prixHtCentimes * (1 - pourcent / 100)) : Math.max(0, v.prixHtCentimes - (p.remiseCentimes ?? 0)),
        })),
      });
    }
    return resultat;
  },
};

function versIntervention(i: { id: number; etat: string; acheteeLe: Date; consommeeLe: Date | null; commande: { ref: string } }): Intervention {
  return { id: String(i.id), etat: i.etat === "consommee" ? "consommee" : "disponible", acheteeLe: i.acheteeLe, consommeeLe: i.consommeeLe, commandeRef: i.commande.ref };
}
