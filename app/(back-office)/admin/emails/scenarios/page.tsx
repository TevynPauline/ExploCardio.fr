import type { Metadata } from "next";
import type { ScenarioEmail } from "@generated/site/client";
import { statistiques, type Statistiques } from "@/domaine/emailing/suivi";
import { lireParametre } from "@/lib/parametres";
import { exigerAdministrateur } from "@/lib/roles";
import { Button, Card, Champ, Kicker, Retour } from "@/ui";
import { actionReglerEmails } from "../actions";
import { NavEmails } from "../NavEmails";

export const metadata: Metadata = { title: "Scénarios et règles d’envoi" };

const SCENARIOS: { scenario: ScenarioEmail; libelle: string; actif: string; reglages: { cle: string; libelle: string }[]; note?: string }[] = [
  {
    scenario: "reapprovisionnement",
    libelle: "Relance de réapprovisionnement",
    actif: "emailing.reappro.actif",
    reglages: [
      { cle: "emailing.reappro.avance_jours", libelle: "Avance avant la date prévue (jours)" },
      { cle: "emailing.reappro.commandes_min", libelle: "Nombre minimum de commandes" },
      { cle: "emailing.reappro.ecart_max_pct", libelle: "Écart toléré entre les intervalles (%)" },
    ],
  },
  { scenario: "panier_abandonne", libelle: "Panier en attente", actif: "emailing.panier.actif", reglages: [{ cle: "emailing.panier.delai_heures", libelle: "Délai sans modification (heures)" }] },
  { scenario: "alerte_droits", libelle: "Alerte de fin des droits d’assistance", actif: "emailing.alerte_droits.actif", reglages: [], note: "Délai de prévenance : paramètres de fidélité (F06)." },
  { scenario: "alerte_bons", libelle: "Alerte d’expiration des bons d’achat", actif: "emailing.alerte_bons.actif", reglages: [], note: "Délai de prévenance : paramètres de fidélité (F06)." },
  { scenario: "impaye", libelle: "Relances de paiement", actif: "emailing.impayes.actif", reglages: [], note: "Nombre et délais des relances : réglés dans Odoo (relances de factures)." },
];

const REGLES = [
  { cle: "emailing.frequence_max", libelle: "Emails facultatifs et commerciaux au plus, par client" },
  { cle: "emailing.frequence_jours", libelle: "… par période de (jours)" },
  { cle: "emailing.plage_debut", libelle: "Envois à partir de (heure, jours ouvrés)" },
  { cle: "emailing.plage_fin", libelle: "Envois jusqu’à (heure)" },
];

const JOUR = 24 * 3600_000;

async function resultatsDes30Jours(): Promise<Record<string, Statistiques>> {
  const depuis = new Date(Date.now() - 30 * JOUR);
  return Object.fromEntries(await Promise.all(SCENARIOS.map(async (s) => [s.scenario, await statistiques({ scenario: s.scenario }, depuis)] as const)));
}

function Resultats({ s }: { s: Statistiques }) {
  return (
    <p className="text-small text-muted">
      30 derniers jours : {s.envoyes} envoyé{s.envoyes > 1 ? "s" : ""} · {s.remis} remis · {s.ouverts} ouvert{s.ouverts > 1 ? "s" : ""} · {s.commandes} suivi{s.commandes > 1 ? "s" : ""} d’une commande
    </p>
  );
}

// Scénarios et règles d'envoi (F10, US8, FR-008, FR-031, FR-032, FR-036, FR-037) : activer,
// régler, voir les résultats ; fréquence maximale, plages horaires et nom de l'expéditeur.
export default async function Scenarios({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await exigerAdministrateur();
  const r = await searchParams;
  const cles = [...SCENARIOS.flatMap((s) => [s.actif, ...s.reglages.map((x) => x.cle)]), ...REGLES.map((x) => x.cle), "emailing.expediteur_nom"];
  const valeurs = Object.fromEntries(await Promise.all(cles.map(async (c) => [c, (await lireParametre(c)) ?? ""] as const)));
  const stats = await resultatsDes30Jours();
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Emails</Kicker>
      <h1 className="text-h2 font-light">Scénarios et règles d’envoi</h1>
      <NavEmails actif="/admin/emails/scenarios" />
      <Retour {...r} />
      <form action={actionReglerEmails} className="flex flex-col gap-6">
        {SCENARIOS.map((s) => (
          <Card key={s.scenario} className="flex flex-col gap-3">
            <h2 className="text-h3 font-semibold">{s.libelle}</h2>
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" name={s.actif} value="oui" defaultChecked={valeurs[s.actif] !== "false"} className="h-5 w-5" />
              Scénario actif
            </label>
            {s.reglages.length ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {s.reglages.map((x) => (
                  <Champ key={x.cle} id={x.cle} name={x.cle} libelle={x.libelle} inputMode="numeric" defaultValue={valeurs[x.cle]} />
                ))}
              </div>
            ) : null}
            {s.note ? <p className="text-small text-muted">{s.note}</p> : null}
            <Resultats s={stats[s.scenario]!} />
          </Card>
        ))}
        <Card className="flex flex-col gap-3">
          <h2 className="text-h3 font-semibold">Règles d’envoi</h2>
          <p className="text-small text-muted">Les emails toujours envoyés (commandes, paiements, sécurité) ne sont jamais limités ni retardés.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {REGLES.map((x) => (
              <Champ key={x.cle} id={x.cle} name={x.cle} libelle={x.libelle} inputMode="numeric" defaultValue={valeurs[x.cle]} />
            ))}
            <Champ id="emailing.expediteur_nom" name="emailing.expediteur_nom" libelle="Nom de l’expéditeur" maxLength={60} defaultValue={valeurs["emailing.expediteur_nom"]} />
          </div>
        </Card>
        <div><Button type="submit">Enregistrer les réglages</Button></div>
      </form>
    </div>
  );
}
