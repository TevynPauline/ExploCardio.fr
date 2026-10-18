import type { Metadata } from "next";
import Link from "next/link";
import type { Devis } from "@/connecteurs/odoo/interfaces";
import { dbSite } from "@/lib/db/site";
import { euros } from "@/lib/montants";
import { Kicker } from "@/ui";

export const metadata: Metadata = { title: "Commandes du site" };

const ETATS: Record<string, string> = {
  sans_objet: "—",
  a_payer: "À payer",
  paiement_en_cours: "Paiement en cours",
  refusee: "Refusé",
  en_attente_virement: "Virement attendu",
  payee: "Payé",
  a_enregistrer: "Payé, à enregistrer dans Odoo",
};

// Commandes passées sur le site (lecture seule, FR-039) : la gestion se fait dans Odoo. Les
// anomalies « payé, à enregistrer » sont mises en avant ; le site les rattrape seul.
export default async function Commandes({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const { vue } = await searchParams;
  const anomalies = vue === "anomalies";
  const filtreAnomalies = { OR: [{ etatAchat: "a_enregistrer" as const }, { etatAbonnement: "a_enregistrer" as const }] };
  const [commandes, nbAnomalies] = await Promise.all([
    dbSite().commandeSite.findMany({
      where: anomalies ? filtreAnomalies : { etape: { not: "adresses" } },
      include: { compte: { include: { utilisateur: true } } },
      orderBy: { modifieLe: "desc" },
      take: 100,
    }),
    dbSite().commandeSite.count({ where: filtreAnomalies }),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Commandes</Kicker>
      <h1 className="text-h2 font-light">Commandes du site</h1>
      <p className="text-muted">Lecture seule : les commandes se traitent dans Odoo (préparation, expédition, remboursement).</p>
      {nbAnomalies ? (
        <p role="status" className="ec-box--promo p-4">
          {nbAnomalies} commande{nbAnomalies > 1 ? "s payées n’ont" : " payée n’a"} pas encore été enregistrée{nbAnomalies > 1 ? "s" : ""} dans Odoo : le site réessaie toutes les 5 minutes.
        </p>
      ) : null}
      <nav aria-label="Vues" className="flex flex-wrap gap-2">
        <Link href="?" aria-current={!anomalies ? "page" : undefined} className={`ec-btn ${!anomalies ? "ec-btn--primary" : "ec-btn--secondary"}`}>Récentes</Link>
        <Link href="?vue=anomalies" aria-current={anomalies ? "page" : undefined} className={`ec-btn ${anomalies ? "ec-btn--primary" : "ec-btn--secondary"}`}>À enregistrer ({nbAnomalies})</Link>
      </nav>
      {commandes.length === 0 ? (
        <p className="text-muted">Aucune commande dans cette liste.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Commandes du site</caption>
            <thead>
              <tr className="border-b border-line text-small text-muted">
                <th scope="col" className="py-2 pr-4 font-medium">Commande</th>
                <th scope="col" className="py-2 pr-4 font-medium">Client</th>
                <th scope="col" className="py-2 pr-4 font-medium">Achat</th>
                <th scope="col" className="py-2 pr-4 font-medium">Mise à disposition</th>
                <th scope="col" className="py-2 pr-4 font-medium">Total TTC</th>
                <th scope="col" className="py-2 font-medium">Mise à jour</th>
              </tr>
            </thead>
            <tbody>
              {commandes.map((c) => {
                const devis = c.devis as Devis | null;
                return (
                  <tr key={c.id} className="border-b border-line">
                    <th scope="row" className="py-2 pr-4 font-medium">
                      {c.ref}
                      {c.odooCommandeRef ? <span className="block text-small font-normal text-muted">Odoo : {c.odooCommandeRef}</span> : null}
                    </th>
                    <td className="py-2 pr-4">
                      {c.compte.nomCabinet || c.compte.utilisateur.name}
                      <span className="block text-small text-muted">{c.compte.utilisateur.email}</span>
                    </td>
                    <td className="py-2 pr-4">{ETATS[c.etatAchat] ?? c.etatAchat}{c.moyenEffectif ? ` (${c.moyenEffectif})` : ""}</td>
                    <td className="py-2 pr-4">{ETATS[c.etatAbonnement] ?? c.etatAbonnement}</td>
                    <td className="py-2 pr-4">{devis?.achat ? euros(devis.achat.totalTtc) : "—"}</td>
                    <td className="py-2">{c.modifieLe.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</td>
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
