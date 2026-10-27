import { csvOuverture, listerInscriptionsOuverture } from "@/domaine/ouverture";
import { exigerDroit } from "@/lib/droits";

// Export CSV des inscriptions à l'ouverture (F17, FR-008), pour l'annonce d'ouverture.
export async function GET() {
  await exigerDroit("demandes", "voir");
  const csv = csvOuverture(await listerInscriptionsOuverture());
  const jour = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inscriptions-ouverture-${jour}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
