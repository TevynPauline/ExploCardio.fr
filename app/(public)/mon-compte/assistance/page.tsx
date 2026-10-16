import { compteCourant } from "@/domaine/comptes/session";
import { Card, Kicker } from "@/ui";
import { NavMonCompte } from "@/ui/comptes/NavMonCompte";

export const metadata = { title: "Droits d’assistance" };

// Rubrique alimentée par F06 ; en attendant, un message clair, sans erreur (US5-2).
export default async function Rubrique() {
  await compteCourant("/mon-compte/assistance");
  return (
    <>
      <Kicker>Mon compte</Kicker>
      <h1 className="text-h2 font-light">Droits d’assistance</h1>
      <NavMonCompte actif="/mon-compte" />
      <Card>
        <p>Cette rubrique sera bientôt disponible. Pour toute question, contactez-nous.</p>
      </Card>
    </>
  );
}
