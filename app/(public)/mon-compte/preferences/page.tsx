import { actionNewsletter } from "@/actions/mon-compte";
import { estAbonneCompte, TEXTE_ABONNEMENT_COMPTE } from "@/domaine/comptes/newsletter";
import { compteCourant } from "@/domaine/comptes/session";
import { dbSite } from "@/lib/db/site";
import { Button, Card, Kicker } from "@/ui";
import { NavMonCompte } from "@/ui/comptes/NavMonCompte";

export const metadata = { title: "Préférences" };

// Préférences de communication (FR-026, FR-027) : chaque choix est enregistré avec sa date.
export default async function Preferences() {
  const { compte } = await compteCourant("/mon-compte/preferences");
  const [abonne, dernier] = await Promise.all([
    estAbonneCompte(compte.id),
    dbSite().consentement.findFirst({ where: { compteId: compte.id, objet: "newsletter" }, orderBy: { date: "desc" } }),
  ]);
  return (
    <>
      <Kicker>Mon compte</Kicker>
      <h1 className="text-h2 font-light">Préférences de communication</h1>
      <NavMonCompte actif="/mon-compte/preferences" />
      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Newsletter</h2>
        <p role="status">
          {abonne ? "Vous êtes abonné à la newsletter" : "Vous n'êtes pas abonné à la newsletter"}
          {dernier ? ` depuis le ${dernier.date.toLocaleDateString("fr-FR")}.` : "."}
        </p>
        <form action={actionNewsletter} className="flex flex-col gap-3">
          <input type="hidden" name="abonne" value={abonne ? "non" : "oui"} />
          {!abonne ? <p className="text-small text-muted">{TEXTE_ABONNEMENT_COMPTE}</p> : null}
          <div>
            <Button type="submit" variante={abonne ? "secondaire" : "principal"}>
              {abonne ? "Me désabonner" : "M’abonner à la newsletter"}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
