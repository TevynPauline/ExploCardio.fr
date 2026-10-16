import { compteCourant } from "@/domaine/comptes/session";
import { Card, Kicker } from "@/ui";
import { FormulaireAdresses } from "@/ui/comptes/FormulairesProfil";
import { NavMonCompte } from "@/ui/comptes/NavMonCompte";

export const metadata = { title: "Adresses" };

export default async function Adresses() {
  const { compte } = await compteCourant("/mon-compte/adresses");
  const valeurs: Record<string, string> = {};
  for (const a of compte.adresses) {
    valeurs[`${a.type}.ligne1`] = a.ligne1;
    valeurs[`${a.type}.ligne2`] = a.ligne2 ?? "";
    valeurs[`${a.type}.codePostal`] = a.codePostal;
    valeurs[`${a.type}.ville`] = a.ville;
  }
  return (
    <>
      <Kicker>Mon compte</Kicker>
      <h1 className="text-h2 font-light">Adresses</h1>
      <NavMonCompte actif="/mon-compte/adresses" />
      <Card>
        <FormulaireAdresses valeurs={valeurs} />
      </Card>
    </>
  );
}
