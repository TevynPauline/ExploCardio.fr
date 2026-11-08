import { csvControle, lireRapportControle } from "@/domaine/catalogue/controle";
import { exigerDroit } from "@/lib/droits";

// Export CSV du rapport de contrôle des données Odoo (F14, FR-027), à transmettre à Régis.
export async function GET() {
  await exigerDroit("catalogue", "voir");
  const rapport = await lireRapportControle();
  if (!rapport.disponible) return new Response("Odoo est momentanément injoignable.", { status: 503 });
  const jour = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  return new Response(csvControle(rapport.anomalies), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="controle-odoo-${jour}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
