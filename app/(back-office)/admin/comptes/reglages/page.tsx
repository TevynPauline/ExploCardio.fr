import type { Metadata } from "next";
import Link from "next/link";
import { dbSite } from "@/lib/db/site";
import { exigerAdministrateur } from "@/lib/roles";
import { Button, Card, Kicker, Retour } from "@/ui";
import { CaseAdmin, ChampAdmin, classeChamp } from "@/ui/admin";
import { enregistrerReglages } from "../actions";

export const metadata: Metadata = { title: "Réglages des comptes" };

// Réglages (FR-013, FR-024, D3) : administrateur uniquement (D5).
export default async function Reglages({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await exigerAdministrateur();
  const r = await searchParams;
  const lignes = await dbSite().parametre.findMany({ where: { cle: { in: ["comptes.validation_auto", "bienvenue.active", "comptes.specialites"] } } });
  const v = (cle: string) => lignes.find((l) => l.cle === cle)?.valeur ?? "";
  let specialites: string[] = [];
  try {
    specialites = JSON.parse(v("comptes.specialites") || "[]") as string[];
  } catch {
    specialites = [];
  }
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Kicker>Comptes</Kicker>
      <h1 className="text-h2 font-light">Réglages des comptes</h1>
      <Retour {...r} />
      <form action={enregistrerReglages} className="flex flex-col gap-6">
        <Card className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold">Validation</h2>
          <CaseAdmin name="validationAuto" libelle="Valider automatiquement un compte dès la confirmation de son email (numéro au bon format)" coche={v("comptes.validation_auto") === "true"} />
          <p className="text-small text-muted">Le contrôle de format ne prouve pas que le numéro appartient au demandeur.</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold">Offre de bienvenue</h2>
          <CaseAdmin name="bienvenueActive" libelle="Offre de bienvenue active" coche={v("bienvenue.active") !== "false"} />
          <p className="text-small text-muted">
            Le texte de l’offre se modifie dans <Link href="/admin/contenus/coordonnees">Contenus › Coordonnées et textes</Link>.
            L’article offert et son stock sont gérés dans Odoo. Les professionnels déjà bénéficiaires gardent leur droit.
          </p>
        </Card>
        <Card>
          <ChampAdmin id="specialites" libelle="Spécialités proposées (une par ligne)">
            <textarea id="specialites" name="specialites" rows={7} defaultValue={specialites.join("\n")} className={`${classeChamp} py-2`} />
          </ChampAdmin>
        </Card>
        <div><Button type="submit">Enregistrer</Button></div>
      </form>
    </div>
  );
}
