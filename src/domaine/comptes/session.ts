import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { dbSite } from "@/lib/db/site";

// Compte du client connecté (F02, Mon compte). Sans session : vers la connexion avec retour.

export async function compteCourant(chemin = "/mon-compte") {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(`/connexion?retour=${encodeURIComponent(chemin)}`);
  const compte = await dbSite().compteClient.findUnique({
    where: { utilisateurId: session.user.id },
    include: { utilisateur: true, adresses: true },
  });
  if (!compte || compte.statut === "supprime") redirect("/admin");
  return { session, compte };
}
