import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { actionPaiement } from "@/actions/commande";
import { avecAssistanceActe, lignesDe, virementDisponible } from "@/domaine/commande/tunnel";
import { Kicker, Retour } from "@/ui";
import { Etapes } from "@/ui/commande/Etapes";
import { RefusTunnel } from "@/ui/commande/RefusTunnel";
import { chargerCommande } from "../charger";

export const metadata: Metadata = { title: "Commande — paiement" };

const classePilule =
  "flex min-h-11 cursor-pointer items-start gap-3 rounded border border-line bg-surface p-4 has-[:checked]:border-action has-[:checked]:bg-pale has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-action";

function Choix({ nom, valeur, titre, texte, coche }: { nom: string; valeur: string; titre: string; texte: string; coche: boolean }) {
  return (
    <label className={classePilule}>
      <input type="radio" name={nom} value={valeur} defaultChecked={coche} required className="mt-1 size-5" />
      <span className="flex flex-col">
        <span className="font-semibold text-ink">{titre}</span>
        <span className="text-small">{texte}</span>
      </span>
    </label>
  );
}

// Étape « Paiement » (FR-015 à FR-019) : carte ou virement pour les achats ; carte ou SEPA
// pour l'abonnement mensuel. Aucune donnée bancaire n'est saisie sur le site.
export default async function Paiement({ searchParams }: { searchParams: Promise<{ ref?: string; erreur?: string }> }) {
  const { ref, erreur } = await searchParams;
  const r = await chargerCommande("/commande/paiement", ref);
  if ("refus" in r && r.refus) return <RefusTunnel message={r.refus.message} lien={r.refus.redirection} />;
  const commande = r.commande!;
  if (commande.etape === "adresses") redirect(`/commande/adresses?ref=${commande.ref}`);
  const lignes = lignesDe(commande);
  const achat = lignes.some((l) => l.formule === "achat");
  const abonnement = lignes.some((l) => l.formule === "mise_a_disposition");
  const virement = achat && !avecAssistanceActe(lignes) && (await virementDisponible());
  // Mode de livraison des achats et date de chaque mise à disposition choisis à l'étape précédente.
  const dates = (commande.datesLivraisonMad ?? {}) as Record<string, string>;
  const dateManquante = lignes.some((l) => l.formule === "mise_a_disposition" && !dates[l.defaultCode]);
  if ((achat && !commande.modeLivraison) || dateManquante) redirect(`/commande/livraison?ref=${commande.ref}`);
  return (
    <div className="mx-auto flex max-w-page flex-col gap-6 px-4 py-10">
      <Kicker>Commande {commande.ref}</Kicker>
      <h1 className="text-display font-light">Paiement</h1>
      <Etapes courante="paiement" atteinte={commande.etape === "terminee" ? "recapitulatif" : commande.etape} refCommande={commande.ref} />
      <Retour erreur={erreur} />
      <form action={actionPaiement} className="flex max-w-2xl flex-col gap-6">
        <input type="hidden" name="ref" value={commande.ref} />
        {achat ? (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 font-semibold text-ink">Paiement de vos achats</legend>
            <Choix nom="achat" valeur="carte" titre="Carte bancaire" texte="Visa, Mastercard ou American Express, avec authentification sécurisée." coche={commande.moyenPaiement !== "virement"} />
            {achat && !virement && avecAssistanceActe(lignes) ? <p className="text-small text-muted">L’assistance à l’acte se règle par carte bancaire.</p> : null}
            {virement ? <Choix nom="achat" valeur="virement" titre="Virement bancaire" texte="Votre commande est réservée jusqu’à l’échéance indiquée ; vous recevez le RIB et la référence à rappeler." coche={commande.moyenPaiement === "virement"} /> : null}
          </fieldset>
        ) : null}
        {abonnement ? (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 font-semibold text-ink">Échéances de la mise à disposition</legend>
            <Choix nom="abonnement" valeur="carte" titre="Carte bancaire" texte="Le premier mois est payé à la commande, puis chaque mois." coche={commande.moyenAbonnement !== "sepa"} />
            <Choix nom="abonnement" valeur="sepa" titre="Prélèvement SEPA" texte="Le premier mois est payé à la commande, puis prélevé chaque mois." coche={commande.moyenAbonnement === "sepa"} />
          </fieldset>
        ) : null}
        <div>
          <button type="submit" className="ec-btn ec-btn--primary">Continuer</button>
        </div>
      </form>
    </div>
  );
}
