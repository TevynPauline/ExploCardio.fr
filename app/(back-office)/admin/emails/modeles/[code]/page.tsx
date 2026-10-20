import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATALOGUE, type EntreeCatalogue } from "@/domaine/emailing/catalogue";
import { apercuModele, etatModele, TexteRefuse } from "@/domaine/emailing/textes";
import { variablesDesTextes } from "@/emails/textes";
import { exigerAdministrateur } from "@/lib/roles";
import { Button, Card, Champ, Kicker, Retour } from "@/ui";
import { actionBrouillonModele, actionOrigineModele, actionPublierModele, actionTesterModele } from "../../actions";
import { dateCourte } from "../../campagnes/etats";

export const metadata: Metadata = { title: "Modèle d’email" };

const zone = "min-h-28 w-full rounded-sm border border-muted bg-surface px-3 py-2 text-body text-ink focus-visible:border-action focus-visible:outline-2 focus-visible:outline-action";

// Un modèle d'email (F10, US8, FR-026, SC-009, D2) : modifier le brouillon, l'aperçu avec des
// données d'exemple, s'envoyer un test, publier, revenir au texte d'origine.
export default async function Modele({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await exigerAdministrateur();
  const { code } = await params;
  const r = await searchParams;
  const entree = (CATALOGUE as Record<string, EntreeCatalogue>)[code];
  if (!entree || code === "campagne") notFound();
  let etat;
  try {
    etat = await etatModele(code);
  } catch (e) {
    if (e instanceof TexteRefuse) notFound();
    throw e;
  }
  const courant = etat.brouillon ?? etat.publie ?? etat.defaut;
  const apercu = await apercuModele(code, etat.brouillon ?? undefined).catch(() => null);
  const champs = (nom: string) => <input type="hidden" name="code" value={code} key={nom} />;
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Emails · Modèles</Kicker>
      <h1 className="text-h2 font-light">{entree.libelle}</h1>
      <p className="text-muted">
        {entree.famille === "transactionnel" ? "Toujours envoyé" : "Email de service, désactivable"} · {entree.module}
        {etat.publieLe ? ` · texte modifié publié le ${dateCourte(etat.publieLe)} par ${etat.publiePar}` : " · texte d’origine"}
        {etat.brouillon ? " · brouillon non publié" : ""} · <Link href="/admin/emails/modeles">tous les modèles</Link>
      </p>
      <Retour {...r} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="flex min-w-0 flex-col gap-3">
          <h2 className="text-h3 font-semibold">Textes</h2>
          <p className="text-small text-muted">
            Informations insérées automatiquement : {variablesDesTextes(etat.defaut).map((v) => `{{${v}}}`).join(", ") || "aucune"}. Elles doivent rester dans l’email. Une ligne vide sépare deux paragraphes ; **texte** met en gras.
          </p>
          <form action={actionBrouillonModele} className="flex flex-col gap-3">
            {champs("brouillon")}
            <Champ id="modele-objet" name="objet" libelle="Objet" maxLength={120} required defaultValue={courant.objet} />
            <Champ id="modele-apercu" name="apercu" libelle="Texte d’aperçu (affiché après l’objet dans la messagerie)" maxLength={150} defaultValue={courant.apercu} />
            <Champ id="modele-titre" name="titre" libelle="Titre dans l’email (vide : l’objet)" maxLength={120} defaultValue={courant.titre ?? ""} />
            {Object.entries(courant.blocs).map(([nom, texte]) => (
              <div key={nom} className="flex flex-col gap-1">
                <label htmlFor={`bloc-${nom}`} className="text-small font-medium text-ink">Paragraphe « {nom.replace(/_/g, " ")} »</label>
                <textarea id={`bloc-${nom}`} name={`bloc.${nom}`} className={zone} maxLength={2000} defaultValue={texte} />
              </div>
            ))}
            <div><Button type="submit">Enregistrer le brouillon</Button></div>
          </form>
          <div className="flex flex-wrap gap-3">
            <form action={actionTesterModele}>{champs("test")}<Button type="submit" variante="secondaire">M’envoyer un email de test</Button></form>
            {etat.brouillon ? <form action={actionPublierModele}>{champs("publier")}<Button type="submit">Publier</Button></form> : null}
            {etat.publie || etat.brouillon ? <form action={actionOrigineModele}>{champs("origine")}<Button type="submit" variante="secondaire">Revenir au texte d’origine</Button></form> : null}
          </div>
        </Card>
        <Card className="flex min-w-0 flex-col gap-3">
          <h2 className="text-h3 font-semibold">Aperçu {etat.brouillon ? "du brouillon" : "du texte en vigueur"}</h2>
          {apercu ? (
            <>
              <p className="text-small"><strong>Objet :</strong> {apercu.objet}</p>
              <iframe title={`Rendu de l'email : ${apercu.objet}`} srcDoc={apercu.rendu} sandbox="" className="h-[640px] w-full rounded-sm border border-line bg-surface" />
            </>
          ) : (
            <p className="text-muted">Aperçu indisponible.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
