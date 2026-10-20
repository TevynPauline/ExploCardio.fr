import type { Metadata } from "next";
import { ecranDemonstration } from "@/connecteurs/demonstration";
import { saisieDepuisCentimes } from "@/lib/montants";
import { Button, Card, Champ, Kicker, Retour } from "@/ui";
import { modifierNiveauxRelance, modifierParametresCommerciaux, modifierReglesLocation, modifierRemisePromotion } from "../actions";
import { registre } from "@/connecteurs/registre";

export const metadata: Metadata = { title: "Paramètres commerciaux de démonstration" };

const champ = "min-h-11 w-28 rounded-sm border border-muted bg-surface px-2 text-right";

export default async function ParametresCommerciaux({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const resultat = await searchParams;
  const p = await ecranDemonstration.lireParametresCommerciaux();
  const { promotions } = await ecranDemonstration.apercu();
  const lignes = [...p.paliers, { plancherCentimes: NaN, inclusif: true, tauxPourcent: NaN }];
  const location = await registre.odoo().location.lireRegles();
  const niveaux = await registre.odoo().factures.lireNiveauxRelance();
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Démonstration</Kicker>
      <h1 className="text-h2 font-light">Paramètres commerciaux</h1>
      <p className="text-muted">
        Règles de F06 appliquées par le connecteur de démonstration comme le fera Odoo. En mode réel,
        elles se règlent dans Odoo.
      </p>
      <Retour {...resultat} />

      <form action={modifierParametresCommerciaux} className="flex flex-col gap-6">
        <Card>
          <fieldset>
            <legend className="text-h3 font-semibold">Paliers de la cagnotte</legend>
            <p className="mt-1 text-small text-muted">
              Le taux du palier atteint s’applique à tout le montant éligible. Laissez la dernière ligne
              vide pour ne pas ajouter de palier.
            </p>
            <table className="mt-3 border-collapse">
              <thead>
                <tr className="text-small text-muted">
                  <th scope="col" className="pr-4 text-left font-medium">À partir de (€ HT)</th>
                  <th scope="col" className="pr-4 text-left font-medium">Montant compris</th>
                  <th scope="col" className="text-left font-medium">Taux (%)</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((palier, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-4">
                      <label className="sr-only" htmlFor={`plancher-${i}`}>Palier {i + 1} : à partir de</label>
                      <input id={`plancher-${i}`} name="plancher" inputMode="decimal" defaultValue={Number.isNaN(palier.plancherCentimes) ? "" : saisieDepuisCentimes(palier.plancherCentimes)} className={champ} />
                    </td>
                    <td className="py-1 pr-4">
                      <label className="flex min-h-11 items-center gap-2 text-small">
                        <input type="checkbox" name={`inclusif-${i}`} value="oui" defaultChecked={palier.inclusif} className="size-5" />
                        inclus
                      </label>
                    </td>
                    <td className="py-1">
                      <label className="sr-only" htmlFor={`taux-${i}`}>Palier {i + 1} : taux</label>
                      <input id={`taux-${i}`} name="taux" inputMode="decimal" defaultValue={Number.isNaN(palier.tauxPourcent) ? "" : String(palier.tauxPourcent).replace(".", ",")} className={champ} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </fieldset>
          <div className="mt-4 max-w-xs">
            <Champ id="validiteBonsMois" name="validiteBonsMois" libelle="Validité des bons d'achat (mois)" inputMode="numeric" defaultValue={p.validiteBonsMois} />
          </div>
        </Card>

        <Card>
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-h3 font-semibold">Droits d’assistance</legend>
            <Champ id="seuilDroits" name="seuilDroits" libelle="Seuil par commande (€ HT)" inputMode="decimal" defaultValue={saisieDepuisCentimes(p.seuilDroitsCentimes)} />
            <Champ id="dureeDroitsJours" name="dureeDroitsJours" libelle="Durée (jours)" inputMode="numeric" defaultValue={p.dureeDroitsJours} />
            <Champ id="plafondDroitsJours" name="plafondDroitsJours" libelle="Plafond (jours)" inputMode="numeric" defaultValue={p.plafondDroitsJours} />
            <Champ id="prixActe" name="prixActe" libelle="Assistance à l'acte (€ HT)" inputMode="decimal" defaultValue={saisieDepuisCentimes(p.prixAssistanceActeCentimes)} />
            <div className="flex flex-col gap-1">
              <label htmlFor="prolongation" className="text-small font-medium">Règle de prolongation</label>
              <select id="prolongation" name="prolongation" defaultValue={p.prolongation} className="min-h-11 rounded-sm border border-muted bg-surface px-2">
                <option value="cumul">Cumul (la durée s’ajoute)</option>
                <option value="remise_a_zero">Remise à zéro (la durée repart de la commande)</option>
              </select>
            </div>
          </fieldset>
        </Card>

        <div>
          <Button type="submit">Enregistrer les paramètres</Button>
        </div>
      </form>

      <Card>
        <h2 className="text-h3 font-semibold">Règles de location (F05)</h2>
        <form action={modifierReglesLocation} className="mt-3 grid gap-3 sm:grid-cols-2">
          <Champ id="loc-tentatives" name="tentatives" libelle="Nouvelles tentatives de prélèvement" inputMode="numeric" defaultValue={String(location.tentativesPrelevement)} />
          <Champ id="loc-espacement" name="espacement" libelle="Espacement des tentatives (jours)" inputMode="numeric" defaultValue={String(location.espacementTentativesJours)} />
          <Champ id="loc-regularisation" name="regularisation" libelle="Délai de régularisation (jours)" inputMode="numeric" defaultValue={String(location.delaiRegularisationJours)} />
          <Champ id="loc-retour" name="retour" libelle="Délai de retour (jours ouvrés)" inputMode="numeric" defaultValue={String(location.delaiRetourJoursOuvres)} />
          <Champ id="loc-tolerance" name="tolerance" libelle="Tolérance avant le mois suivant (jours)" inputMode="numeric" defaultValue={String(location.toleranceRetardJours)} />
          <Champ id="loc-non-retour" name="nonRetour" libelle="Délai avant la valeur de remplacement (jours)" inputMode="numeric" defaultValue={String(location.delaiNonRetourJours)} />
          <div><Button type="submit" variante="secondaire">Enregistrer les règles de location</Button></div>
        </form>
      </Card>

      <Card>
        <h2 className="text-h3 font-semibold">Relances des paiements en retard (F10)</h2>
        <p className="mt-1 text-small text-muted">En jours avant la conséquence (annulation d’une commande par virement, suspension d’une location). Le dernier niveau annonce la conséquence et sa date.</p>
        <form action={modifierNiveauxRelance} className="mt-3 grid gap-3 sm:grid-cols-3">
          {niveaux.map((n) => (
            <Champ key={n.niveau} id={`relance-${n.niveau}`} name={`niveau${n.niveau}`} libelle={`${n.libelle} (jours avant)`} inputMode="numeric" defaultValue={String(n.joursAvantConsequence)} />
          ))}
          <div className="sm:col-span-3"><Button type="submit" variante="secondaire">Enregistrer les niveaux de relance</Button></div>
        </form>
      </Card>

      <Card>
        <h2 className="text-h3 font-semibold">Promotions</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {promotions.filter((promo) => promo.type !== "bienvenue").map((promo) => (
            <li key={promo.id}>
              <form action={modifierRemisePromotion} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={promo.id} />
                <span className="min-w-64">{promo.nom}{promo.code ? ` (code ${promo.code})` : ""}</span>
                <label className="text-small" htmlFor={`remise-${promo.id}`}>Remise (%)</label>
                <input id={`remise-${promo.id}`} name="remise" inputMode="decimal" defaultValue={promo.remisePourcent ? String(promo.remisePourcent).replace(".", ",") : ""} className={champ} />
                <Button type="submit" variante="secondaire" aria-label={`Enregistrer la remise de ${promo.nom}`}>Enregistrer</Button>
              </form>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
