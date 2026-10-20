import type { Metadata } from "next";
import { dbSite } from "@/lib/db/site";
import { Button, Card, Kicker, Retour } from "@/ui";
import { ChampAdmin, classeChamp } from "@/ui/admin";
import { enregistrerCoordonnees } from "../actions";

export const metadata: Metadata = { title: "Coordonnées et textes" };

function listeJson(valeur: string): string[] {
  try {
    const l = JSON.parse(valeur || "[]") as unknown;
    return Array.isArray(l) ? l.map(String) : [];
  } catch {
    return [];
  }
}

export default async function Coordonnees({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const r = await searchParams;
  const lignes = await dbSite().parametre.findMany({ where: { OR: [{ cle: { startsWith: "contact." } }, { cle: { startsWith: "accueil." } }, { cle: { startsWith: "virement." } }, { cle: "commande.heure_limite_express" }, { cle: { startsWith: "livraison." } }, { cle: { startsWith: "location." } }, { cle: { startsWith: "fidelite.rappel_" } }, { cle: { startsWith: "cloud." } }] } });
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
          <h2 className="text-h3 font-semibold sm:col-span-2">Commandes et virement</h2>
          <p className="text-muted sm:col-span-2">Coordonnées bancaires indiquées aux clients qui paient par virement. Le virement ne s’affiche pas tant que l’IBAN est vide.</p>
          <ChampAdmin id="titulaire" libelle="Titulaire du compte">
            <input id="titulaire" name="titulaire" defaultValue={v("virement.titulaire")} className={classeChamp} />
          </ChampAdmin>
          <ChampAdmin id="bic" libelle="BIC">
            <input id="bic" name="bic" defaultValue={v("virement.bic")} className={classeChamp} />
          </ChampAdmin>
          <div className="sm:col-span-2">
            <ChampAdmin id="iban" libelle="IBAN">
              <input id="iban" name="iban" defaultValue={v("virement.iban")} className={classeChamp} />
            </ChampAdmin>
          </div>
          <ChampAdmin id="rappelJours" libelle="Rappel avant l’échéance (jours)">
            <input id="rappelJours" name="rappelJours" type="number" min={1} max={15} defaultValue={v("virement.rappel_jours") || "2"} className={classeChamp} />
          </ChampAdmin>
          <ChampAdmin id="heureExpress" libelle="Heure limite de la livraison express" aide="Après cette heure, l’express part le jour ouvré suivant.">
            <input id="heureExpress" name="heureExpress" type="time" defaultValue={v("commande.heure_limite_express") || "14:00"} className={classeChamp} />
          </ChampAdmin>
        </Card>
        <Card className="grid gap-3 sm:grid-cols-2">
          <h2 className="text-h3 font-semibold sm:col-span-2">Livraison et mise à disposition</h2>
          <p className="text-muted sm:col-span-2">
            L’heure limite ci-dessus vaut aussi pour la livraison au lendemain d’une mise à disposition. Les tarifs, délais de retour et règles d’impayé se
            règlent dans Odoo.
          </p>
          <div className="sm:col-span-2">
            <ChampAdmin id="joursNonLivres" libelle="Jours non livrés (un par ligne, AAAA-MM-JJ)" aide="En plus des week-ends et des jours fériés, calculés automatiquement.">
              <textarea id="joursNonLivres" name="joursNonLivres" rows={3} defaultValue={listeJson(v("livraison.jours_non_livres")).join("\n")} className={`${classeChamp} py-2`} />
            </ChampAdmin>
          </div>
          <ChampAdmin id="zones" libelle="Zones sans livraison au lendemain (débuts de codes postaux)" aide="Séparés par des virgules ; 20 = Corse.">
            <input id="zones" name="zones" defaultValue={listeJson(v("livraison.zones_sans_lendemain")).join(", ")} className={classeChamp} />
          </ChampAdmin>
          <ChampAdmin id="delaiZones" libelle="Délai supplémentaire de ces zones (jours ouvrés)">
            <input id="delaiZones" name="delaiZones" type="number" min={0} max={10} defaultValue={v("livraison.delai_zones_jours") || "2"} className={classeChamp} />
          </ChampAdmin>
          <ChampAdmin id="rappelEcheance" libelle="Rappel avant une échéance de location (jours)">
            <input id="rappelEcheance" name="rappelEcheance" type="number" min={1} max={15} defaultValue={v("location.rappel_echeance_jours") || "3"} className={classeChamp} />
          </ChampAdmin>
          <ChampAdmin id="rappelRetour" libelle="Rappel de retour en retard, tous les (jours)">
            <input id="rappelRetour" name="rappelRetour" type="number" min={1} max={15} defaultValue={v("location.rappel_retour_jours") || "2"} className={classeChamp} />
          </ChampAdmin>
          <div className="sm:col-span-2">
            <ChampAdmin id="conditionsLocation" libelle="Conditions de location (texte accepté au récapitulatif)" aide="Texte provisoire : à faire valider par votre conseil juridique.">
              <textarea id="conditionsLocation" name="conditionsLocation" rows={4} defaultValue={v("location.conditions")} className={`${classeChamp} py-2`} />
            </ChampAdmin>
          </div>
        </Card>
        <Card className="grid gap-3 sm:grid-cols-2">
          <h2 className="text-h3 font-semibold sm:col-span-2">Rappels et accès Cloud</h2>
          <p className="text-muted sm:col-span-2">
            Délais des rappels envoyés aux clients et des accès aux logiciels Cloud. Les règles du programme de fidélité, les durées incluses et les prix se
            règlent dans Odoo.
          </p>
          <ChampAdmin id="rappelDroits" libelle="Rappel avant la fin des droits d’assistance (jours)">
            <input id="rappelDroits" name="rappelDroits" type="number" min={1} max={60} defaultValue={v("fidelite.rappel_droits_jours") || "7"} className={classeChamp} />
          </ChampAdmin>
          <ChampAdmin id="rappelExpiration" libelle="Rappel avant l’expiration de bons d’achat (jours)">
            <input id="rappelExpiration" name="rappelExpiration" type="number" min={1} max={120} defaultValue={v("fidelite.rappel_expiration_jours") || "30"} className={classeChamp} />
          </ChampAdmin>
          <ChampAdmin id="delaiGrace" libelle="Délai de grâce après la fin d’un accès Cloud (jours)" aide="Le médecin peut seulement consulter et récupérer ses données.">
            <input id="delaiGrace" name="delaiGrace" type="number" min={0} max={180} defaultValue={v("cloud.delai_grace_jours") || "30"} className={classeChamp} />
          </ChampAdmin>
          <ChampAdmin id="rappelPeriode" libelle="Rappel avant la fin d’une période incluse (jours)" aide="Avec la proposition de poursuivre par un abonnement.">
            <input id="rappelPeriode" name="rappelPeriode" type="number" min={1} max={120} defaultValue={v("cloud.rappel_periode_jours") || "30"} className={classeChamp} />
          </ChampAdmin>
          <ChampAdmin id="rappelFinCloud" libelle="Rappel avant la fin d’un accès Cloud (jours)">
            <input id="rappelFinCloud" name="rappelFinCloud" type="number" min={1} max={60} defaultValue={v("cloud.rappel_fin_jours") || "7"} className={classeChamp} />
          </ChampAdmin>
          <ChampAdmin id="urlPlateforme" libelle="Adresse de la plateforme Cloud" aide="Adresse https:// de la plateforme, ou chemin du site (page simulée en démonstration).">
            <input id="urlPlateforme" name="urlPlateforme" defaultValue={v("cloud.url_plateforme")} className={classeChamp} />
          </ChampAdmin>
          <div className="sm:col-span-2">
            <ChampAdmin id="aideConnexion" libelle="Aide à la première connexion (Mes logiciels Cloud)">
              <textarea id="aideConnexion" name="aideConnexion" rows={3} defaultValue={v("cloud.aide_premiere_connexion")} className={`${classeChamp} py-2`} />
            </ChampAdmin>
          </div>
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
