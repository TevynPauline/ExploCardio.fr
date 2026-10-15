import { NotFound } from "../../erreurs";
import type {
  Cagnotte,
  DroitsAssistance,
  EstimationGains,
  FideliteOdoo,
  LigneNouvelleCommande,
  MouvementCagnotte,
  TypeMouvement,
} from "../interfaces";
import { prixClient } from "./catalogue";
import { ajouterJours, ajouterMois, db, type Tx } from "./outils";

// Domaine « Fidélité » en démonstration : applique les règles de F06 COMME LE FERA ODOO, à
// partir des paramètres de la base de démonstration (principe III). Ce calcul n'existe qu'en
// mode démonstration ; en mode réel, c'est Odoo qui calcule (F06, FR-019 et FR-020).

export type Palier = { plancherCentimes: number; inclusif: boolean; tauxPourcent: number };

/** Paliers par défaut de F06 : 0 % sous 500 €, 5 % de 500 € à 1 000 €, 10 % au-delà. */
export const PALIERS_PAR_DEFAUT: Palier[] = [
  { plancherCentimes: 0, inclusif: true, tauxPourcent: 0 },
  { plancherCentimes: 50_000, inclusif: true, tauxPourcent: 5 },
  { plancherCentimes: 100_000, inclusif: false, tauxPourcent: 10 },
];

/** Taux du palier atteint, appliqué à la totalité du montant éligible (F06, FR-007). */
export function tauxDuPalier(paliers: Palier[], montantEligible: number): number {
  let taux = 0;
  for (const p of [...paliers].sort((a, b) => a.plancherCentimes - b.plancherCentimes)) {
    const atteint = p.inclusif ? montantEligible >= p.plancherCentimes : montantEligible > p.plancherCentimes;
    if (atteint) taux = p.tauxPourcent;
  }
  return taux;
}

async function regles(tx: Tx) {
  const programme = await tx.programmeFidelite.findFirst({ orderBy: { id: "desc" } });
  const assistance = await tx.regleAssistance.findFirst({ orderBy: { id: "desc" } });
  if (!programme || !assistance) {
    throw new Error("Base de démonstration incomplète : programme de fidélité absent (lancez npm run demo:seed).");
  }
  return { programme, paliers: programme.paliers as Palier[], assistance };
}

