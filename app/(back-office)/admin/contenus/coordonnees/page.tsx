import type { Metadata } from "next";
import { dbSite } from "@/lib/db/site";
import { Button, Card, Kicker, Retour } from "@/ui";
import { ChampAdmin, classeChamp } from "@/ui/admin";
import { enregistrerCoordonnees } from "../actions";

export const metadata: Metadata = { title: "Coordonnées et textes" };

export default async function Coordonnees({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const r = await searchParams;
  const lignes = await dbSite().parametre.findMany({ where: { OR: [{ cle: { startsWith: "contact." } }, { cle: { startsWith: "accueil." } }] } });
  const v = (cle: string) => lignes.find((l) => l.cle === cle)?.valeur ?? "";
  let motifs: string[] = [];
  try {
    motifs = JSON.parse(v("contact.motifs") || "[]") as string[];
  } catch {
    motifs = [];
  }
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Contenus</Kicker>
      <h1 className="text-h2 font-light">Coordonnées et textes</h1>
      <p className="text-muted">Un champ vide masque la ligne correspondante partout sur le site.</p>
      <Retour {...r} />
      <form action={enregistrerCoordonnees} className="flex flex-col gap-6">
        <Card className="grid gap-3 sm:grid-cols-2">
          <h2 className="text-h3 font-semibold sm:col-span-2">Coordonnées affichées</h2>
          <ChampAdmin id="email" libelle="Email">
            <input id="email" name="email" type="email" defaultValue={v("contact.email")} className={classeChamp} />
          </ChampAdmin>
          <ChampAdmin id="telephone" libelle="Téléphone">
            <input id="telephone" name="telephone" type="tel" defaultValue={v("contact.telephone")} className={classeChamp} />
          </ChampAdmin>
          <div className="sm:col-span-2">
            <ChampAdmin id="adresse" libelle="Adresse">
              <input id="adresse" name="adresse" defaultValue={v("contact.adresse")} className={classeChamp} />
            </ChampAdmin>
          </div>
        </Card>
        <Card className="grid gap-3">
          <h2 className="text-h3 font-semibold">Formulaire de contact</h2>
          <ChampAdmin id="destinataire" libelle="Adresse qui reçoit les messages" aide="En démonstration, les messages arrivent dans la boîte de démonstration.">
            <input id="destinataire" name="destinataire" type="email" defaultValue={v("contact.destinataire_messages")} className={classeChamp} />
          </ChampAdmin>
          <ChampAdmin id="motifs" libelle="Motifs (un par ligne)" aide="Le motif « Assistance » affiche les boutons WhatsApp au-dessus du formulaire.">
            <textarea id="motifs" name="motifs" rows={5} defaultValue={motifs.join("\n")} className={`${classeChamp} py-2`} />
          </ChampAdmin>
        </Card>
        <Card className="grid gap-3 sm:grid-cols-2">
          <h2 className="text-h3 font-semibold sm:col-span-2">Textes de l’accueil</h2>
          <div className="sm:col-span-2">
            <ChampAdmin id="offreBienvenue" libelle="Offre de bienvenue">
              <textarea id="offreBienvenue" name="offreBienvenue" rows={2} defaultValue={v("accueil.offre_bienvenue")} className={`${classeChamp} py-2`} />
            </ChampAdmin>
          </div>
          <div className="sm:col-span-2">
            <ChampAdmin id="engagements" libelle="Engagements de réactivité" aide="Rien n'est affiché tant que ce champ est vide.">
              <textarea id="engagements" name="engagements" rows={2} defaultValue={v("accueil.engagements_reactivite")} className={`${classeChamp} py-2`} />
            </ChampAdmin>
          </div>
          <ChampAdmin id="badgeHebergement" libelle="Badge « Hébergement des données de santé »" aide="Videz le champ pour retirer le badge.">
            <input id="badgeHebergement" name="badgeHebergement" defaultValue={v("accueil.badge_hebergement")} className={classeChamp} />
          </ChampAdmin>
          <ChampAdmin id="badgeLogicielCloud" libelle="Badge « Logiciel Cloud »" aide="Videz le champ pour retirer le badge.">
            <input id="badgeLogicielCloud" name="badgeLogicielCloud" defaultValue={v("accueil.badge_logiciel_cloud")} className={classeChamp} />
          </ChampAdmin>
        </Card>
        <div><Button type="submit">Enregistrer</Button></div>
      </form>
    </div>
  );
}
