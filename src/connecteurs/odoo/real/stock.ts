import type { Disponibilite, StockOdoo } from "../interfaces";
import { implementationRefusee } from "../../non-livre";
import type { Instantane } from "./instantane";

// Domaine « Stock et parc » en mode réel (F14, R6) : lectures au lot 1 ; réservations aux lots
// 3 et 4 (ConfigurationIncomplete d'ici là).

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
    reserver: (...a) => nonLivre.reserver(...a),
    liberer: (...a) => nonLivre.liberer(...a),
    lireDisponibiliteParc: (...a) => nonLivre.lireDisponibiliteParc(...a),
    reserverAppareil: (...a) => nonLivre.reserverAppareil(...a),
    libererAppareil: (...a) => nonLivre.libererAppareil(...a),
  };
}
