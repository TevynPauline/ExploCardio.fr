import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TYPES_CAMPAGNE } from "@/domaine/emailing/campagnes";
import { paragraphes } from "@/emails/modeles-emailing";
import { dbSite } from "@/lib/db/site";
import { exigerAdministrateur } from "@/lib/roles";
import { Button, Card, Champ, Kicker, Retour } from "@/ui";
import { actionAnnulerCampagne, actionModifierCampagne, actionProgrammerCampagne, actionTesterCampagne } from "../../actions";
import { dateCourte, ETATS_CAMPAGNE } from "../etats";
import { FormulaireCampagne } from "../FormulaireCampagne";
import { RappelPatient } from "@/ui/admin";

export const metadata: Metadata = { title: "Campagne" };

// Une campagne (F10, US3, D7) : modifier le brouillon, s'envoyer un test (obligatoire),
// programmer, annuler ; résultats une fois partie.
export default async function CampagneDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await exigerAdministrateur();
  const { id } = await params;
  const r = await searchParams;
  const c = await dbSite().campagne.findUnique({ where: { id } });
  if (!c) notFound();
  const parEtat = await dbSite().envoi.groupBy({ by: ["etat"], where: { campagneId: id }, _count: true });
  const compte = (e: string) => parEtat.find((x) => x.etat === e)?._count ?? 0;
  const ouverts = await dbSite().envoi.count({ where: { campagneId: id, ouvertLe: { not: null } } });
  const brouillon = c.etat === "brouillon";
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Emails · Campagnes</Kicker>
      <h1 className="text-h2 font-light">{c.objet}</h1>
      <p className="text-muted">
        {TYPES_CAMPAGNE[c.type]} · {ETATS_CAMPAGNE[c.etat]}
        {c.programmeePour ? ` · envoi le ${dateCourte(c.programmeePour)}` : ""} · <Link href="/admin/emails/campagnes">toutes les campagnes</Link>
      </p>
      <Retour {...r} />
      <RappelPatient />

      {brouillon ? (
        <>
          <Card className="flex flex-col gap-3">
            <h2 className="text-h3 font-semibold">1. Vérifier avec un email de test</h2>
            <p className="text-small text-muted">
              {c.testEnvoyeLe ? `Dernier test envoyé le ${dateCourte(c.testEnvoyeLe)}.` : "Aucun test envoyé : la campagne ne peut pas encore être programmée."}
            </p>
            <form action={actionTesterCampagne}>
              <input type="hidden" name="id" value={c.id} />
              <Button type="submit" variante="secondaire">M’envoyer un email de test</Button>
            </form>
          </Card>
          <Card className="flex flex-col gap-3">
            <h2 className="text-h3 font-semibold">2. Programmer l’envoi</h2>
            <p className="text-small text-muted">Aux abonnés confirmés à la newsletter, les jours ouvrés de 8 h à 19 h. Sans date : au prochain créneau.</p>
            <form action={actionProgrammerCampagne} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={c.id} />
              <Champ id="campagne-date" name="date" type="datetime-local" libelle="Date d’envoi (facultatif)" />
              <Button type="submit" disabled={!c.testEnvoyeLe}>Programmer</Button>
            </form>
          </Card>
          <Card className="flex flex-col gap-3">
            <h2 className="text-h3 font-semibold">Modifier le brouillon</h2>
            <FormulaireCampagne action={actionModifierCampagne} campagne={c} bouton="Enregistrer les modifications" />
          </Card>
        </>
      ) : (
        <Card className="flex flex-col gap-3">
          <h2 className="text-h3 font-semibold">Résultats</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
            {[
              ["Abonnés visés", c.destinataires ?? 0],
              ["En attente", compte("programme")],
              ["Envoyés", compte("envoye") + compte("remis") + compte("rejete")],
              ["Remis", compte("remis")],
              ["Ouverts", ouverts],
              ["Rejetés", compte("rejete")],
              ["Non envoyés (désinscription, fréquence…)", compte("annule")],
            ].map(([l, v]) => (
              <div key={String(l)}>
                <dt className="text-small text-muted">{l}</dt>
                <dd className="text-h3 font-light">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {["brouillon", "programmee", "en_cours"].includes(c.etat) ? (
        <form action={actionAnnulerCampagne}>
          <input type="hidden" name="id" value={c.id} />
          <Button type="submit" variante="secondaire">Annuler la campagne</Button>
        </form>
      ) : null}

      <Card className="flex flex-col gap-2">
        <h2 className="text-h3 font-semibold">Contenu</h2>
        <p className="font-semibold">{c.titre}</p>
        {paragraphes(c.texte).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {c.lien ? <p className="text-small text-muted">Bouton « {c.libelleLien || "En savoir plus"} » → {c.lien}</p> : null}
      </Card>
    </div>
  );
}
