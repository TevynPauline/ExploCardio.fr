import { NotFound, OutOfStock } from "../../erreurs";
import type { Disponibilite, LigneReservation, StockOdoo } from "../interfaces";
import { INCLURE_DISPONIBILITE, disponibilite, disponibiliteParc, etatsAchat } from "./disponibilite";
import { ajouterJours, db, type Tx } from "./outils";

// Domaine « Stock et parc » en démonstration (contracts/odoo.md §2).

/**
 * Vérifie et décompte les quantités. Une quantité manquante n'est refusée (OutOfStock) que si
 * l'article est « indisponible » ; en « délai X jours », la commande reste possible.
 */
export async function decompterStock(tx: Tx, lignes: LigneReservation[]): Promise<void> {
  const refs = lignes.map((l) => l.defaultCode);
  const variantes = await tx.variante.findMany({
    where: { defaultCode: { in: refs } },
    include: INCLURE_DISPONIBILITE,
  });
  const inconnue = refs.find((r) => !variantes.some((v) => v.defaultCode === r));
  if (inconnue) throw new NotFound("Article", inconnue);

  const enRupture = lignes
    .filter((l) => {
      const v = variantes.find((x) => x.defaultCode === l.defaultCode)!;
      const quantite = v.stock?.quantite ?? 0;
      return l.quantite > quantite && v.stock?.etatHorsStock === "indisponible";
    })
    .map((l) => l.defaultCode);
  if (enRupture.length) throw new OutOfStock(enRupture);

  for (const l of lignes) {
    const v = variantes.find((x) => x.defaultCode === l.defaultCode)!;
    if (v.stock) {
      await tx.stock.update({
        where: { id: v.stock.id },
        data: { quantite: Math.max(0, v.stock.quantite - l.quantite) },
      });
    }
  }
}

export const stockDemo: StockOdoo = {
  async lireDisponibilite(references: string[]): Promise<Disponibilite[]> {
    const variantes = await db().variante.findMany({
      where: { defaultCode: { in: references } },
      include: INCLURE_DISPONIBILITE,
    });
    const achat = await etatsAchat(variantes);
    return references
      .map((r) => variantes.find((v) => v.defaultCode === r))
      .filter((v): v is NonNullable<typeof v> => Boolean(v))
      .map((v) => ({
        ...disponibilite(v),
        achat: achat.get(v.defaultCode)!,
        // Pack : sa quantité dépend de ses composants, non exposée ici.
        ...(v.composants.length ? { quantiteDisponible: null } : {}),
      }));
  },

  async reserver(lignes: LigneReservation[], cle: string): Promise<{ reference: string }> {
    const reference = `FICT-RES-${cle}`;
    return db().$transaction(async (tx) => {
      const deja = await tx.reservation.findFirst({ where: { cle } });
      if (deja) return { reference };
      await decompterStock(tx, lignes);
      await tx.reservation.createMany({
        data: lignes.map((l) => ({ cle, defaultCode: l.defaultCode, quantite: l.quantite })),
      });
      return { reference };
    });
  },

  async liberer(cle: string): Promise<void> {
    await db().$transaction(async (tx) => {
      const reservees = await tx.reservation.findMany({ where: { cle } });
      for (const r of reservees) {
        const v = await tx.variante.findUnique({ where: { defaultCode: r.defaultCode }, include: { stock: true } });
        if (v?.stock) await tx.stock.update({ where: { id: v.stock.id }, data: { quantite: { increment: r.quantite } } });
      }
      await tx.reservation.deleteMany({ where: { cle } });
    });
  },

  async reserverAppareil(reference: string, dateLivraison: Date, cle: string): Promise<{ numeroSerie: string }> {
    return db().$transaction(async (tx) => {
      const deja = await tx.reservationAppareil.findUnique({ where: { cle }, include: { numeroSerie: true } });
      if (deja && deja.etat !== "liberee") return { numeroSerie: deja.numeroSerie.numero };
      const v = await tx.variante.findUnique({ where: { defaultCode: reference }, include: { offreMad: true } });
      if (!v) throw new NotFound("Article", reference);
      if (!v.offreMad) throw new NotFound("Offre de mise à disposition", reference);
      // Appareils disponibles, puis appareils qui seront revenus au parc (retour, maintenance) à
      // la date de livraison. Mise à jour conditionnelle : un appareil n'est pris qu'une fois (SC-005).
      const candidats = [
        ...(await tx.numeroSerie.findMany({ where: { varianteId: v.id, statut: "disponible" }, orderBy: { numero: "asc" } })),
        ...(await tx.numeroSerie.findMany({
          where: { varianteId: v.id, statut: { in: ["en_retour", "en_maintenance"] }, retourPrevu: { lte: dateLivraison } },
          orderBy: { retourPrevu: "asc" },
        })),
      ];
      for (const candidat of candidats) {
        const pris = await tx.numeroSerie.updateMany({ where: { id: candidat.id, statut: candidat.statut }, data: { statut: "loue" } });
        if (pris.count !== 1) continue;
        const data = { numeroSerieId: candidat.id, dateLivraison, statutAvant: candidat.statut, etat: "active" as const };
        if (deja) await tx.reservationAppareil.update({ where: { cle }, data });
        else await tx.reservationAppareil.create({ data: { cle, ...data } });
        return { numeroSerie: candidat.numero };
      }
      throw new OutOfStock([reference]);
    });
  },

  async libererAppareil(cle: string): Promise<void> {
    await db().$transaction(async (tx) => {
      const r = await tx.reservationAppareil.findUnique({ where: { cle } });
      if (!r || r.etat !== "active") return;
      await tx.reservationAppareil.update({ where: { cle }, data: { etat: "liberee" } });
      await tx.numeroSerie.updateMany({ where: { id: r.numeroSerieId, statut: "loue" }, data: { statut: r.statutAvant } });
    });
  },

  async lireDisponibiliteParc(reference: string, dateSouhaitee: Date): Promise<{ premiereDate: Date }> {
    const v = await db().variante.findUnique({
      where: { defaultCode: reference },
      include: INCLURE_DISPONIBILITE,
    });
    if (!v) throw new NotFound("Article", reference);
    const etat = disponibiliteParc(v);
    if (!etat || etat.etat === "indisponible") {
      // Aucun appareil prévu : délai de réapprovisionnement du parc (valeur de démonstration).
      return { premiereDate: ajouterJours(dateSouhaitee, 30) };
    }
    if (etat.etat === "disponible") return { premiereDate: dateSouhaitee };
    const auPlusTot = ajouterJours(new Date(), etat.delaiJours);
    return { premiereDate: auPlusTot > dateSouhaitee ? auPlusTot : dateSouhaitee };
  },
};
