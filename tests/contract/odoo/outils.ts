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
