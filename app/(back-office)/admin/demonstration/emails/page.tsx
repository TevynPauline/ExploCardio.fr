import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { outilsDemonstrationDisponibles } from "@/connecteurs/demonstration";
import { registre } from "@/connecteurs/registre";
import { dbSite } from "@/lib/db/site";
import { Button, Card, Champ, Kicker, Retour } from "@/ui";
import { lancerScenariosEmails, simulerCommandesRegulieres } from "../actions";

export const metadata: Metadata = { title: "Emails automatisés de démonstration" };

const select = "min-h-11 w-full max-w-full rounded-sm border border-muted bg-surface px-2";

// Emails automatisés (F10) : préparer un historique de commandes régulières pour montrer la
// relance de réapprovisionnement, et lancer les scénarios sans attendre leur heure. Absent en
// mode réel.
export default async function EmailsDemo({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  if (!outilsDemonstrationDisponibles()) notFound();
  const r = await searchParams;
  const [comptes, references] = await Promise.all([
    dbSite().compteClient.findMany({
      where: { statut: "valide", odooPartnerRef: { not: null } },
      select: { odooPartnerRef: true, nomCabinet: true, utilisateur: { select: { name: true, email: true } } },
      // Comptes de démonstration d'abord, puis les plus récents (comptes créés pendant une séance).
      orderBy: [{ estDemonstration: "desc" }, { creeLe: "desc" }],
      take: 100,
    }),
    registre.odoo().catalogue.listerReferences().catch(() => []),
  ]);
  const consommables = references.filter((x) => x.type === "consommable");
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Démonstration</Kicker>
      <h1 className="text-h2 font-light">Emails automatisés</h1>
      <p className="text-muted">
        Les scénarios partent d’eux-mêmes chaque jour. Ici, vous pouvez les déclencher tout de suite ; les emails arrivent dans la{" "}
        <Link href="/admin/demonstration/boite">boîte de démonstration</Link>.
      </p>
      <Retour {...r} />

      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Commandes régulières d’un consommable</h2>
        <p className="text-small text-muted">Crée des commandes livrées, espacées régulièrement, dans le passé. Exemple : 3 commandes tous les 60 jours, la dernière il y a 53 jours → relance aujourd’hui.</p>
        <form action={simulerCommandesRegulieres} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-small font-medium">
            Client
            <select name="partenaire" className={select} required>
              {comptes.map((c) => (
                <option key={c.odooPartnerRef} value={c.odooPartnerRef!}>
                  {c.utilisateur.name}
                  {c.nomCabinet ? ` — ${c.nomCabinet}` : ""} ({c.utilisateur.email})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-small font-medium">
            Consommable
            <select name="article" className={select} required>
              {consommables.map((c) => (
                <option key={c.defaultCode} value={c.defaultCode}>
                  {c.nom}
                  {c.configuration ? ` — ${c.configuration}` : ""}
                </option>
              ))}
            </select>
          </label>
          <Champ id="regulier-quantite" name="quantite" libelle="Quantité par commande" inputMode="numeric" defaultValue="2" />
          <Champ id="regulier-intervalle" name="intervalle" libelle="Intervalle (jours)" inputMode="numeric" defaultValue="60" />
          <Champ id="regulier-nombre" name="nombre" libelle="Nombre de commandes" inputMode="numeric" defaultValue="3" />
          <Champ id="regulier-derniere" name="derniere" libelle="Dernière commande il y a (jours)" inputMode="numeric" defaultValue="53" />
          <div><Button type="submit" variante="secondaire">Créer l’historique</Button></div>
        </form>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Lancer les scénarios maintenant</h2>
        <p className="text-small text-muted">Relances de réapprovisionnement dues, puis envoi des emails programmés. Les règles (préférences, fréquence, plages d’envoi) s’appliquent comme d’habitude.</p>
        <form action={lancerScenariosEmails}>
          <Button type="submit">Lancer les scénarios</Button>
        </form>
      </Card>
    </div>
  );
}
