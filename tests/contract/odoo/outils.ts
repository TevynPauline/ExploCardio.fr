import type { creerRegistre } from "@/connecteurs/registre";
import { cleDeTest } from "../harness";

// Outils communs aux tests de contrat d'Odoo. Chaque test qui écrit crée son propre partenaire :
// les cas utiles du jeu de départ ne sont pas modifiés.

export type Registre = ReturnType<typeof creerRegistre>;

/** Références attendues dans la base de démonstration (et dans la copie de test d'Odoo en phase 3). */
export const REF = {
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

export async function nouveauPartenaire(registre: Registre) {
  const rpps = `99${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;
  const { ref } = await registre.odoo().clients.creerOuRetrouverPartenaire(
    {
      nom: "Dr Test Contrat",
      email: `contrat-${rpps}@demo.explocardio.test`,
      rpps,
      adresses: [{ type: "facturation", ligne1: "1 rue du Test", codePostal: "75001", ville: "Paris" }],
    },
    cleDeTest("partenaire"),
  );
  return ref;
}

export const livraison = { adresse: "1 rue du Test", codePostal: "75001", ville: "Paris", fraisPortHt: 1500 };

/**
 * En démonstration seulement : remet du stock fictif avant des commandes de test (le jeu de
 * départ n'en a que quelques dizaines). La copie de test d'Odoo (phase 3) gère son propre stock.
 */
export async function reapprovisionnerDemo(codes: string[], quantite = 500) {
  const { modeDuConnecteur } = await import("@/lib/config");
  if (modeDuConnecteur("odoo") !== "demo") return;
  const { dbDemo } = await import("@/lib/db/demo");
  await dbDemo().stock.updateMany({ where: { variante: { defaultCode: { in: codes } }, quantite: { lt: quantite } }, data: { quantite } });
}
