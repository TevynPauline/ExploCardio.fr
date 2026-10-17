import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ecrireCaracteristiques, lireArticleAdmin } from "@/domaine/catalogue/administration";
import { cheminFicheDe } from "@/domaine/catalogue/lecture";
import { manquantsPublication, photosDe, textesDe, type DocumentProduit } from "@/domaine/catalogue/publication";
import { slugArticle } from "@/domaine/slugs";
import { dbSite } from "@/lib/db/site";
import { euros } from "@/lib/montants";
import { sessionCourante } from "@/lib/roles";
import { Card, Kicker, Retour } from "@/ui";
import { actionPublier, actionRetirer } from "../actions";
import { FormulaireContenu } from "./FormulaireContenu";

export const metadata: Metadata = { title: "Contenu d'un produit" };

const FORMULES = { achat: "Achat", mise_a_disposition: "Mise à disposition", financement: "Financement" } as const;
const ETATS = { preparation: "En préparation", publie: "Publié", retire: "Retiré du catalogue" } as const;

function Dispo({ etat }: { etat: string }) {
  return <span className="text-small text-muted">{etat}</span>;
}

// Contenu d'un produit (F03, US6) : données d'Odoo en lecture seule ; contenus de présentation
// et publication. Aucun prix, stock, référence, configuration ni formule n'est modifiable ici.
export default async function ContenuProduit({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const reference = decodeURIComponent((await params).reference);
  const retour = await searchParams;
  const [{ article, contenu, odooIndisponible }, session] = await Promise.all([lireArticleAdmin(reference), sessionCourante()]);
  if (!article && !contenu) notFound();
  const admin = (session?.user as { role?: string } | undefined)?.role === "admin";
  const sousCategories = article
    ? await dbSite().sousCategorie.findMany({ where: { categorie: article.categorie }, orderBy: { ordre: "asc" } })
    : [];
  const textes = textesDe(contenu ?? { textes: {} });
  const manquants = contenu ? manquantsPublication(contenu, article) : ["La description courte.", "L'adresse de la fiche."];
  const titre = article ? `${article.marque} ${article.nom}` : reference;

  return (
    <div className="flex flex-col gap-6">
      <Kicker>Catalogue</Kicker>
      <h1 className="text-h2 font-light">{titre}</h1>
      <p><Link href="/admin/catalogue" className="inline-flex min-h-11 items-center">Retour à la liste</Link></p>
      <Retour {...retour} />

      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Données d’Odoo</h2>
        <p className="text-small text-muted">
          Ces informations se gèrent dans Odoo (base fictive en démonstration) : elles ne sont pas modifiables ici.
        </p>
        {odooIndisponible ? <p role="alert" className="font-medium">Odoo est momentanément injoignable.</p> : null}
        {!article && !odooIndisponible ? <p role="alert" className="font-medium">Cet article n’existe plus dans Odoo : son contenu est invisible du public.</p> : null}
        {article ? (
          <>
            <p>
              Réf. {article.reference} · Formules : {article.formules.map((f) => FORMULES[f]).join(", ")}
            </p>
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Configurations et prix lus dans Odoo">
              <table className="w-full border-collapse text-left text-small">
                <caption className="sr-only">Configurations et prix lus dans Odoo</caption>
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="py-1 pr-4 font-medium">Configuration</th>
                    <th scope="col" className="py-1 pr-4 font-medium">Référence</th>
                    <th scope="col" className="py-1 pr-4 font-medium">Prix HT</th>
                    <th scope="col" className="py-1 font-medium">Mise à disposition</th>
                  </tr>
                </thead>
                <tbody>
                  {article.variantes.map((v) => (
                    <tr key={v.defaultCode} className="border-b border-line">
                      <th scope="row" className="py-1 pr-4 font-normal">{v.configuration ?? "Standard"}</th>
                      <td className="py-1 pr-4">{v.defaultCode}</td>
                      <td className="py-1 pr-4">{euros(v.prixHt)}</td>
                      <td className="py-1">
                        {v.offreMiseADisposition ? `${euros(v.offreMiseADisposition.premierMoisHt)} puis ${euros(v.offreMiseADisposition.moisSuivantsHt)} / mois` : <Dispo etat="—" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Publication</h2>
        <p>
          État : <strong>{contenu ? ETATS[contenu.etat] : "À rédiger"}</strong>
          {contenu?.etat === "publie" && article ? (
            <>
              {" "}· <Link href={cheminFicheDe(article.categorie, contenu.slug)}>Voir la fiche</Link>
            </>
          ) : null}
        </p>
        {manquants.length ? (
          <div>
            <p className="font-medium">Pour publier, il manque :</p>
            <ul className="list-disc pl-6">{manquants.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        ) : null}
        {admin ? (
          <div className="flex flex-wrap gap-3">
            {contenu?.etat !== "publie" ? (
              <form action={actionPublier}>
                <input type="hidden" name="reference" value={reference} />
                <button type="submit" className="ec-btn ec-btn--primary">Publier</button>
              </form>
            ) : null}
            {contenu?.etat === "publie" ? (
              <>
                <form action={actionRetirer}>
                  <input type="hidden" name="reference" value={reference} />
                  <input type="hidden" name="etat" value="preparation" />
                  <button type="submit" className="ec-btn ec-btn--secondary">Remettre en préparation</button>
                </form>
                <form action={actionRetirer}>
                  <input type="hidden" name="reference" value={reference} />
                  <input type="hidden" name="etat" value="retire" />
                  <button type="submit" className="ec-btn ec-btn--secondary">Retirer du catalogue</button>
                </form>
              </>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Contenus de présentation</h2>
        {admin ? (
          <FormulaireContenu
            madProposee={Boolean(article?.formules.includes("mise_a_disposition"))}
            sousCategories={sousCategories.map((s) => ({ id: s.id, libelle: s.libelle }))}
            v={{
              reference,
              slug: contenu?.slug ?? (article ? slugArticle(article.marque, article.nom) : ""),
              sousCategorieId: contenu?.sousCategorieId ?? "",
              ordre: String(contenu?.ordre ?? 0),
              descriptionCourte: textes.descriptionCourte ?? article?.description ?? "",
              caracteristiques: ecrireCaracteristiques(textes.caracteristiques),
              contenuCoffret: textes.contenuCoffret ?? "",
              contenuPackMad: textes.contenuPackMad ?? "",
              logicielAssocie: textes.logicielAssocie ?? "",
              garantie: textes.garantie ?? "",
              compatibilites: (contenu?.compatibilites ?? []).join(", "),
              produitsAssocies: (contenu?.produitsAssocies ?? []).join(", "),
              photos: contenu ? photosDe(contenu) : [],
              documents: contenu && Array.isArray(contenu.documents) ? (contenu.documents as DocumentProduit[]) : [],
            }}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-small text-muted">Lecture seule : la rédaction est réservée à l’administrateur.</p>
            <p>{textes.descriptionCourte || "Aucune description."}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
