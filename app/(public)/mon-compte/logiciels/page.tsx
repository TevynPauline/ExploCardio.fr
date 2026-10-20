import type { Metadata } from "next";
import Link from "next/link";
import { actionResilierAbonnementLogiciel, actionSouscrireLogiciel } from "@/actions/logiciels";
import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { accesDuCompte } from "@/domaine/cloud/acces";
import { abonnementsLogicielsDuCompte } from "@/domaine/cloud/abonnement";
import { cheminsDesFiches } from "@/domaine/catalogue/lecture";
import { prixTtc } from "@/domaine/catalogue/prix";
import { compteCourant } from "@/domaine/comptes/session";
import { liensContact } from "@/lib/contact-whatsapp";
import { euros } from "@/lib/montants";
import { lireParametre } from "@/lib/parametres";
import { Card, Kicker, Retour } from "@/ui";
import { NavMonCompte } from "@/ui/comptes/NavMonCompte";
import type { EtatAccesLogiciel } from "@generated/site/client";

export const metadata: Metadata = { title: "Logiciels Cloud" };

const ETATS: Record<EtatAccesLogiciel, string> = {
  en_ouverture: "En cours d’ouverture",
  actif: "Actif",
  grace: "En délai de grâce",
  suspendu: "Suspendu",
  ferme: "Fermé",
};
const date = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

async function offresLogiciels() {
  try {
    const references = await registre.odoo().catalogue.listerReferences();
    return references.filter((r) => r.type === "logiciel");
  } catch (e) {
    if (estErreurConnecteur(e)) return [];
    throw e;
  }
}

