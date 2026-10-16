import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { dbSite } from "@/lib/db/site";
import { exporter, verifierMotDePasse } from "@/domaine/comptes/rgpd";

// Export des données (FR-039) : le formulaire envoie le mot de passe (POST) ; le serveur le
// vérifie puis renvoie le fichier JSON en téléchargement.
export async function POST(requete: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Connexion requise.", { status: 401 });
  const motDePasse = String((await requete.formData()).get("motDePasse") ?? "");
  if (!(await verifierMotDePasse(session.user.id, motDePasse))) {
    return Response.redirect(new URL("/mon-compte/donnees?erreur=mot-de-passe", requete.url), 303);
  }
  const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { utilisateurId: session.user.id } });
  const donnees = await exporter(compte.id);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(donnees, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="explocardio-mes-donnees-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
