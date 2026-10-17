import type { Metadata } from "next";
import Link from "next/link";
import { lireParametre } from "@/lib/parametres";
import { sessionCourante } from "@/lib/roles";
import { Card, Kicker, Retour } from "@/ui";
import { ChampAdmin, classeChamp } from "@/ui/admin";
import { actionServices } from "../actions";

export const metadata: Metadata = { title: "Pages services" };

const TARIFS = [
  { cle: "services.hebergement.tarif", libelle: "Hébergement des données de santé" },
  { cle: "services.assistance.tarif", libelle: "Assistance et service" },
  { cle: "services.financement.tarif", libelle: "Financement" },
  { cle: "services.installation.tarif", libelle: "Installation et formation" },
] as const;

// Pages services (F03, US8, FR-034, FR-035) : badge de l'hébergement, tarifs HT standard,
// mention sous les mensualités de financement. Chaque changement est historisé.
export default async function Services({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const retour = await searchParams;
  const [session, badge, mention, ...tarifs] = await Promise.all([
    sessionCourante(),
    lireParametre("accueil.badge_hebergement"),
    lireParametre("financement.mention"),
    ...TARIFS.map((t) => lireParametre(t.cle)),
  ]);
  const admin = (session?.user as { role?: string } | undefined)?.role === "admin";
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Catalogue</Kicker>
      <h1 className="text-h2 font-light">Pages services et financement</h1>
      <p><Link href="/admin/catalogue" className="inline-flex min-h-11 items-center">Retour à la liste</Link></p>
      <Retour {...retour} />
      <Card>
        <form action={actionServices} className="flex flex-col gap-4">
          <fieldset disabled={!admin} className="flex flex-col gap-4">
            <ChampAdmin id="badge" libelle="Badge de la page « Hébergement des données de santé »" aide="Laissez vide pour le retirer : la page et l'accueil ne l'affichent plus.">
              <input id="badge" name="accueil.badge_hebergement" defaultValue={badge ?? ""} aria-describedby="badge-aide" className={classeChamp} />
            </ChampAdmin>
            {TARIFS.map((t, i) => (
              <ChampAdmin key={t.cle} id={t.cle} libelle={`Tarif HT standard : ${t.libelle}`} aide="En euros HT, par exemple 490,00. Laissez vide si le tarif n'est pas standard.">
                <input id={t.cle} name={t.cle} inputMode="decimal" defaultValue={tarifs[i] ?? ""} aria-describedby={`${t.cle}-aide`} className={classeChamp} />
              </ChampAdmin>
            ))}
            <ChampAdmin id="mention" libelle="Mention sous les mensualités de financement" aide="Formulation à faire valider par votre conseil juridique.">
              <textarea id="mention" name="financement.mention" rows={2} defaultValue={mention ?? ""} aria-describedby="mention-aide" className={`${classeChamp} py-2`} />
            </ChampAdmin>
          </fieldset>
          {admin ? <div><button type="submit" className="ec-btn ec-btn--primary">Enregistrer</button></div> : <p className="text-small text-muted">Lecture seule.</p>}
        </form>
      </Card>
    </div>
  );
}
