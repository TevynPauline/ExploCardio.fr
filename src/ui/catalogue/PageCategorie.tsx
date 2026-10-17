import type { ReactNode } from "react";
import Link from "next/link";
import { filtresDepuisAdresse, listerCategorie } from "@/domaine/catalogue/categories";
import { FAMILLES, type CleFamille } from "@/domaine/familles";
import { lireTexte } from "@/domaine/textes";
import { modeDuSite } from "@/lib/config";
import { Kicker } from "../Kicker";
import { TexteRiche } from "../TexteRiche";
import { CarteProduit } from "./CarteProduit";
import { Filtres } from "./Filtres";

type Props = {
  cle: CleFamille;
  parametres: Record<string, string | string[] | undefined>;
  avant?: ReactNode;
  apres?: ReactNode;
};

/** Page catégorie (F03, US1) : introduction courte, filtres, cartes des articles publiés. */
export async function PageCategorie({ cle, parametres, avant, apres }: Props) {
  const famille = FAMILLES[cle];
  const filtres = filtresDepuisAdresse(parametres);
  const [{ titre, html }, resultat] = await Promise.all([lireTexte(famille.texte), listerCategorie(famille.categorie, filtres)]);
  const filtre = Boolean(filtres.marque || filtres.type || filtres.dispo);
  return (
    <div className="mx-auto flex max-w-page flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-3">
        <Kicker>Catalogue</Kicker>
        <h1 className="text-display font-light">{titre}</h1>
        <TexteRiche html={html} />
      </header>
      {avant}
      {resultat.indisponible ? (
        <p role="status" className="ec-box--info p-4">
          Le catalogue est momentanément indisponible. Réessayez dans quelques instants ou{" "}
          <Link href="/qui-sommes-nous#contact">contactez-nous</Link>.
        </p>
      ) : resultat.filtresDisponibles.marques.length === 0 ? (
        <p className="ec-box--info p-4">
          Aucun produit n’est encore présenté dans cette catégorie. <Link href="/qui-sommes-nous#contact">Contactez-nous</Link> : nous vous
          conseillons.
        </p>
      ) : (
        <>
          <Filtres
            marques={resultat.filtresDisponibles.marques}
            types={resultat.filtresDisponibles.types}
            dispos={resultat.filtresDisponibles.dispos}
            valeurs={{ marque: filtres.marque, type: filtres.type, dispo: filtres.dispo, tri: filtres.tri }}
            total={resultat.total}
          />
          {modeDuSite() === "demo" ? (
            <p className="text-small text-muted">Version de démonstration : les prix affichés sont inventés.</p>
          ) : null}
          {resultat.cartes.length ? (
            <ul className="grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {resultat.cartes.map((c) => (
                <li key={c.defaultCode} className="flex">
                  <CarteProduit carte={c} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="ec-box--info p-4">
              Aucun produit ne correspond à ces filtres. {filtre ? <Link href={famille.chemin}>Retirer les filtres</Link> : null}
            </p>
          )}
        </>
      )}
      {apres}
    </div>
  );
}
