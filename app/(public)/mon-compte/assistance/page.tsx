import type { Metadata } from "next";
import Link from "next/link";
import { actionAcheterAssistance } from "@/actions/panier";
import { compteCourant } from "@/domaine/comptes/session";
import { assistanceDuCompte } from "@/domaine/fidelite/droits";
import { euros } from "@/lib/montants";
import { Card, Kicker } from "@/ui";
import { NavMonCompte } from "@/ui/comptes/NavMonCompte";
import { ParcoursFidelite } from "@/ui/fidelite/Parcours";

export const metadata: Metadata = { title: "Droits d’assistance" };

const date = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
const EVENEMENTS = { ouverture: "Ouverture", prolongation: "Prolongation", retrait: "Retrait", ajustement: "Ajustement" } as const;

// Droits d'assistance (F06, US5, US9) : statut, date de fin, origine, comment les prolonger ;
// sans droits actifs, l'assistance à l'acte. Tout est lu dans Odoo.
export default async function Assistance() {
  const { compte } = await compteCourant("/mon-compte/assistance");
  const { droits, regles, interventions, indisponible } = await assistanceDuCompte(compte.id);
  const actif = droits?.statut === "actif";
  const historique = droits ? [...droits.historique].sort((a, b) => b.date.getTime() - a.date.getTime()) : [];
  return (
    <>
      <Kicker>Mon compte</Kicker>
      <h1 className="text-h2 font-light">Droits d’assistance</h1>
      <NavMonCompte actif="/mon-compte" />
      {indisponible ? <p role="status" className="ec-box--info p-4">Vos droits d’assistance sont momentanément indisponibles. Réessayez dans quelques instants.</p> : null}
      {droits && regles ? (
        <Card className="flex flex-col gap-2">
          <ParcoursFidelite />
          {actif ? (
            <>
              <h2 className="text-h3 font-semibold">Votre assistance est offerte</h2>
              <p>Hotline et SAV réactif sans frais jusqu’au <strong>{date(droits.fin)}</strong>.</p>
              <p className="text-small text-muted">Ouverts par la commande {droits.origine}.</p>
              <p>
                Pour les prolonger, passez une commande d’au moins {euros(regles.seuilDroitsHt)} HT de consommables ou d’accessoires :{" "}
                {regles.prolongation === "cumul" ? `${regles.dureeDroitsJours} jours s’ajoutent à votre date de fin` : `vos droits repartent pour ${regles.dureeDroitsJours} jours`}, dans la limite de {regles.plafondDroitsJours} jours.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-h3 font-semibold">Pas de droits d’assistance en cours</h2>
              {droits.fin ? <p>Vos droits ont pris fin le {date(droits.fin)}.</p> : null}
              <p>
                Une commande d’au moins <strong>{euros(regles.seuilDroitsHt)} HT</strong> de consommables ou d’accessoires vous ouvre l’assistance gratuite (hotline et SAV
                réactif) pendant {regles.dureeDroitsJours} jours. <Link href="/catalogue">Voir les consommables</Link>
              </p>
            </>
          )}
        </Card>
      ) : null}
      {droits && regles && !actif && compte.statut === "valide" ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-h3 font-semibold">Besoin d’aide tout de suite ?</h2>
          <p>
            L’assistance à l’acte : une intervention de notre équipe, pour <strong>{euros(regles.prixAssistanceActeHt)} HT</strong>, réglée par carte.
          </p>
          <form action={actionAcheterAssistance}>
            <button type="submit" className="ec-btn ec-btn--primary">Acheter une intervention</button>
          </form>
        </Card>
      ) : null}
      {interventions.length ? (
        <section aria-labelledby="interventions" className="flex flex-col gap-2">
          <h2 id="interventions" className="text-h3 font-semibold">Interventions payées</h2>
          <ul className="flex list-none flex-col gap-2 p-0">
            {interventions.map((i) => (
              <li key={i.id} className="ec-card flex flex-wrap justify-between gap-2">
                <span>Intervention achetée le {date(i.acheteeLe)} (commande {i.commandeRef})</span>
                <span className="font-semibold">{i.etat === "disponible" ? "Disponible" : `Réalisée le ${date(i.consommeeLe ?? i.acheteeLe)}`}</span>
              </li>
            ))}
          </ul>
          <p className="text-small">Pour utiliser une intervention disponible, <Link href="/contact">contactez notre équipe</Link>.</p>
        </section>
      ) : null}
      {historique.length ? (
        <section aria-labelledby="historique-droits" className="flex flex-col gap-2">
          <h2 id="historique-droits" className="text-h3 font-semibold">Historique</h2>
          <ul className="flex list-none flex-col gap-2 p-0">
            {historique.map((e, n) => (
              <li key={n} className="ec-card flex flex-col gap-1">
                <span className="font-semibold">{EVENEMENTS[e.type]} le {date(e.date)}</span>
                <span className="text-small">
                  {e.type === "retrait" ? "Nouvelle date de fin" : "Droits jusqu’au"} {date(e.fin)}
                  {e.commandeRef ? ` — commande ${e.commandeRef}` : ""}
                  {e.motif ? ` — ${e.motif}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
