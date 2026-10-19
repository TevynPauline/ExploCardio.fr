import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fideliteDemoOps, pagePaiementDemoDisponible } from "@/connecteurs/demonstration";
import { Button, Card, Champ, Kicker, Retour } from "@/ui";
import { ajusterCagnotte, ajusterDroits, cloreIntervention, creerPromotion, expirerBons, terminerPromotion } from "../actions";

export const metadata: Metadata = { title: "Fidélité de démonstration" };

const select = "min-h-11 w-full max-w-full rounded-sm border border-muted bg-surface px-2";
const date = (d: Date | null) => (d ? d.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" }) : "—");

// Programme de fidélité (F06) : ce que l'équipe fera dans Odoo — ajustements avec motif,
// interventions payées à clore, expiration des bons, promotions. Absent en mode réel.
export default async function Fidelite({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  if (!pagePaiementDemoDisponible()) notFound();
  const r = await searchParams;
  const [interventions, promotions] = await Promise.all([fideliteDemoOps.listerInterventionsOuvertes(), fideliteDemoOps.listerPromotions()]);
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const maintenant = new Date();
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Démonstration</Kicker>
      <h1 className="text-h2 font-light">Fidélité</h1>
      <p className="text-muted">Ce que l’équipe fera dans Odoo. Les règles du programme se règlent dans « Paramètres commerciaux ».</p>
      <Retour {...r} />

      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Ajuster une cagnotte</h2>
        <form action={ajusterCagnotte} className="grid gap-3 sm:grid-cols-2">
          <Champ id="cagnotte-partenaire" name="partenaire" libelle="Client (référence Odoo)" placeholder="FICT-P-00001" />
          <Champ id="cagnotte-montant" name="montant" libelle="Montant HT (€)" inputMode="decimal" placeholder="50,00" />
          <label className="flex flex-col gap-1 text-small font-medium">
            Sens
            <select name="sens" className={select} defaultValue="credit">
              <option value="credit">Créditer</option>
              <option value="debit">Débiter</option>
            </select>
          </label>
          <Champ id="cagnotte-motif" name="motif" libelle="Motif (obligatoire)" placeholder="Geste commercial" />
          <div><Button type="submit" variante="secondaire">Ajuster la cagnotte</Button></div>
        </form>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Ouvrir ou prolonger des droits d’assistance</h2>
        <form action={ajusterDroits} className="grid gap-3 sm:grid-cols-2">
          <Champ id="droits-partenaire" name="partenaire" libelle="Client (référence Odoo)" placeholder="FICT-P-00001" />
          <Champ id="droits-fin" name="fin" type="date" libelle="Nouvelle date de fin" />
          <Champ id="droits-motif" name="motif" libelle="Motif (obligatoire)" placeholder="Geste commercial" />
          <div className="self-end"><Button type="submit" variante="secondaire">Enregistrer les droits</Button></div>
        </form>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Interventions payées à clore</h2>
        {!interventions.length ? <p className="text-muted">Aucune intervention en attente.</p> : null}
        <ul className="flex list-none flex-col gap-2 p-0">
          {interventions.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2" aria-label={`Intervention ${i.id}`}>
              <span>{i.partenaire.nom} ({i.partenaire.ref}) · commande {i.commande.ref} · achetée le {date(i.acheteeLe)}</span>
              <form action={cloreIntervention}>
                <input type="hidden" name="id" value={i.id} />
                <Button type="submit" variante="secondaire">Clore l’intervention ({i.commande.ref})</Button>
              </form>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Expirer les bons échus</h2>
        <form action={expirerBons} className="flex flex-wrap items-end gap-3">
          <div className="w-56"><Champ id="expiration-date" name="date" type="date" libelle="Date simulée" defaultValue={aujourdhui} /></div>
          <Button type="submit" variante="secondaire">Exécuter l’expiration et les rappels</Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Promotions</h2>
        <form action={creerPromotion} className="grid gap-3 sm:grid-cols-2">
          <Champ id="promo-nom" name="nom" libelle="Nom" placeholder="Vente flash électrodes −10 %" />
          <label className="flex flex-col gap-1 text-small font-medium">
            Type
            <select name="type" className={select} defaultValue="vente_flash">
              <option value="vente_flash">Vente flash</option>
              <option value="remise_automatique">Remise automatique</option>
              <option value="code_promo">Code promo</option>
            </select>
          </label>
          <Champ id="promo-remise" name="remise" libelle="Remise (%)" inputMode="decimal" placeholder="10" />
          <Champ id="promo-code" name="code" libelle="Code (code promo seulement)" />
          <div className="sm:col-span-2">
            <Champ id="promo-references" name="references" libelle="Références concernées (séparées par des virgules)" placeholder="EC-ELEC-HOLTER-50" />
          </div>
          <Champ id="promo-debut" name="debut" type="datetime-local" libelle="Début" />
          <Champ id="promo-fin" name="fin" type="datetime-local" libelle="Fin" />
          <label className="flex min-h-11 items-center gap-2 sm:col-span-2">
            <input type="checkbox" name="annoncee" value="oui" className="size-5" /> Annoncer le code (bandeau et fiches)
          </label>
          <div><Button type="submit" variante="secondaire">Créer la promotion</Button></div>
        </form>
        <ul className="flex list-none flex-col gap-2 p-0">
          {promotions.map((p) => {
            const enCours = (!p.debut || p.debut <= maintenant) && (!p.fin || p.fin > maintenant);
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
                <span>
                  {p.nom}
                  {p.code ? ` (code ${p.code}${p.annoncee ? ", annoncé" : ""})` : ""} · {date(p.debut)} → {date(p.fin)} · {enCours ? "en cours" : "inactive"}
                </span>
                {enCours ? (
                  <form action={terminerPromotion}>
                    <input type="hidden" name="id" value={p.id} />
                    <Button type="submit" variante="secondaire">Terminer « {p.nom} »</Button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
