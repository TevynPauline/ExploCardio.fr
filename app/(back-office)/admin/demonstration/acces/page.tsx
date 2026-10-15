import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { changerMotDePasse } from "@/lib/demo/acces";
import { exigerAdministrateur } from "@/lib/roles";
import { Button, Card, Champ, Kicker, Retour } from "@/ui";

export const metadata: Metadata = { title: "Accès au site de démonstration" };

async function changer(donnees: FormData) {
  "use server";
  const { user } = await exigerAdministrateur();
  const nouveau = String(donnees.get("nouveau") ?? "");
  if (nouveau !== String(donnees.get("confirmation") ?? "")) {
    redirect("/admin/demonstration/acces?erreur=" + encodeURIComponent("Les deux saisies ne correspondent pas."));
  }
  try {
    await changerMotDePasse(nouveau, { id: user.id, libelle: `${user.name} (${user.email})` });
  } catch (e) {
    redirect("/admin/demonstration/acces?erreur=" + encodeURIComponent(e instanceof Error ? e.message : "Erreur."));
  }
  redirect("/demo/acces?retour=" + encodeURIComponent("/admin/demonstration/acces?ok=change"));
}

// Changement du mot de passe du site de démonstration (T087, FR-037) : toutes les sessions
// d'accès sont fermées ; il faut le communiquer à nouveau aux testeurs.
export default async function AccesDemonstration({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const { ok, erreur } = await searchParams;
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Kicker>Démonstration</Kicker>
      <h1 className="text-h2 font-light">Accès au site de démonstration</h1>
      <Retour ok={ok ? "Mot de passe changé. Les autres personnes devront saisir le nouveau mot de passe." : undefined} erreur={erreur} />
      <Card>
        <form action={changer} className="flex flex-col gap-4">
          <Champ id="nouveau" name="nouveau" type="password" libelle="Nouveau mot de passe" aide="Au moins 10 caractères." autoComplete="new-password" required minLength={10} />
          <Champ id="confirmation" name="confirmation" type="password" libelle="Confirmez le nouveau mot de passe" autoComplete="new-password" required minLength={10} />
          <p className="text-small text-muted">
            Toutes les personnes connectées au site de démonstration devront saisir le nouveau mot de passe.
          </p>
          <div><Button type="submit">Changer le mot de passe</Button></div>
        </form>
      </Card>
    </div>
  );
}
