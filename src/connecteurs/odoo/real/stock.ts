import type { Disponibilite, LigneReservation, StockOdoo } from "../interfaces";
import { NotFound, OutOfStock } from "../../erreurs";
import { implementationRefusee } from "../../non-livre";
import type { Instantane } from "./instantane";

// Domaine « Stock et parc » en mode réel (F14, R6) : lectures au lot 1 ; au lot 3, la
// réservation avant paiement vérifie seulement la quantité libre (plan-lots-2-3.md D5) : le
// stock est réservé par Odoo à la confirmation de la commande. Parc de location : lot 4.

export function creerStockReel(instantane: () => Promise<Instantane>): StockOdoo {
  const nonLivre = implementationRefusee<StockOdoo>("odoo", []);
  return {
    async lireDisponibilite(references: string[]): Promise<Disponibilite[]> {
      const i = await instantane();
      return references
        .map((r) => i.parReference.get(r))
        .filter((x): x is NonNullable<typeof x> => Boolean(x))
        .map(({ modele, variante }) => ({
          defaultCode: variante.defaultCode,
          achat: variante.achat,
          quantiteDisponible: variante.quantiteLibre,
          delaiReassortJours: variante.delaiReassortJours,
          miseADisposition: modele.offre ? (modele.appareilLibre ? { etat: "disponible" } : { etat: "indisponible" }) : null,
        }));
    },
    async reserver(lignes: LigneReservation[], cle: string) {
      const i = await instantane();
      const manquants: string[] = [];
      for (const l of lignes) {
        const trouve = i.parReference.get(l.defaultCode);
        if (!trouve) throw new NotFound("Article", l.defaultCode);
        const v = trouve.variante;
        if (l.quantite > v.quantiteLibre && v.delaiReassortJours === null) manquants.push(l.defaultCode);
      }
      if (manquants.length) throw new OutOfStock(manquants);
      return { reference: `RES-${cle}` };
    },
    // Rien n'a été réservé dans Odoo avant le paiement : rien à libérer.
    async liberer() {},
    lireDisponibiliteParc: (...a) => nonLivre.lireDisponibiliteParc(...a),
    reserverAppareil: (...a) => nonLivre.reserverAppareil(...a),
    libererAppareil: (...a) => nonLivre.libererAppareil(...a),
  };
}
