import { redirect } from "next/navigation";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { cagnotteDetaillee } from "@/domaine/fidelite/cagnotte";
import { assistanceDuCompte } from "@/domaine/fidelite/droits";
import { euros } from "@/lib/montants";
import { compteCourant } from "@/domaine/comptes/session";
import { supprimer, verifierMotDePasse } from "@/domaine/comptes/rgpd";
import { Button, Card, Champ, Kicker } from "@/ui";
import { NavMonCompte } from "@/ui/comptes/NavMonCompte";

export const metadata = { title: "Mes données" };

async function supprimerCompte(d: FormData) {
  "use server";
  const { compte } = await compteCourant("/mon-compte/donnees");
  if (d.get("confirmation") !== "oui") redirect("/mon-compte/donnees?erreur=confirmation");
  if (!(await verifierMotDePasse(compte.utilisateurId, String(d.get("motDePasse") ?? "")))) redirect("/mon-compte/donnees?erreur=mot-de-passe-suppression");
  let r: Awaited<ReturnType<typeof supprimer>>;
  try {
    r = await supprimer(compte.id);
  } catch (e) {
    // Situation du client illisible (service de gestion indisponible) : rien n'est supprimé.
    if (!estErreurConnecteur(e)) throw e;
    redirect("/mon-compte/donnees?erreur=indisponible");
  }
  if (!r.supprime) redirect(`/mon-compte/donnees?refus=${encodeURIComponent(r.raisons.join(" "))}`);
  redirect("/?compte=supprime");
}

// Droits sur les données (US6) : export en libre-service, suppression du compte.
export default async function MesDonnees({ searchParams }: { searchParams: Promise<{ erreur?: string; refus?: string }> }) {
  const { compte } = await compteCourant("/mon-compte/donnees");
  const { erreur, refus } = await searchParams;
  // F06 : la cagnotte et les droits d'assistance sont perdus avec le compte.
  const [{ cagnotte }, { droits }] = await Promise.all([cagnotteDetaillee(compte.id), assistanceDuCompte(compte.id)]);
  const pertes = [
    cagnotte?.soldeHt ? `vos ${euros(cagnotte.soldeHt)} HT de bons d’achat` : null,
    droits?.statut === "actif" ? `vos droits d’assistance (valables jusqu’au ${droits.fin.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })})` : null,
  ].filter(Boolean);
  return (
    <>
      <Kicker>Mon compte</Kicker>
      <h1 className="text-h2 font-light">Mes données</h1>
      <NavMonCompte actif="/mon-compte/donnees" />
      {erreur === "indisponible" ? <p role="alert" className="ec-box--promo p-4 font-medium">Nous ne pouvons pas traiter votre demande pour le moment : réessayez dans quelques minutes. Votre compte n’a pas été supprimé.</p> : null}
      {refus ? <p role="alert" className="ec-box--promo p-4 font-medium">Votre compte ne peut pas encore être supprimé. {refus}</p> : null}
      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Exporter mes données</h2>
        <p>Vous recevez immédiatement un fichier (format JSON, lisible et réutilisable) contenant toutes vos données personnelles.</p>
        <form method="post" action="/mon-compte/donnees/export" className="flex max-w-md flex-col gap-3">
          <Champ id="mdp-export" name="motDePasse" type="password" libelle="Votre mot de passe" autoComplete="current-password" required erreur={erreur === "mot-de-passe" ? "Mot de passe incorrect." : null} />
          <div><Button type="submit">Télécharger mes données</Button></div>
        </form>
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Supprimer mon compte</h2>
        <p>
          Vous ne pourrez plus vous connecter, et vos données personnelles seront effacées. Les factures sont conservées
          pendant la durée imposée par la loi (10 ans). Une location en cours ou une facture impayée doit être soldée
          d’abord.
        </p>
        {pertes.length ? (
          <p role="note" className="ec-box--promo p-4 font-medium">
            En supprimant votre compte, vous perdez {pertes.join(" et ")}.
          </p>
        ) : (
          <p className="text-small">Votre cagnotte de bons d’achat et vos droits d’assistance seraient perdus avec votre compte.</p>
        )}
        <form action={supprimerCompte} className="flex max-w-md flex-col gap-3">
          <Champ id="mdp-suppression" name="motDePasse" type="password" libelle="Votre mot de passe" autoComplete="current-password" required erreur={erreur === "mot-de-passe-suppression" ? "Mot de passe incorrect." : null} />
          <label className="flex min-h-11 items-start gap-3">
            <input type="checkbox" name="confirmation" value="oui" required className="mt-1 size-5 shrink-0" />
            <span>Je confirme vouloir supprimer définitivement mon compte.</span>
          </label>
          {erreur === "confirmation" ? <p className="text-small font-medium">Cochez la case pour confirmer.</p> : null}
          <div><Button type="submit" variante="secondaire">Supprimer mon compte</Button></div>
        </form>
      </Card>
    </>
  );
}
