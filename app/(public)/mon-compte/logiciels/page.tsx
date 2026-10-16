import { compteCourant } from "@/domaine/comptes/session";
import { Card, Kicker } from "@/ui";
import { NavMonCompte } from "@/ui/comptes/NavMonCompte";

export const metadata = { title: "Logiciels Cloud" };

// Rubrique alimentée par F12 ; en attendant, un message clair, sans erreur (US5-2).
export default async function Rubrique() {
  await compteCourant("/mon-compte/logiciels");
  return (
    <>
      <Kicker>Mon compte</Kicker>
      <h1 className="text-h2 font-light">Logiciels Cloud</h1>
      <NavMonCompte actif="/mon-compte" />
      <Card>
        <p>Cette rubrique sera bientôt disponible. Pour toute question, contactez-nous.</p>
      </Card>
    </>
  );
}
