import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { pannesDemo } from "@/connecteurs/demonstration";
import { ETIQUETTES, invaliderDepuisAction } from "@/lib/cache";
import { CONNECTEURS, type NomConnecteur } from "@/lib/config";
import { exigerAdministrateur } from "@/lib/roles";
import { Button, Card, Kicker, Retour } from "@/ui";

export const metadata: Metadata = { title: "Pannes simulées" };

const NOMS: Record<NomConnecteur, string> = {
  odoo: "Odoo (catalogue, commandes, factures…)",
  stripe: "Stripe (paiements)",
  pca: "Plateforme Cloud PCA (accès logiciels)",
  emailing: "Emailing (emails et notifications)",
};

async function basculer(donnees: FormData) {
  "use server";
  const { user } = await exigerAdministrateur();
  const connecteur = String(donnees.get("connecteur")) as NomConnecteur;
  if (!CONNECTEURS.includes(connecteur)) redirect("/admin/demonstration/pannes");
  const active = donnees.get("active") === "oui";
  await pannesDemo.definir({ id: user.id, libelle: `${user.name} (${user.email})` }, connecteur, active);
  // Les données mises en cache ne doivent pas masquer la panne (ni survivre à son retour) : F03, US5-5.
  if (connecteur === "odoo") invaliderDepuisAction(ETIQUETTES.catalogue, ETIQUETTES.prix, ETIQUETTES.stock);
  redirect(`/admin/demonstration/pannes?ok=${encodeURIComponent(`Panne ${active ? "activée" : "désactivée"} : ${NOMS[connecteur]}.`)}`);
}

// Pannes simulées (T081, FR-025) : un connecteur en panne répond « service indisponible »,
// pour montrer et tester les messages d'erreur du site.
export default async function Pannes({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const etats = await pannesDemo.lire();
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Kicker>Démonstration</Kicker>
      <h1 className="text-h2 font-light">Pannes simulées</h1>
      <Retour ok={ok} />
      <ul className="flex flex-col gap-3">
        {CONNECTEURS.map((c) => (
          <li key={c}>
            <Card className="flex flex-wrap items-center justify-between gap-3">
              <span>
                <span className="block font-medium">{NOMS[c]}</span>
                <span className="text-small text-muted">{etats[c] ? "En panne (simulée)" : "Fonctionne"}</span>
              </span>
              <form action={basculer}>
                <input type="hidden" name="connecteur" value={c} />
                <input type="hidden" name="active" value={etats[c] ? "non" : "oui"} />
                <Button type="submit" variante={etats[c] ? "principal" : "secondaire"}>
                  {etats[c] ? "Rétablir" : "Simuler une panne"}
                </Button>
              </form>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
