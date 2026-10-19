import { REF } from "./outils";

// Jeu de commandes de référence de F06 (FR-039, SC-013) : mêmes commandes, mêmes résultats en
// démonstration et dans la copie de test d'Odoo (phase 3). Paramètres par défaut : 0 % sous
// 500 € HT, 5 % de 500 € à 1 000 € HT inclus, 10 % au-delà.
// REF.consommable : carton d'électrodes à 160 € HT ; REF.accessoire : carte SD à 25 € HT.

export type CommandeReference = { nom: string; lignes: { defaultCode: string; quantite: number }[]; eligibleHt: number; bonsHt: number };

export const COMMANDES_REFERENCE: CommandeReference[] = [
  { nom: "400 € HT : sous le premier palier", lignes: [{ defaultCode: REF.accessoire, quantite: 16 }], eligibleHt: 40_000, bonsHt: 0 },
  { nom: "500 € HT : la borne basse appartient au palier à 5 %", lignes: [{ defaultCode: REF.accessoire, quantite: 20 }], eligibleHt: 50_000, bonsHt: 2_500 },
  { nom: "800 € HT : palier à 5 %", lignes: [{ defaultCode: REF.consommable, quantite: 5 }], eligibleHt: 80_000, bonsHt: 4_000 },
  {
    nom: "1 000 € HT : reste dans le palier à 5 %",
    lignes: [
      { defaultCode: REF.consommable, quantite: 5 },
      { defaultCode: REF.accessoire, quantite: 8 },
    ],
    eligibleHt: 100_000,
    bonsHt: 5_000,
  },
  {
    nom: "1 200 € HT : 10 % sur la totalité",
    lignes: [
      { defaultCode: REF.consommable, quantite: 5 },
      { defaultCode: REF.accessoire, quantite: 16 },
    ],
    eligibleHt: 120_000,
    bonsHt: 12_000,
  },
  {
    nom: "équipement + consommables : seuls les consommables comptent",
    lignes: [
      { defaultCode: REF.equipement, quantite: 1 },
      { defaultCode: REF.consommable, quantite: 5 },
    ],
    eligibleHt: 80_000,
    bonsHt: 4_000,
  },
];
