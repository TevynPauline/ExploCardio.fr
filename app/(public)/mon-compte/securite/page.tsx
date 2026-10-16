import { compteCourant } from "@/domaine/comptes/session";
import { Card, Kicker } from "@/ui";
import { NavMonCompte } from "@/ui/comptes/NavMonCompte";
import { SecuriteCompte } from "@/ui/comptes/SecuriteCompte";

export const metadata = { title: "Sécurité" };

// Sécurité (US3, FR-033) : mot de passe, double authentification facultative pour les clients.
export default async function Securite() {
  const { session } = await compteCourant("/mon-compte/securite");
  return (
    <>
      <Kicker>Mon compte</Kicker>
      <h1 className="text-h2 font-light">Sécurité</h1>
      <NavMonCompte actif="/mon-compte/securite" />
      <Card>
        <SecuriteCompte doubleAuthActive={Boolean(session.user.twoFactorEnabled)} />
      </Card>
    </>
  );
}
