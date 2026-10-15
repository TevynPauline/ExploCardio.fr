import { modeDuConnecteur, modeDuSite } from "@/lib/config";

// Le remplissage et la réinitialisation sont impossibles dès qu'un connecteur concerné est en
// mode réel, ou hors du site de démonstration (FR-023).

export class OperationDemoInterdite extends Error {}

export function verifierModeDemonstration(operation: "remplissage" | "réinitialisation") {
  if (modeDuSite() !== "demo") {
    throw new OperationDemoInterdite(
      `La ${operation} de la base de démonstration est interdite : le site n'est pas en mode démonstration (SITE_MODE=demo).`,
    );
  }
  if (modeDuConnecteur("odoo") === "real") {
    throw new OperationDemoInterdite(
      `La ${operation} de la base de démonstration est interdite : le connecteur Odoo est en mode réel.`,
    );
  }
  if (operation === "réinitialisation" && modeDuConnecteur("emailing") === "real") {
    throw new OperationDemoInterdite(
      "La réinitialisation est interdite : le connecteur emailing est en mode réel (la boîte de démonstration n'existe plus).",
    );
  }
}
