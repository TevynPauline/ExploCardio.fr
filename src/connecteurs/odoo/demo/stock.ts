import { NotFound, OutOfStock } from "../../erreurs";
import type { Disponibilite, LigneReservation, StockOdoo } from "../interfaces";
import { INCLURE_DISPONIBILITE, disponibilite, disponibiliteParc } from "./disponibilite";
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
    return references
      .map((r) => variantes.find((v) => v.defaultCode === r))
      .filter((v): v is NonNullable<typeof v> => Boolean(v))
      .map(disponibilite);
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
