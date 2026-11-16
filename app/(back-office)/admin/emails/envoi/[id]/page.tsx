import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MOTIF_BLOQUE_RECETTE } from "@/domaine/emailing/envoi";
import { dbSite } from "@/lib/db/site";
import { exigerAdministrateur } from "@/lib/roles";
import { Card, Kicker } from "@/ui";

export const metadata: Metadata = { title: "Email retenu en recette" };

// F25 (US4, FR-016) : contenu d'un email retenu sur le site de recette (destinataire non
// autorisé). Lecture seule ; le rendu n'est conservé que pour ces envois-là.
export default async function EnvoiRetenu({ params }: { params: Promise<{ id: string }> }) {
  await exigerAdministrateur();
  const { id } = await params;
  const e = await dbSite().envoi.findUnique({ where: { id } });
  if (!e || e.motif !== MOTIF_BLOQUE_RECETTE || !e.rendu) notFound();
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Emails</Kicker>
      <h1 className="text-h2 font-light">Email retenu en recette</h1>
      <p>
        <Link href="/admin/emails">← Suivi des envois</Link>
      </p>
      <Card>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-small">
          <dt className="font-semibold">Destinataire</dt>
          <dd className="break-all">{e.destinataire}</dd>
          <dt className="font-semibold">Objet</dt>
          <dd>{e.objet}</dd>
          <dt className="font-semibold">Événement</dt>
          <dd>{e.declencheur}</dd>
        </dl>
        <p className="mt-3 text-small text-muted">
          Cet email n’a pas été envoyé : sur le site de recette, seules les adresses autorisées reçoivent des emails.
        </p>
        <iframe title={`Rendu de l'email : ${e.objet ?? ""}`} srcDoc={e.rendu} sandbox="" className="mt-4 h-[640px] w-full rounded-sm border border-line bg-surface" />
      </Card>
    </div>
  );
}