// « Mes logiciels Cloud » (F12, US3) : accès, états et dates, lien vers la plateforme, aide à la
// première connexion et WhatsApp ; souscrire, poursuivre ou résilier l'abonnement (D3). Aucun
// mot de passe, aucune donnée de patient (FR-014).
export default async function Logiciels({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const { compte } = await compteCourant("/mon-compte/logiciels");
  const r = await searchParams;
  const [acces, abonnements, offres, url, aide, contact, chemins] = await Promise.all([
    accesDuCompte(compte.id),
    abonnementsLogicielsDuCompte(compte.id).catch(() => []),
    offresLogiciels(),
    lireParametre("cloud.url_plateforme"),
    lireParametre("cloud.aide_premiere_connexion"),
    liensContact("Bonjour, j'aimerais de l'aide pour paramétrer mon logiciel Cloud."),
    cheminsDesFiches(),
  ]);
  const ouverts = acces.filter((a) => a.etat !== "ferme");
  const fermes = acces.filter((a) => a.etat === "ferme");
  const sansAcces = offres.filter((o) => !ouverts.some((a) => a.logiciel === o.defaultCode));
  const peutSouscrire = compte.statut === "valide";
  return (
    <>
      <Kicker>Mon compte</Kicker>
      <h1 className="text-h2 font-light">Logiciels Cloud</h1>
      <NavMonCompte actif="/mon-compte" />
      <Retour {...r} />
      {ouverts.length ? (
        <ul className="flex list-none flex-col gap-3 p-0">
          {ouverts.map((a) => {
            const abonnement = abonnements.find((x) => x.ref === a.sourceRef && a.origine === "abonnement");
            const accessible = a.etat === "actif" || a.etat === "grace";
            return (
              <li key={a.id} aria-label={`Logiciel ${a.libelle}`} className="ec-card flex flex-col gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-h3 font-semibold">{a.libelle}</h2>
                  <p className="font-semibold text-ink">{ETATS[a.etat]}</p>
                </div>
                <p className="text-small">
                  Depuis le {date(a.debut)}
                  {a.etat === "grace" && a.finGrace
                    ? ` — accès terminé : consultation et récupération de vos données jusqu’au ${date(a.finGrace)}`
                    : a.finPrevue
                      ? ` — ${a.origine === "periode_incluse" ? "inclus avec votre appareil " : ""}jusqu’au ${date(a.finPrevue)}`
                      : abonnement
                        ? ` — abonnement mensuel, sans engagement`
                        : ""}
                </p>
                {a.etat === "en_ouverture" ? <p className="text-small">Votre accès est en cours d’ouverture : vous recevrez un email dès qu’il sera prêt.</p> : null}
                {a.etat === "suspendu" ? <p className="text-small">Votre accès est suspendu. Vos données sont conservées : contactez-nous pour le rétablir.</p> : null}
                <div className="flex flex-wrap gap-3">
                  {accessible && url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="ec-btn ec-btn--primary">
                      Accéder à la plateforme<span className="sr-only"> (nouvel onglet)</span>
                    </a>
                  ) : null}
                  {a.origine === "periode_incluse" && a.etat === "actif" && a.finPrevue && peutSouscrire ? (
                    <form action={actionSouscrireLogiciel}>
                      <input type="hidden" name="logiciel" value={a.logiciel} />
                      <button type="submit" className="ec-btn ec-btn--secondary">Poursuivre avec l’abonnement</button>
                    </form>
                  ) : null}
                  {abonnement && ["en_cours", "suspendue_impaye"].includes(abonnement.etat) ? (
                    <form action={actionResilierAbonnementLogiciel}>
                      <input type="hidden" name="ref" value={abonnement.ref} />
                      <button type="submit" className="ec-btn ec-btn--secondary">Résilier l’abonnement</button>
                    </form>
                  ) : null}
                </div>
                {a.origine === "periode_incluse" && a.etat === "actif" && a.finPrevue ? (
                  <p className="text-small text-muted">L’abonnement prend effet à la fin de la période incluse : votre accès continue sans interruption, rien n’est prélevé avant.</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <Card>
          <p>Vous n’avez pas encore de logiciel Cloud. Ils sont inclus avec certains appareils, ou disponibles en abonnement mensuel sans engagement.</p>
        </Card>
      )}

      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Première connexion et paramétrage</h2>
        {aide ? <p>{aide}</p> : null}
        <p className="text-small text-muted">Ne mentionnez jamais de patient dans vos messages : les données de santé restent sur la plateforme.</p>
        <p>
          <a href={contact.ecrire} className="ec-btn ec-btn--secondary">Écrire sur WhatsApp</a>
        </p>
      </Card>

      {sansAcces.length ? (
        <section aria-labelledby="offre-logiciels" className="flex flex-col gap-3">
          <h2 id="offre-logiciels" className="text-h3 font-semibold">Nos logiciels Cloud</h2>
          <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
            {sansAcces.map((o) => (
              <li key={o.defaultCode} className="ec-card flex flex-col gap-2">
                <p className="font-semibold">{chemins.get(o.defaultCode) ? <Link href={chemins.get(o.defaultCode)!}>{o.nom}</Link> : o.nom}</p>
                <p>
                  <strong>{euros(o.prixHt)} HT par mois</strong> <span className="text-small text-muted">soit {euros(prixTtc(o.prixHt, 20))} TTC, sans engagement</span>
                </p>
                {peutSouscrire ? (
                  <form action={actionSouscrireLogiciel}>
                    <input type="hidden" name="logiciel" value={o.defaultCode} />
                    <button type="submit" className="ec-btn ec-btn--primary">Souscrire l’abonnement</button>
                  </form>
                ) : (
                  <p className="text-small">La souscription sera possible dès la validation de votre compte.</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {fermes.length ? (
        <section aria-labelledby="logiciels-fermes" className="flex flex-col gap-2">
          <h2 id="logiciels-fermes" className="text-h3 font-semibold">Accès terminés</h2>
          <ul className="flex list-none flex-col gap-2 p-0">
            {fermes.map((a) => (
              <li key={a.id} aria-label={`Logiciel ${a.libelle}`} className="ec-card flex flex-wrap justify-between gap-2">
                <span>{a.libelle}</span>
                <span className="text-small">Fermé{a.finPrevue ? ` — fin le ${date(a.finPrevue)}` : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