export async function soldeCagnotte(tx: Tx, partenaireId: number): Promise<number> {
  const somme = await tx.mouvementCagnotte.aggregate({
    where: { partenaireId },
    _sum: { montantCentimes: true },
  });
  return somme._sum.montantCentimes ?? 0;
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
function prolonger(
  finActuelle: Date | null,
  dateCommande: Date,
  regle: { dureeJours: number; prolongation: string; plafondJours: number },
): Date {
  const plafond = ajouterJours(dateCommande, regle.plafondJours);
  const base = finActuelle && finActuelle > dateCommande ? finActuelle : dateCommande;
  const candidate =
    regle.prolongation === "remise_a_zero"
      ? ajouterJours(dateCommande, regle.dureeJours)
      : ajouterJours(base, regle.dureeJours);
  // Aucune règle ne raccourcit une période acquise.
  const plafonnee = candidate > plafond ? plafond : candidate;
  return finActuelle && finActuelle > plafonnee ? finActuelle : plafonnee;
}

function versMouvement(m: {
  type: string;
  montantCentimes: number;
  date: Date;
  validiteFin: Date | null;
  commande: { ref: string } | null;
}): MouvementCagnotte {
  return {
    type: m.type as TypeMouvement,
    montantHt: m.montantCentimes,
    commandeRef: m.commande?.ref ?? null,
    date: m.date,
    validiteFin: m.validiteFin,
  };
}

export const fideliteDemo: FideliteOdoo = {
  async lireCagnotte(partenaireRef: string): Promise<Cagnotte> {
    const p = await db().partenaire.findUnique({ where: { ref: partenaireRef } });
    if (!p) throw new NotFound("Partenaire", partenaireRef);
    const mouvements = await db().mouvementCagnotte.findMany({
      where: { partenaireId: p.id },
      include: { commande: true },
      orderBy: { date: "desc" },
    });
    const maintenant = new Date();
    const solde = mouvements.reduce((s, m) => s + m.montantCentimes, 0);
    const prochain = mouvements
      .filter((m) => m.type === "credit" && m.validiteFin && m.validiteFin > maintenant)
      .sort((a, b) => a.validiteFin!.getTime() - b.validiteFin!.getTime())[0];
    return {
      soldeHt: solde,
      mouvements: mouvements.map(versMouvement),
      prochaineExpiration:
        prochain && solde > 0
          ? { date: prochain.validiteFin!, montantHt: Math.min(prochain.montantCentimes, solde) }
          : null,
    };
  },

  async lireDroitsAssistance(partenaireRef: string): Promise<DroitsAssistance> {
    const p = await db().partenaire.findUnique({ where: { ref: partenaireRef }, include: { droits: true } });
    if (!p) throw new NotFound("Partenaire", partenaireRef);
    const d = p.droits;
    if (d && d.fin > new Date()) return { statut: "actif", fin: d.fin, origine: d.origine };
    return { statut: "inactif", fin: d?.fin ?? null, origine: d?.origine ?? null };
  },

  async estimerGains(partenaireRef: string, lignes: LigneNouvelleCommande[]): Promise<EstimationGains> {
    const tx = db();
    const { paliers, assistance } = await regles(tx);
    const prix = await prixClient(partenaireRef, lignes.map((l) => l.defaultCode), tx);
    const variantes = await tx.variante.findMany({
      where: { defaultCode: { in: lignes.map((l) => l.defaultCode) } },
      include: { modele: true },
    });
    const evaluees = lignes.map((l) => ({
      net: l.offerte ? 0 : prix.find((p) => p.defaultCode === l.defaultCode)!.prixHt * l.quantite,
      eligible: variantes.find((v) => v.defaultCode === l.defaultCode)?.modele.eligibleBonsAchat ?? false,
    }));
    const eligible = montantEligible(evaluees, 0);
    const taux = tauxDuPalier(paliers, eligible);
    const droits = await fideliteDemo.lireDroitsAssistance(partenaireRef);
    const maintenant = new Date();
    return {
      montantEligibleHt: eligible,
      tauxPourcent: taux,
      bonsAchatHt: Math.round((eligible * taux) / 100),
      droitsJusquAu: eligible >= assistance.seuilCentimes ? prolonger(droits.fin, maintenant, assistance) : null,
      seuilDroitsHt: assistance.seuilCentimes,
    };
  },

  async appliquerRegles(commandeRef: string) {
    return db().$transaction(async (tx) => {
      const c = await tx.commandeVente.findUnique({
        where: { ref: commandeRef },
        include: { lignes: { include: { variante: { include: { modele: true } } } }, mouvements: true },
      });
      if (!c) throw new NotFound("Commande", commandeRef);
      const { programme, paliers, assistance } = await regles(tx);
      const annulee = c.statut === "annulee" || c.statut === "remboursee";
      const crees: MouvementCagnotte[] = [];

      const creer = async (type: TypeMouvement, montant: number, cle: string, validiteFin: Date | null) => {
        const existe = await tx.mouvementCagnotte.findUnique({ where: { cle } });
        if (existe || montant === 0) return;
        const m = await tx.mouvementCagnotte.create({
          data: { partenaireId: c.partenaireId, type, montantCentimes: montant, commandeId: c.id, cle, validiteFin },
          include: { commande: true },
        });
        crees.push(versMouvement(m));
      };

      // 1. Bons d'achat crédités (les mises à disposition et commandes financées n'en donnent pas)
      const eligible = c.financee
        ? 0
        : montantEligible(
            c.lignes.map((l) => ({
              net: l.prixUnitaireHtCentimes * l.quantite - l.remiseCentimes,
              eligible: l.variante.modele.eligibleBonsAchat,
            })),
            c.bonsUtilisesCentimes,
          );
      const cible = annulee ? 0 : Math.round((eligible * tauxDuPalier(paliers, eligible)) / 100);
      const dejaCredite = c.mouvements
        .filter((m) => m.type === "credit" || m.type === "retrait")
        .reduce((s, m) => s + m.montantCentimes, 0);
      const ecart = cible - dejaCredite;
      if (ecart > 0) {
        await creer("credit", ecart, `credit:${c.ref}:${cible}`, ajouterMois(c.date, programme.validiteMois));
      } else if (ecart < 0) {
        await creer("retrait", ecart, `retrait:${c.ref}:${cible}`, null);
      }

      // 2. Bons utilisés rendus à la cagnotte si la commande est annulée ou remboursée (FR-017)
      if (annulee && c.bonsUtilisesCentimes > 0) {
        await creer("restitution", c.bonsUtilisesCentimes, `restitution:${c.ref}`, ajouterMois(new Date(), programme.validiteMois));
      }

      // 3. Droits d'assistance ouverts, prolongés ou retirés (FR-001, FR-003, FR-015)
      const droit = await tx.droitAssistance.findUnique({ where: { partenaireId: c.partenaireId } });
      const apports = (droit?.apports ?? {}) as Record<string, number>;
      const dejaApporte = apports[c.ref];
      if (!annulee && !dejaApporte && eligible >= assistance.seuilCentimes) {
        const nouvelleFin = prolonger(droit?.fin ?? null, c.date, assistance);
        const ancienneFin = droit && droit.fin > c.date ? droit.fin : c.date;
        const jours = Math.max(0, Math.round((nouvelleFin.getTime() - ancienneFin.getTime()) / 86_400_000));
        await tx.droitAssistance.upsert({
          where: { partenaireId: c.partenaireId },
          create: { partenaireId: c.partenaireId, fin: nouvelleFin, origine: c.ref, apports: { [c.ref]: jours } },
          update: { fin: nouvelleFin, origine: c.ref, apports: { ...apports, [c.ref]: jours } },
        });
      } else if (annulee && droit && dejaApporte !== undefined) {
        const { [c.ref]: retire, ...reste } = apports;
        await tx.droitAssistance.update({
          where: { partenaireId: c.partenaireId },
          data: { fin: ajouterJours(droit.fin, -(retire ?? 0)), apports: reste },
        });
      }

      return { mouvements: crees };
    });
  },
};
