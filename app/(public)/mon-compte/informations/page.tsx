import { specialites } from "@/domaine/comptes/inscription";
import { compteCourant } from "@/domaine/comptes/session";
import { Card, Kicker } from "@/ui";
import { FormulaireEmail, FormulaireInformations, FormulaireNumero } from "@/ui/comptes/FormulairesProfil";
import { NavMonCompte } from "@/ui/comptes/NavMonCompte";

export const metadata = { title: "Informations" };

export default async function Informations() {
  const { compte } = await compteCourant("/mon-compte/informations");
  const u = compte.utilisateur;
  const liste = await specialites();
  return (
    <>
      <Kicker>Mon compte</Kicker>
      <h1 className="text-h2 font-light">Informations</h1>
      <NavMonCompte actif="/mon-compte/informations" />
      <Card>
        <h2 className="mb-3 text-h3 font-semibold">Vous</h2>
        <FormulaireInformations
          specialites={liste}
          valeurs={{ civilite: u.civilite ?? "Dr", prenom: u.prenom ?? "", nom: u.nom ?? "", telephone: u.telephone ?? "", specialite: u.specialite ?? "" }}
        />
      </Card>
      <Card>
        <h2 className="mb-3 text-h3 font-semibold">Adresse email</h2>
        <FormulaireEmail actuel={u.email} />
      </Card>
      <Card>
        <h2 className="mb-3 text-h3 font-semibold">Numéro d’entreprise (SIRET ou SIREN)</h2>
        <FormulaireNumero actuel={compte.siret} aVerifier={compte.numeroVerification === "a_verifier"} />
      </Card>
    </>
  );
}
