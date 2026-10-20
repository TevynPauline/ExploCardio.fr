import type { Metadata } from "next";
import Link from "next/link";
import { actionDesinscriptionJeton, actionPreferenceJeton } from "@/actions/preferences";
import { TYPES_FACULTATIFS } from "@/domaine/emailing/catalogue";
import { objetConnu } from "@/domaine/emailing/desinscription";
import { lireJeton } from "@/domaine/emailing/jetons";
import { estAbonne, lirePreferences, TEXTES_PREFERENCES } from "@/domaine/emailing/preferences";
import { dbSite } from "@/lib/db/site";
import { Button, Card, Kicker, Retour } from "@/ui";
import { ReglagesEmails } from "@/ui/emails/ReglagesEmails";

export const metadata: Metadata = { title: "Préférences d’emails", robots: { index: false, follow: false } };

const MESSAGES: Record<string, string> = {
  desinscription: "C’est fait : votre désinscription est enregistrée. Elle s’applique aussi aux envois déjà programmés.",
  preference: "Votre préférence est enregistrée.",
};

// Préférences sans connexion (F10, US4, FR-023, FR-024, D8) : depuis le lien d'un email. La page
// n'affiche que les réglages de l'adresse du lien, jamais d'information du compte.
export default async function PreferencesParLien({
  params,
  searchParams,
}: {
  params: Promise<{ jeton: string }>;
  searchParams: Promise<{ desinscrire?: string; ok?: string; erreur?: string }>;
}) {
  const { jeton: brut } = await params;
  const jeton = decodeURIComponent(brut);
  const r = await searchParams;
  const email = lireJeton(jeton);
  if (!email) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10">
        <Kicker>Emails</Kicker>
        <h1 className="text-h2 font-light">Lien invalide</h1>
        <p>Ce lien de préférences n’est pas valide. Utilisez le lien d’un email récent, ou connectez-vous à votre compte.</p>
        <p><Link href="/mon-compte/preferences" className="ec-btn ec-btn--primary">Mes préférences</Link></p>
      </div>
    );
  }
  const [abonne, preferences, utilisateur] = await Promise.all([
    estAbonne(email),
    lirePreferences(email),
    dbSite().utilisateur.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { compteClient: { select: { id: true } } } }),
  ]);
  const aUnCompte = Boolean(utilisateur?.compteClient);
  const demande = r.desinscrire && objetConnu(r.desinscrire) && !r.ok ? r.desinscrire : null;
  const libelleDemande = demande === "newsletter" ? "la newsletter" : demande ? `« ${TEXTES_PREFERENCES[demande as keyof typeof TEXTES_PREFERENCES]} »` : "";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <Kicker>Emails</Kicker>
        <h1 className="text-h2 font-light">Vos préférences d’emails</h1>
        <p className="text-muted">Pour l’adresse {email}.</p>
      </div>
      <Retour ok={r.ok ? MESSAGES[r.ok] : undefined} erreur={r.erreur ? "Ce lien n’est pas valide." : undefined} />

      {demande ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-h3 font-semibold">Confirmer la désinscription</h2>
          <p>Vous ne recevrez plus {libelleDemande}. Les emails liés à vos commandes et à votre compte continueront de vous parvenir.</p>
          <form action={actionDesinscriptionJeton}>
            <input type="hidden" name="jeton" value={jeton} />
            <input type="hidden" name="objet" value={demande} />
            <Button type="submit">Me désinscrire</Button>
          </form>
        </Card>
      ) : null}

      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Newsletter</h2>
        <p role="status">{abonne ? "Vous êtes abonné à la newsletter (promotions, ventes flash, nouveautés)." : "Vous n’êtes pas abonné à la newsletter."}</p>
        {abonne ? (
          <form action={actionDesinscriptionJeton}>
            <input type="hidden" name="jeton" value={jeton} />
            <input type="hidden" name="objet" value="newsletter" />
            <Button type="submit" variante="secondaire">Me désinscrire de la newsletter</Button>
          </form>
        ) : null}
      </Card>

      {aUnCompte ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-h3 font-semibold">Emails utiles, que vous pouvez désactiver</h2>
          <ReglagesEmails types={TYPES_FACULTATIFS} preferences={preferences} action={actionPreferenceJeton} champs={{ jeton }} />
          <p className="text-small text-muted">
            Les emails liés à vos commandes, paiements, locations et à la sécurité de votre compte sont toujours envoyés. Pour tout voir, <Link href="/mon-compte/preferences">connectez-vous à votre compte</Link>.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
