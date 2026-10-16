import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { traiterDemandeNumero } from "@/domaine/comptes/profil";
import { dbSite } from "@/lib/db/site";
import { exigerEquipe } from "@/lib/roles";
import { Button, Card, Kicker, Retour } from "@/ui";

export const metadata: Metadata = { title: "Demandes de changement de numéro" };

async function traiter(d: FormData) {
  "use server";
  const { user } = await exigerEquipe(["admin", "commercial"]);
  try {
    await traiterDemandeNumero(String(d.get("id")), d.get("decision") === "accepter", { id: user.id, libelle: `${user.name} (${user.email})` }, String(d.get("motif") ?? ""));
  } catch (e) {
    if (e instanceof Error && !("digest" in e)) redirect(`/admin/comptes/demandes?erreur=${encodeURIComponent(e.message)}`);
    throw e;
  }
  redirect("/admin/comptes/demandes?ok=Demande%20trait%C3%A9e.");
}

// Changements de RPPS ou SIRET demandés depuis « Mon compte » : vérifiés avant application (FR-037).
export default async function Demandes({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const r = await searchParams;
  const demandes = await dbSite().demandeChangementNumero.findMany({ where: { etat: "en_attente" }, include: { compte: { include: { utilisateur: true } } }, orderBy: { demandeeLe: "asc" } });
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Comptes</Kicker>
      <h1 className="text-h2 font-light">Demandes de changement de numéro</h1>
      <Retour {...r} />
      {demandes.length === 0 ? <p className="text-muted">Aucune demande en attente.</p> : null}
      {demandes.map((d) => (
        <Card key={d.id} className="flex flex-col gap-3">
          <p>
            <Link href={`/admin/comptes/${d.compteId}`} className="font-medium">{d.compte.utilisateur.name}</Link> ({d.compte.nomCabinet}) demande à remplacer{" "}
            <strong className="font-semibold">{d.ancienNumero}</strong> par <strong className="font-semibold">{d.nouveauNumero}</strong>, le {d.demandeeLe.toLocaleDateString("fr-FR")}.
          </p>
          <form action={traiter} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={d.id} />
            <label className="flex flex-col gap-1 text-small font-medium">
              Motif (en cas de refus)
              <input name="motif" className="min-h-11 rounded-sm border border-muted bg-surface px-2 font-normal" />
            </label>
            <Button type="submit" name="decision" value="accepter">Accepter</Button>
            <Button type="submit" name="decision" value="refuser" variante="secondaire">Refuser</Button>
          </form>
        </Card>
      ))}
    </div>
  );
}
