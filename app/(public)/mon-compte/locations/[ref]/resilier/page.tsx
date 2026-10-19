import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { actionResilier } from "@/actions/locations";
import { registre } from "@/connecteurs/registre";
import { compteCourant } from "@/domaine/comptes/session";
import { actionsDe, ActionLocationRefusee, locationDuCompte } from "@/domaine/location/gestion";
import { ajouterJoursOuvres, jourDeParis } from "@/lib/calendrier";
import { Card, Kicker, Retour } from "@/ui";
import { NavMonCompte } from "@/ui/comptes/NavMonCompte";

export const metadata: Metadata = { title: "Résilier une location" };

const dateFr = (d: Date) => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

// Confirmation de la résiliation (F05, US4, FR-021 à FR-023) : date de fin, date limite de
// retour, fermeture de l'accès Cloud, puis étiquette de retour.
export default async function Resilier({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ erreur?: string }> }) {
  const { ref } = await params;
  const { erreur } = await searchParams;
  const { compte } = await compteCourant(`/mon-compte/locations/${ref}/resilier`);
  let l;
  try {
    l = await locationDuCompte(compte.id, decodeURIComponent(ref));
  } catch (e) {
    if (e instanceof ActionLocationRefusee) notFound();
    throw e;
  }
  if (!actionsDe(l).resilier) notFound();
  // Aperçu des règles d'Odoo : fin au terme du mois payé, retour sous N jours ouvrés.
  const regles = await registre.odoo().location.lireRegles();
  const maintenant = new Date();
  const echeance = l.prochaineEcheance ?? maintenant;
  const fin = maintenant < echeance ? echeance : new Date(new Date(echeance).setMonth(echeance.getMonth() + 1));
  const limite = new Date(`${ajouterJoursOuvres(jourDeParis(fin), regles.delaiRetourJoursOuvres)}T12:00:00Z`);
  return (
    <>
      <Kicker>Mon compte</Kicker>
      <h1 className="text-h2 font-light">Résilier la location</h1>
      <NavMonCompte actif="/mon-compte" />
      <Retour erreur={erreur} />
      <Card className="flex flex-col gap-3">
        <p className="font-semibold text-ink">{l.libelle}{l.numeroSerie ? ` — n° ${l.numeroSerie}` : ""}</p>
        <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr]">
          <dt className="text-muted">Fin de la location</dt>
          <dd>{dateFr(fin)} (terme du mois payé) ; aucun prélèvement après cette date</dd>
          {l.logiciel ? (
            <>
              <dt className="text-muted">Accès au logiciel Cloud</dt>
              <dd>Fermé le {dateFr(fin)} : récupérez vos données d’ici là</dd>
            </>
          ) : null}
          <dt className="text-muted">Retour de l’appareil</dt>
          <dd>Avant le {dateFr(limite)}, avec l’étiquette préaffranchie fournie</dd>
        </dl>
        <p className="text-small text-muted">Vous pourrez annuler la résiliation avec « Prolonger » jusqu’à la date de fin.</p>
        <form action={actionResilier} className="flex flex-wrap gap-3">
          <input type="hidden" name="ref" value={l.ref} />
          <button type="submit" className="ec-btn ec-btn--primary">Confirmer la résiliation</button>
          <Link href="/mon-compte/locations" className="ec-btn ec-btn--secondary">Ne pas résilier</Link>
        </form>
      </Card>
    </>
  );
}
