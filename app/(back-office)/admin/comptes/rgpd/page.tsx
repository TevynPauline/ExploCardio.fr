import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { exporter, supprimer } from "@/domaine/comptes/rgpd";
import { dbSite } from "@/lib/db/site";
import { exigerAdministrateur } from "@/lib/roles";
import { Button, Card, Kicker, Retour } from "@/ui";

export const metadata: Metadata = { title: "Données personnelles" };

async function enregistrer(d: FormData) {
  "use server";
  const { user } = await exigerAdministrateur();
  const recherche = String(d.get("compte") ?? "").trim().toLowerCase();
  const compte = await dbSite().compteClient.findFirst({
    where: { OR: [{ utilisateur: { email: recherche } }, { rpps: recherche }, { siret: recherche }] },
  });
  if (!compte) redirect(`/admin/comptes/rgpd?erreur=${encodeURIComponent("Aucun compte ne correspond.")}`);
  const type = d.get("type") === "suppression" ? "suppression" : "export";
  const demande = await dbSite().demandeRgpd.create({ data: { compteId: compte.id, type, origine: String(d.get("origine") || "courrier ou email") } });
  await dbSite().journalAction.create({ data: { auteurId: user.id, auteur: user.email, action: "rgpd.demande_saisie", objet: demande.id } });
  redirect("/admin/comptes/rgpd?ok=Demande%20enregistr%C3%A9e.");
}

async function traiter(d: FormData) {
  "use server";
  const { user } = await exigerAdministrateur();
  const demande = await dbSite().demandeRgpd.findUniqueOrThrow({ where: { id: String(d.get("id")) } });
  if (!demande.compteId) redirect("/admin/comptes/rgpd");
  if (demande.type === "export") {
    await exporter(demande.compteId, "équipe");
  } else {
    const r = await supprimer(demande.compteId, "équipe");
    if (!r.supprime) {
      await dbSite().demandeRgpd.update({ where: { id: demande.id }, data: { etat: "refusee", motif: r.raisons.join(" "), traiteeLe: new Date() } });
      redirect(`/admin/comptes/rgpd?erreur=${encodeURIComponent(r.raisons.join(" "))}`);
    }
  }
  await dbSite().demandeRgpd.update({ where: { id: demande.id }, data: { etat: "traitee", traiteeLe: new Date() } });
  await dbSite().journalAction.create({ data: { auteurId: user.id, auteur: user.email, action: "rgpd.demande_traitee", objet: demande.id } });
  redirect(`/admin/comptes/rgpd?ok=${encodeURIComponent(demande.type === "export" ? "Export préparé : envoyez-le au demandeur depuis sa fiche." : "Compte supprimé.")}`);
}

// Demandes reçues par courrier ou par email (FR-039) : délai d'un mois.
export default async function Rgpd({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await exigerAdministrateur();
  const r = await searchParams;
  const demandes = await dbSite().demandeRgpd.findMany({ where: { etat: "recue" }, include: { compte: { include: { utilisateur: true } } }, orderBy: { recueLe: "asc" } });
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Comptes</Kicker>
      <h1 className="text-h2 font-light">Données personnelles</h1>
      <Retour {...r} />
      <Card>
        <h2 className="mb-3 text-h3 font-semibold">Saisir une demande reçue</h2>
        <form action={enregistrer} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-small font-medium sm:col-span-2">
            Email, SIRET ou SIREN du compte
            <input name="compte" required className="min-h-11 rounded-sm border border-muted bg-surface px-2 font-normal" />
          </label>
          <label className="flex flex-col gap-1 text-small font-medium">
            Demande
            <select name="type" className="min-h-11 rounded-sm border border-muted bg-surface px-2 font-normal">
              <option value="export">Export des données</option>
              <option value="suppression">Suppression du compte</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-small font-medium">
            Reçue par
            <input name="origine" placeholder="courrier, email…" className="min-h-11 rounded-sm border border-muted bg-surface px-2 font-normal" />
          </label>
          <div><Button type="submit">Enregistrer la demande</Button></div>
        </form>
      </Card>
      {demandes.length === 0 ? <p className="text-muted">Aucune demande en attente.</p> : null}
      {demandes.map((d) => {
        const echeance = new Date(d.recueLe.getTime() + 30 * 86_400_000);
        return (
          <Card key={d.id} className="flex flex-wrap items-center justify-between gap-3">
            <p>
              {d.type === "export" ? "Export" : "Suppression"} —{" "}
              {d.compte ? <Link href={`/admin/comptes/${d.compte.id}`}>{d.compte.utilisateur.email}</Link> : "compte"} — reçue le{" "}
              {d.recueLe.toLocaleDateString("fr-FR")}, à traiter avant le <strong className="font-semibold">{echeance.toLocaleDateString("fr-FR")}</strong>
            </p>
            <form action={traiter}>
              <input type="hidden" name="id" value={d.id} />
              <Button type="submit" variante="secondaire">Traiter</Button>
            </form>
          </Card>
        );
      })}
    </div>
  );
}
