import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { compteConnecte } from "@/domaine/comptes/session";
import { lireCatalogue } from "@/domaine/catalogue/lecture";
import { COOKIE_PANIER, lignesPanier, panierPour } from "@/domaine/catalogue/panier";
import { euros } from "@/lib/montants";
import { Kicker } from "@/ui";
import { Disponibilite } from "@/ui/catalogue/Disponibilite";

export const metadata: Metadata = { title: "Panier" };

// Panier (F03, D1) : lignes ajoutées depuis les fiches, en lecture seule ; la modification,
// la fusion à la connexion et la commande arrivent avec F04.
export default async function Panier() {
  const compte = await compteConnecte();
  const jeton = (await cookies()).get(COOKIE_PANIER)?.value;
  const panier = await panierPour(compte ? { compteId: compte.id } : { jeton }, false);
  const lignes = panier ? await lignesPanier(panier.id) : [];

  if (!lignes.length) {
    return (
      <div className="mx-auto flex max-w-page flex-col gap-4 px-4 py-10">
        <Kicker>Panier</Kicker>
        <h1 className="text-display font-light">Votre panier est vide</h1>
        <p><Link href="/catalogue" className="ec-btn ec-btn--primary">Découvrir le catalogue</Link></p>
      </div>
    );
  }

  const catalogue = await lireCatalogue();
  const parCode = new Map(catalogue.entrees.flatMap((e) => e.article.variantes.map((v) => [v.defaultCode, { e, v }] as const)));
  return (
    <div className="mx-auto flex max-w-page flex-col gap-6 px-4 py-10">
      <Kicker>Panier</Kicker>
      <h1 className="text-display font-light">Votre panier</h1>
      <ul className="flex list-none flex-col gap-3 p-0">
        {lignes.map((l) => {
          const trouve = parCode.get(l.defaultCode);
          const dispo = trouve?.e.disponibilites.get(l.defaultCode);
          const etat = l.formule === "achat" ? dispo?.achat : dispo?.miseADisposition;
          // Client connecté : son prix (liste de prix d'Odoo) constaté à l'ajout ; visiteur : prix public en vigueur.
          const prix =
            !compte && trouve
              ? l.formule === "achat"
                ? trouve.v.prixHt
                : (trouve.v.offreMiseADisposition?.premierMoisHt ?? l.prixHtConstate)
              : l.prixHtConstate;
          return (
            <li key={l.id} className="ec-card flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold">
                  {trouve ? <Link href={trouve.e.chemin}>{trouve.e.article.nom}</Link> : l.defaultCode}
                  {trouve?.v.configuration ? ` — ${trouve.v.configuration}` : ""}
                </p>
                <p className="text-small text-muted">
                  {l.formule === "achat" ? "Achat" : "Mise à disposition mensuelle"} · Réf. {l.defaultCode} · Quantité : {l.quantite}
                </p>
                {etat && etat.etat !== "disponible" ? <Disponibilite etat={etat} /> : null}
              </div>
              <p className="font-semibold text-ink">
                {euros(prix * l.quantite)} HT{l.formule === "mise_a_disposition" ? " le premier mois" : ""}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="ec-box--info p-4">
        La commande en ligne arrive bientôt. En attendant, <Link href="/qui-sommes-nous?motif=Information%20produit#contact">contactez-nous</Link> pour
        finaliser votre commande.
      </p>
    </div>
  );
}
