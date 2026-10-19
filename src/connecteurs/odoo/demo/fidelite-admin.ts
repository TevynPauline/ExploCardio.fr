import { NotFound } from "../../erreurs";
import { ValeurRefusee } from "./administration";
import { ARTICLE_ASSISTANCE_ACTE, consommerLots, reglesEnVigueur } from "./fidelite";
import { ajouterMois, db } from "./outils";

// Opérations du programme de fidélité réservées à la démonstration (F06, T007) : ce que
// l'équipe fera dans Odoo — ajustements manuels avec motif (FR-027), clôture d'une
// intervention payée, expiration des bons à une date, promotions. Absentes en mode réel.

async function partenaire(ref: string) {
  const p = await db().partenaire.findUnique({ where: { ref } });
  if (!p) throw new NotFound("Partenaire", ref);
  return p;
}

function exigerMotif(motif: string) {
  if (motif.trim().length < 3) throw new ValeurRefusee("Indiquez le motif de l'ajustement.");
}

/** Crédite (montant positif) ou débite (négatif) une cagnotte, avec motif et auteur. */
export async function ajusterCagnotte(partenaireRef: string, montantCentimes: number, motif: string, auteur: string) {
  exigerMotif(motif);
  if (!Number.isInteger(montantCentimes) || montantCentimes === 0) throw new ValeurRefusee("Montant de l'ajustement : un montant non nul est attendu.");
  const p = await partenaire(partenaireRef);
  const regles = await reglesEnVigueur(db());
  await db().$transaction(async (tx) => {
    const cle = `ajustement:${p.id}:${Date.now()}`;
    if (montantCentimes > 0) {
      const lot = await tx.lotBons.create({
        data: { partenaireId: p.id, origine: "ajustement", montantInitialCentimes: montantCentimes, resteCentimes: montantCentimes, validiteFin: ajouterMois(new Date(), regles.validiteMois) },
      });
      await tx.mouvementCagnotte.create({ data: { partenaireId: p.id, type: "ajustement", montantCentimes, cle, lotId: lot.id, validiteFin: lot.validiteFin, motif: motif.trim(), auteur } });
    } else {
      const pris = await consommerLots(tx, { partenaireId: p.id, commandeId: null, type: "ajustement", montant: -montantCentimes, cle, motif: motif.trim(), auteur });
      if (pris < -montantCentimes) throw new ValeurRefusee("Le débit dépasse les bons disponibles.");
    }
  });
}

/** Ouvre ou prolonge des droits jusqu'à une date, avec motif et auteur (geste commercial). */
export async function ajusterDroits(partenaireRef: string, fin: Date, motif: string, auteur: string) {
  exigerMotif(motif);
  if (Number.isNaN(fin.getTime())) throw new ValeurRefusee("Date de fin invalide.");
  const p = await partenaire(partenaireRef);
  const d = await db().droitAssistance.findUnique({ where: { partenaireId: p.id } });
  const historique = Array.isArray(d?.historique) ? (d!.historique as object[]) : [];
  const entree = { date: new Date().toISOString(), type: "ajustement", commandeRef: null, fin: fin.toISOString(), motif: motif.trim(), auteur };
  await db().droitAssistance.upsert({
    where: { partenaireId: p.id },
    create: { partenaireId: p.id, fin, origine: `ajustement : ${motif.trim()}`, historique: [entree] },
    update: { fin, origine: `ajustement : ${motif.trim()}`, historique: [...historique, entree] },
  });
}

export async function cloreIntervention(id: number, auteur: string) {
  const i = await db().interventionPayee.findUnique({ where: { id } });
  if (!i) throw new NotFound("Intervention", String(id));
  if (i.etat === "consommee") throw new ValeurRefusee("Cette intervention est déjà close.");
  await db().interventionPayee.update({ where: { id }, data: { etat: "consommee", consommeeLe: new Date(), auteur } });
}

export async function listerInterventionsOuvertes() {
  return db().interventionPayee.findMany({ where: { etat: "disponible" }, include: { partenaire: true, commande: true }, orderBy: { acheteeLe: "asc" } });
}

/** Action planifiée d'Odoo : le reste des lots échus à une date devient une expiration (FR-011). */
export async function expirerBons(date: Date): Promise<number> {
  const lots = await db().lotBons.findMany({ where: { resteCentimes: { gt: 0 }, validiteFin: { lte: date } } });
  for (const lot of lots) {
    await db().$transaction(async (tx) => {
      const cle = `expiration:${lot.id}`;
      if (await tx.mouvementCagnotte.findUnique({ where: { cle } })) return;
      await tx.mouvementCagnotte.create({ data: { partenaireId: lot.partenaireId, type: "expiration", montantCentimes: -lot.resteCentimes, cle, lotId: lot.id, validiteFin: lot.validiteFin, date } });
      await tx.lotBons.update({ where: { id: lot.id }, data: { resteCentimes: 0 } });
    });
  }
  return lots.length;
}

export type NouvellePromotion = { nom: string; type: "vente_flash" | "remise_automatique" | "code_promo"; code?: string; remisePourcent: number; defaultCodes: string[]; debut: Date; fin: Date; annoncee?: boolean };

export async function creerPromotion(p: NouvellePromotion) {
  if (!p.nom.trim()) throw new ValeurRefusee("Nom de la promotion manquant.");
  if (!(p.remisePourcent > 0 && p.remisePourcent < 100)) throw new ValeurRefusee("Remise : pourcentage entre 1 et 99 attendu.");
  if (!(p.fin > p.debut)) throw new ValeurRefusee("La date de fin doit suivre la date de début.");
  if (p.type !== "code_promo" && !p.defaultCodes.length) throw new ValeurRefusee("Indiquez au moins une référence concernée.");
  if (p.type === "code_promo" && !/^[A-Z0-9-]{3,20}$/.test(p.code ?? "")) throw new ValeurRefusee("Code promo : 3 à 20 lettres majuscules ou chiffres.");
  return db().promotion.create({
    data: { nom: p.nom.trim(), type: p.type, code: p.type === "code_promo" ? p.code : null, remisePourcent: p.remisePourcent, cible: { defaultCodes: p.defaultCodes }, debut: p.debut, fin: p.fin, annoncee: p.annoncee ?? false },
  });
}

export async function terminerPromotion(id: number) {
  await db().promotion.update({ where: { id }, data: { fin: new Date() } });
}

export async function listerPromotions() {
  return db().promotion.findMany({ where: { type: { in: ["vente_flash", "remise_automatique", "code_promo"] } }, orderBy: { id: "desc" } });
}

/** Le prix de l'assistance à l'acte suit la règle d'Odoo (prixActeCentimes). */
export async function synchroniserPrixActe() {
  const r = await reglesEnVigueur(db());
  await db().variante.updateMany({ where: { defaultCode: ARTICLE_ASSISTANCE_ACTE }, data: { prixHtCentimes: r.prixActeCentimes } });
}
