import { rechercher } from "@/domaine/recherche/index";

// Suggestions de recherche (F01, contracts/recherche.md). Aucune recherche n'est journalisée.
export async function GET(requete: Request) {
  const q = new URL(requete.url).searchParams.get("q") ?? "";
  const resultat = await rechercher(q.slice(0, 100));
  return Response.json(resultat, { headers: { "Cache-Control": "no-store" } });
}
