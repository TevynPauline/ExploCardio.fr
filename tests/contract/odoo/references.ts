// Jeux de références des tests de contrat d'Odoo, par environnement (F14, R10).
// - demo : la base fictive ;
// - copie : la copie de test d'Odoo, à remplir quand Régis aura saisi le jeu de test
//   (docs/donnees-test-odoo.docx). Une référence à null : les tests qui en dépendent sont ignorés.

export const REFERENCES_DEMO = {
  equipementMad: "EC-DMS-3004L-CLOUD",
  equipement: "EC-SUN-OSCAR2",
  consommable: "EC-ELEC-HOLTER-500",
  accessoire: "EC-DMS-SD-8GO",
  enRupture: "EC-IEM-MOBILOGRAPH",
  enDelai: "EC-KOCH-ULTRA",
  logiciel: "EC-DMS-CS-HOLTER-CLOUD",
  inconnue: "EC-REFERENCE-INCONNUE",
  partenaireDroitsActifs: "FICT-P-00001",
  partenaireSansDroits: "FICT-P-00002",
  /** Client avec une mensualité de financement forcée sur `equipementMad` (F03). */
  partenaireMensualiteForcee: "FICT-P-00007",
  /** Consommable vendu par boîte et par carton, avec des prix dégressifs (F03). */
  consommableParLot: "EC-ELEC-HOLTER-50",
  /** Configuration en pack, dont la disponibilité suit celle de ses composants (F03). */
  pack: "EC-DMS-3004L-PACK",
} as const;

export type CleReference = keyof typeof REFERENCES_DEMO;

export const REFERENCES_COPIE: Record<CleReference, string | null> = {
  equipementMad: null,
  equipement: null,
  consommable: null,
  accessoire: null,
  enRupture: null,
  enDelai: null,
  logiciel: null,
  inconnue: "EC-REFERENCE-INCONNUE",
  partenaireDroitsActifs: null,
  partenaireSansDroits: null,
  partenaireMensualiteForcee: null,
  consommableParLot: null,
  pack: null,
};

/** Références du mode courant : la démonstration, ou la copie de test en mode réel. */
export function references(mode: "demo" | "real"): Record<CleReference, string | null> {
  return mode === "demo" ? REFERENCES_DEMO : REFERENCES_COPIE;
}
