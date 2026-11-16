import type { Metadata } from "next";
import Link from "next/link";
import { carteDe } from "@/domaine/catalogue/categories";
import { lireConsommables } from "@/domaine/catalogue/consommables";
import { modeDuSite } from "@/lib/config";
import { CarteProduit } from "@/ui/catalogue/CarteProduit";
import { FilAriane } from "@/ui/FilAriane";
import { Kicker } from "@/ui/Kicker";

export const metadata: Metadata = {
  title: "Consommables pour Holter, MAPA, épreuve d'effort et ECG",
  description: "Électrodes, protecteurs de brassards et autres consommables, rangés par examen : Holter ECG, MAPA, épreuve d'effort, ECG de repos.",
};

/** Tous les consommables (F27, US3) : articles de type « Consommable » d'Odoo, par examen. */
export default async function Consommables() {
  const { groupes, indisponible } = await lireConsommables();
  return (
    <div className="mx-auto flex max-w-page flex-col gap-10 px-4 py-10">
      <FilAriane etapes={[{ libelle: "Consommables" }]} />
      <header className="flex flex-col gap-3">
        <Kicker>Catalogue</Kicker>
        <h1 className="text-display font-light">Consommables</h1>
        <p className="max-w-prose text-ink">Retrouvez les consommables de vos examens, rangés par appareil.</p>
      </header>
      {indisponible ? (
        <p role="status" className="ec-box--info p-4">
          Le catalogue est momentanément indisponible. Réessayez dans quelques instants ou <Link href="/qui-sommes-nous#contact">contactez-nous</Link>.
        </p>
      ) : groupes.length === 0 ? (
        <p className="ec-box--info p-4">
          Aucun consommable n’est encore présenté. <Link href="/qui-sommes-nous#contact">Contactez-nous</Link> : nous vous conseillons.
        </p>
      ) : (
        <>
          {modeDuSite() === "demo" ? <p className="text-small text-muted">Version de démonstration : les prix affichés sont inventés.</p> : null}
          {groupes.map((g) => (
            <section key={g.rubrique} id={g.rubrique} aria-labelledby={`titre-${g.rubrique}`} className="flex scroll-mt-32 flex-col gap-4">
              <h2 id={`titre-${g.rubrique}`} className="text-h2 font-light">
                {g.titre}
              </h2>
              <ul className="grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
                {g.entrees.map((e) => (
                  <li key={e.article.reference} className="flex">
                    <CarteProduit carte={carteDe(e)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
