import type { Metadata } from "next";
import Link from "next/link";
import { registre } from "@/connecteurs/registre";
import { listerClients } from "@/domaine/clients";
import { modeDuSite } from "@/lib/config";
import { dbSite } from "@/lib/db/site";
import { exigerDroit, peut } from "@/lib/droits";
import { Card, Kicker } from "@/ui";

export const metadata: Metadata = { title: "À traiter" };

type Element = { href: string; libelle: string; nombre: number; detail?: string };

async function aTraiter(role: string): Promise<Element[]> {
  const elements: Element[] = [];
  if (peut(role, "comptes.valider", "modifier")) {
    const attente = await listerClients("en_attente");
    const prioritaires = attente.filter((c) => c.prioritaire).length;
    elements.push({ href: "/admin/clients?statut=en_attente", libelle: "Comptes à valider", nombre: attente.length, detail: prioritaires ? `dont ${prioritaires} prioritaire${prioritaires > 1 ? "s" : ""}` : undefined });
  }
  if (peut(role, "demandes", "modifier")) {
    const [financements, devis, messages] = await Promise.all([
      dbSite().demandeFinancement.count({ where: { statut: "recue" } }),
      dbSite().demandeDevis.count({ where: { statut: "recue" } }),
      dbSite().messageContact.count({ where: { etat: "nouveau" } }),
    ]);
    elements.push({ href: "/admin/financements", libelle: "Demandes de financement reçues", nombre: financements });
    elements.push({ href: "/admin/devis", libelle: "Demandes de devis reçues", nombre: devis });
    elements.push({ href: "/admin/demandes/messages", libelle: "Messages de contact nouveaux", nombre: messages });
  }
  if (peut(role, "cloud.agir", "modifier")) {
    const taches = await dbSite().tacheAcces.count({ where: { etat: "a_faire" } });
    elements.push({ href: "/admin/logiciels-cloud", libelle: "Accès Cloud à ouvrir ou fermer", nombre: taches });
  }
  if (peut(role, "journal", "voir")) {
    const erreurs = await dbSite().journalConnecteur.count({ where: { resultat: "erreur", date: { gte: new Date(Date.now() - 24 * 3600_000) } } });
    elements.push({ href: "/admin/journal?resultat=erreur", libelle: "Erreurs des connecteurs (24 h)", nombre: erreurs });
  }
  return elements;
}

// Tableau de bord « À traiter » (F13, D1) : ce qui attend une action, selon le rôle.
export default async function TableauDeBord({ searchParams }: { searchParams: Promise<{ acces?: string }> }) {
  const { role } = await exigerDroit("a_traiter", "voir");
  const { acces } = await searchParams;
  const elements = await aTraiter(role);
  const modes = registre.modes();
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Back-office</Kicker>
      <h1 className="text-h2 font-light">À traiter</h1>
      {acces === "refuse" ? (
        <p role="alert" className="ec-box--info p-4">
          Cette page est réservée à un autre rôle.
        </p>
      ) : null}
      {elements.length ? (
        <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {elements.map((e) => (
            <li key={e.href}>
              <Link href={e.href} className="ec-card block h-full no-underline hover:border-action">
                <span className="block text-h2 font-light text-ink">{e.nombre}</span>
                <span className="block font-semibold text-action">{e.libelle}</span>
                {e.detail ? <span className="block text-small text-muted">{e.detail}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">Rien à traiter pour votre rôle. La rubrique Clients permet de retrouver un client.</p>
      )}
      {peut(role, "journal", "voir") ? (
        <Card>
          <h2 className="text-h3 font-semibold">Mode des connecteurs</h2>
          <p className="text-muted">Site : {modeDuSite() === "demo" ? "démonstration" : "production"}</p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {Object.entries(modes).map(([nom, mode]) => (
              <li key={nom}>
                <span className="font-medium">{nom}</span> : {mode === "demo" ? "démonstration" : "réel"}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
