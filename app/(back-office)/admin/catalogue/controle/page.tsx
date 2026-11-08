import type { Metadata } from "next";
import Link from "next/link";
import { LIBELLES_ANOMALIE, LIBELLES_OBJET, lireRapportControle } from "@/domaine/catalogue/controle";
import { Kicker } from "@/ui";

export const metadata: Metadata = { title: "Contrôle des données Odoo" };
export const dynamic = "force-dynamic";

// Rapport de contrôle des données Odoo (F14, FR-027) : ce qu'il faut compléter dans Odoo pour
// que les produits s'affichent sur le site.
export default async function ControleOdoo() {
  const rapport = await lireRapportControle();
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Catalogue</Kicker>
      <h1 className="text-h2 font-light">Contrôle des données Odoo</h1>
      <p className="max-w-prose text-muted">
        Ce qui manque dans Odoo pour que les produits s&apos;affichent correctement sur le site. Les points bloquants empêchent
        l&apos;affichage du produit ; les autres sont à compléter.
        {rapport.mode === "demo" ? " Le site est en démonstration : le rapport porte sur la base fictive." : ""}
      </p>
      <p>
        <Link href="/admin/catalogue" className="inline-flex min-h-11 items-center">Retour au catalogue</Link>
      </p>
      {!rapport.disponible ? (
        <p role="alert" className="ec-box--promo p-4 font-medium">Odoo est momentanément injoignable : le rapport ne peut pas être établi.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <p data-testid="compteurs">
              <strong className="font-semibold">{rapport.bloquantes}</strong> bloquant{rapport.bloquantes > 1 ? "s" : ""} ·{" "}
              <strong className="font-semibold">{rapport.aCompleter}</strong> à compléter
            </p>
            {rapport.anomalies.length ? (
              <a href="/admin/catalogue/controle/export" className="ec-btn ec-btn--secondary" download>
                Exporter (CSV)
              </a>
            ) : null}
          </div>
          {rapport.anomalies.length === 0 ? (
            <p className="font-medium">Aucune anomalie : toutes les données nécessaires au site sont renseignées.</p>
          ) : (
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Anomalies des données Odoo">
              <table className="w-full border-collapse text-left text-small">
                <caption className="sr-only">Anomalies des données Odoo, les points bloquants en premier</caption>
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th scope="col" className="py-2 pr-3 font-medium">Gravité</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Objet</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Référence</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Nom</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Anomalie</th>
                    <th scope="col" className="py-2 font-medium">Détail</th>
                  </tr>
                </thead>
                <tbody>
                  {rapport.anomalies.map((a, i) => (
                    <tr key={`${a.objet}-${a.reference}-${a.code}-${i}`} className="border-b border-line align-top">
                      <td className="py-2 pr-3 whitespace-nowrap">{a.bloquant ? <strong className="font-semibold">Bloquant</strong> : "À compléter"}</td>
                      <td className="py-2 pr-3">{LIBELLES_OBJET[a.objet]}</td>
                      <td className="py-2 pr-3 break-all">{a.reference}</td>
                      <td className="py-2 pr-3">{a.nom}</td>
                      <td className="py-2 pr-3">{LIBELLES_ANOMALIE[a.code]}</td>
                      <td className="py-2">{a.detail ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
