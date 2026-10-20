import { actionNewsletter } from "@/actions/mon-compte";
import { actionPreferenceCompte } from "@/actions/preferences";
import { estAbonneCompte, TEXTE_ABONNEMENT_COMPTE } from "@/domaine/comptes/newsletter";
import { compteCourant } from "@/domaine/comptes/session";
import { CATALOGUE, TYPES_FACULTATIFS, type EntreeCatalogue } from "@/domaine/emailing/catalogue";
import { lirePreferences } from "@/domaine/emailing/preferences";
import { dbSite } from "@/lib/db/site";
import { Button, Card, Kicker, Retour } from "@/ui";
import { NavMonCompte } from "@/ui/comptes/NavMonCompte";
import { ReglagesEmails } from "@/ui/emails/ReglagesEmails";

export const metadata = { title: "Préférences" };

/** Emails toujours envoyés, regroupés par raison (FR-022). */
function emailsToujoursEnvoyes(): { raison: string; exemples: string[] }[] {
  const parRaison = new Map<string, string[]>();
  for (const [code, e] of Object.entries(CATALOGUE as Record<string, EntreeCatalogue>)) {
    if (e.famille !== "transactionnel" || !e.justification || code === "essai") continue;
    parRaison.set(e.justification, [...(parRaison.get(e.justification) ?? []), e.libelle]);
  }
  return [...parRaison].map(([raison, exemples]) => ({ raison, exemples }));
}

// Préférences de communication (F02 FR-026, F10 US4) : newsletter, emails facultatifs un par
// un, et emails toujours envoyés avec leur raison. Chaque choix est enregistré avec sa date.
export default async function Preferences({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const { compte } = await compteCourant("/mon-compte/preferences");
  const r = await searchParams;
  const [abonne, dernier, preferences] = await Promise.all([
    estAbonneCompte(compte.id),
    dbSite().consentement.findFirst({ where: { compteId: compte.id, objet: "newsletter" }, orderBy: { date: "desc" } }),
    lirePreferences(compte.utilisateur.email),
  ]);
  return (
    <>
      <Kicker>Mon compte</Kicker>
      <h1 className="text-h2 font-light">Préférences de communication</h1>
      <NavMonCompte actif="/mon-compte/preferences" />
      <Retour {...r} />
      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Newsletter</h2>
        <p className="text-small text-muted">Promotions, ventes flash et nouveautés. Vous pouvez vous désinscrire à tout moment.</p>
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

      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Emails utiles, que vous pouvez désactiver</h2>
        <p className="text-small text-muted">Envoyés au bon moment, sans promotion. Ils ne dépendent pas de la newsletter.</p>
        <ReglagesEmails types={TYPES_FACULTATIFS} preferences={preferences} action={actionPreferenceCompte} />
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Emails toujours envoyés</h2>
        <p className="text-small text-muted">Ils accompagnent une action de votre part ou un engagement en cours : ils ne peuvent pas être désactivés et ne contiennent aucune promotion.</p>
        <ul className="flex list-none flex-col gap-2 p-0">
          {emailsToujoursEnvoyes().map((g) => (
            <li key={g.raison}>
              <p className="font-semibold text-ink">{g.raison.charAt(0).toUpperCase() + g.raison.slice(1)}</p>
              <p className="text-small text-muted">{g.exemples.slice(0, 4).join(", ")}{g.exemples.length > 4 ? "…" : ""}</p>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
