import { creerCommande } from "./commandes";
import { ValeurRefusee } from "./administration";
import { db } from "./outils";

// Outil de démonstration (F10, US2) : un historique de commandes régulières d'un consommable,
// pour montrer la relance de réapprovisionnement. Commandes livrées, datées dans le passé ; le
// stock fictif est rendu à l'identique (l'historique ne vide pas le stock de la démonstration).

export type HistoriqueRegulier = {
  partenaireRef: string;
  defaultCode: string;
  quantite: number;
  intervalleJours: number;
  nombre: number;
  /** Ancienneté de la dernière commande, en jours. */
  derniereIlYaJours: number;
};

const JOUR = 24 * 3600_000;

export async function simulerCommandesRegulieres(h: HistoriqueRegulier, maintenant = new Date()): Promise<string[]> {
  if (h.nombre < 1 || h.nombre > 12) throw new ValeurRefusee("Nombre de commandes : entre 1 et 12.");
  if (h.intervalleJours < 7 || h.intervalleJours > 365) throw new ValeurRefusee("Intervalle : entre 7 et 365 jours.");
  if (h.quantite < 1 || h.quantite > 100) throw new ValeurRefusee("Quantité : entre 1 et 100.");
  const variante = await db().variante.findUnique({ where: { defaultCode: h.defaultCode }, include: { stock: true, modele: true } });
  if (!variante) throw new ValeurRefusee(`Article inconnu : ${h.defaultCode}.`);
  const refs: string[] = [];
  const total = h.quantite * h.nombre;
  await db().$transaction(async (tx) => {
    if (variante.stock) await tx.stock.update({ where: { id: variante.stock.id }, data: { quantite: { increment: total } } });
    for (let i = h.nombre - 1; i >= 0; i--) {
      const date = new Date(maintenant.getTime() - (h.derniereIlYaJours + i * h.intervalleJours) * JOUR);
      const cle = `demo-historique:${h.partenaireRef}:${h.defaultCode}:${date.toISOString().slice(0, 10)}`;
      const { ref } = await creerCommande(
        tx,
        {
          partenaireRef: h.partenaireRef,
          lignes: [{ defaultCode: h.defaultCode, quantite: h.quantite }],
          livraison: { adresse: "Adresse du cabinet (fictive)", codePostal: "00000", ville: "Démonstration", fraisPortHt: 0 },
          paiement: { mode: "carte", reference: `FICT-PAY-${cle}` },
        },
        cle,
        date,
      );
      await tx.commandeVente.update({ where: { ref }, data: { statut: "livree" } });
      refs.push(ref);
    }
  });
  return refs;
}
