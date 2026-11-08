import type { creerRegistre } from "@/connecteurs/registre";
import { cleDeTest } from "../harness";

// Outils communs aux tests de contrat d'Odoo. Chaque test qui écrit crée son propre partenaire :
// les cas utiles du jeu de départ ne sont pas modifiés.

export type Registre = ReturnType<typeof creerRegistre>;

import { it } from "vitest";
import { modeDuConnecteur } from "@/lib/config";
import { REFERENCES_DEMO } from "./references";

/** Références du jeu de démonstration (voir references.ts pour la copie de test d'Odoo). */
export const REF = REFERENCES_DEMO;

/**
 * Test propre au jeu de démonstration (noms, quantités, écritures des lots non livrés) : en
 * mode réel, il est ignoré. Les tests communs aux deux modes utilisent `it`.
 */
export const itDemo = modeDuConnecteur("odoo") === "demo" ? it : it.skip;

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
