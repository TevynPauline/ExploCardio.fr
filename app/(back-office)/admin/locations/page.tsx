import type { Metadata } from "next";
import Link from "next/link";
import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import type { ChangementLocation } from "@/connecteurs/odoo/interfaces";
import { LIBELLES_LOCATION } from "@/domaine/commande/mon-compte";
import { dbSite } from "@/lib/db/site";
import { euros } from "@/lib/montants";
import { Kicker } from "@/ui";

export const metadata: Metadata = { title: "Locations" };

const VUES = {
  commandees: { libelle: "Commandées", filtre: (l: ChangementLocation) => l.etat === "commandee" },
  en_cours: { libelle: "En cours", filtre: (l: ChangementLocation) => l.etat === "en_cours" || l.etat === "resiliation_prevue" },
  impayes: { libelle: "Impayés", filtre: (l: ChangementLocation) => l.impaye || l.etat === "suspendue_impaye" },
  retards: { libelle: "Retards de retour", filtre: (l: ChangementLocation) => l.etat === "en_retard_retour" },
} as const;

const date = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }) : "—");

// Locations (F05, FR-039) : lecture seule ; l'affectation des appareils, les expéditions, les
// retours et les impayés se traitent dans Odoo.
export default async function Locations({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const { vue: v = "commandees" } = await searchParams;
  const vue = (v in VUES ? v : "commandees") as keyof typeof VUES;
  let toutes: ChangementLocation[] = [];
  let indisponible = false;
  try {
    toutes = (await registre.odoo().location.listerChangements(new Date(0))).filter((l) => l.objet === "mise_a_disposition");
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e;
    indisponible = true;
  }
  const comptes = await dbSite().compteClient.findMany({ where: { odooPartnerRef: { in: [...new Set(toutes.map((l) => l.partenaireRef))] } }, include: { utilisateur: true } });
  const client = (ref: string) => comptes.find((c) => c.odooPartnerRef === ref);
  const liste = toutes.filter(VUES[vue].filtre);
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Locations</Kicker>
      <h1 className="text-h2 font-light">Mises à disposition</h1>
      <p className="text-muted">Lecture seule : le parc, les expéditions, les retours et les impayés se gèrent dans Odoo.</p>
      {indisponible ? <p role="status" className="ec-box--info p-4">Odoo est momentanément injoignable.</p> : null}
      <nav aria-label="Vues" className="flex flex-wrap gap-2">
        {(Object.keys(VUES) as (keyof typeof VUES)[]).map((k) => (
          <Link key={k} href={`?vue=${k}`} aria-current={k === vue ? "page" : undefined} className={`ec-btn ${k === vue ? "ec-btn--primary" : "ec-btn--secondary"}`}>
            {VUES[k].libelle} ({toutes.filter(VUES[k].filtre).length})
          </Link>
        ))}
      </nav>
      {!liste.length ? (
        <p className="text-muted">Aucune location dans cette liste.</p>
      ) : (
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Locations (tableau défilant)">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Locations : {VUES[vue].libelle}</caption>
            <thead>
              <tr className="border-b border-line text-small text-muted">
                <th scope="col" className="py-2 pr-4 font-medium">Location</th>
                <th scope="col" className="py-2 pr-4 font-medium">Client</th>
                <th scope="col" className="py-2 pr-4 font-medium">État</th>
                <th scope="col" className="py-2 pr-4 font-medium">Dates</th>
                <th scope="col" className="py-2 font-medium">Mensuel HT</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((l) => {
                const c = client(l.partenaireRef);
                return (
                  <tr key={l.ref} className="border-b border-line align-top">
                    <th scope="row" className="py-2 pr-4 font-medium">
                      {l.ref}
                      <span className="block text-small font-normal text-muted">{l.libelle}{l.numeroSerie ? ` — n° ${l.numeroSerie}` : ""}</span>
                    </th>
                    <td className="py-2 pr-4">
                      {c ? <Link href={`/admin/comptes/${c.id}`}>{c.utilisateur.name}</Link> : l.partenaireRef}
                      {c ? <span className="block text-small text-muted">{c.utilisateur.email}</span> : null}
                    </td>
                    <td className="py-2 pr-4">
                      {LIBELLES_LOCATION[l.etat]}
                      {l.expeditionBloquee ? <span className="block text-small">Expédition bloquée : compte à valider</span> : null}
                      {l.impaye ? <span className="block text-small">Prélèvement impayé</span> : null}
                      {l.colisNonLivre ? <span className="block text-small">Colis non livré</span> : null}
                    </td>
                    <td className="py-2 pr-4 text-small">
                      Livraison {date(l.dateLivraison)} · échéance {date(l.prochaineEcheance)}
                      {l.fin ? ` · fin ${date(l.fin)}` : ""}
                      {l.dateLimiteRetour ? ` · retour avant ${date(l.dateLimiteRetour)}` : ""}
                    </td>
                    <td className="py-2">{euros(l.montantMensuelHt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
