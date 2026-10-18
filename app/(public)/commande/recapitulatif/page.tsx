import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adressesDe, devisCommande, lignesDe } from "@/domaine/commande/tunnel";
import { euros } from "@/lib/montants";
import { modeDuSite } from "@/lib/config";
import { Card, Kicker, Retour } from "@/ui";
import { Etapes } from "@/ui/commande/Etapes";
import { FormulairePayer } from "@/ui/commande/FormulairePayer";
import { RefusTunnel } from "@/ui/commande/RefusTunnel";
import { TotauxAbonnement, TotauxAchat } from "@/ui/commande/Totaux";
import { chargerCommande } from "../charger";

export const metadata: Metadata = { title: "Commande — récapitulatif" };

const MOYENS = { carte: "Carte bancaire", sepa: "Prélèvement SEPA", virement: "Virement bancaire" } as const;

function Adresse({ titre, a }: { titre: string; a?: { ligne1: string; ligne2?: string; codePostal: string; ville: string } }) {
  if (!a) return null;
  return (
    <div>
      <p className="font-semibold text-ink">{titre}</p>
      <p>
        {a.ligne1}
        {a.ligne2 ? <><br />{a.ligne2}</> : null}
        <br />
        {a.codePostal} {a.ville}
      </p>
    </div>
  );
}

// Récapitulatif (FR-012, FR-014) : articles (cadeau de bienvenue à 0 €), adresses, livraison,
// paiement et montants ; CGV à accepter avant de payer.
export default async function Recapitulatif({ searchParams }: { searchParams: Promise<{ ref?: string; alerte?: string }> }) {
  const { ref, alerte } = await searchParams;
  const r = await chargerCommande("/commande/recapitulatif", ref);
  if ("refus" in r && r.refus) return <RefusTunnel message={r.refus.message} lien={r.refus.redirection} />;
  const commande = r.commande!;
  const lignes = lignesDe(commande);
  const achat = lignes.some((l) => l.formule === "achat");
  if (commande.etape === "adresses") redirect(`/commande/adresses?ref=${commande.ref}`);
  if (achat && !commande.modeLivraison) redirect(`/commande/livraison?ref=${commande.ref}`);
  if (!commande.moyenPaiement && !commande.moyenAbonnement) redirect(`/commande/paiement?ref=${commande.ref}`);
  const devis = await devisCommande(commande);
  const adresses = adressesDe(commande);
  const mode = devis.modesLivraison.find((m) => m.code === devis.modeLivraison);
  const aPayerAchat = ["a_payer", "refusee", "paiement_en_cours"].includes(commande.etatAchat);
  const libelle = aPayerAchat
    ? commande.moyenPaiement === "virement"
      ? "Valider la commande"
      : `Payer ${devis.achat ? euros(devis.achat.totalTtc) : ""} TTC`
    : "Autoriser le prélèvement mensuel";

  return (
    <div className="mx-auto flex max-w-page flex-col gap-6 px-4 py-10">
      <Kicker>Commande {commande.ref}</Kicker>
      <h1 className="text-display font-light">Récapitulatif</h1>
      <Etapes courante="recapitulatif" atteinte="recapitulatif" refCommande={commande.ref} sansLivraison={!achat} />
      <Retour erreur={alerte} />
      {commande.motifRefus ? <p role="alert" className="ec-box--promo p-4 font-medium">{commande.motifRefus} Vous pouvez réessayer ou changer de moyen de paiement.</p> : null}
      {modeDuSite() === "demo" ? <p className="text-small text-muted">Version de démonstration : le paiement est simulé, rien n’est débité.</p> : null}

      <section aria-labelledby="titre-articles" className="flex flex-col gap-3">
        <h2 id="titre-articles" className="text-h3 font-semibold">Articles</h2>
        <ul className="flex list-none flex-col gap-2 p-0">
          {devis.lignes.map((l, i) => (
            <li key={i} className="flex flex-wrap justify-between gap-x-4 border-b border-line py-2">
              <span>
                {l.quantite} × {l.libelle}
                {l.formule === "mise_a_disposition" ? " — mise à disposition mensuelle" : ""}
              </span>
              <span className="font-semibold text-ink">{l.offerte ? "Offert (0,00 €)" : `${euros(l.totalHt)} HT`}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <Adresse titre="Livraison" a={adresses.livraison} />
          <Adresse titre="Facturation" a={adresses.facturation} />
          {mode ? (
            <p>
              <span className="font-semibold text-ink">Mode : </span>
              {mode.libelle}, sous {mode.delaiJours} jour{mode.delaiJours > 1 ? "s" : ""} ouvré{mode.delaiJours > 1 ? "s" : ""}
            </p>
          ) : null}
          <p>
            <span className="font-semibold text-ink">Paiement : </span>
            {[commande.moyenPaiement ? `${MOYENS[commande.moyenPaiement]} (achats)` : null, commande.moyenAbonnement ? `${MOYENS[commande.moyenAbonnement]} (mensualités)` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </Card>
        <div className="flex flex-col gap-4">
          {devis.achat ? (
            <Card>
              <h2 className="mb-2 text-h3 font-semibold">Paiement unique</h2>
              <TotauxAchat achat={devis.achat} regleCumul={devis.regleCumul} />
            </Card>
          ) : null}
          {devis.abonnement ? (
            <Card>
              <h2 className="mb-2 text-h3 font-semibold">Abonnement mensuel</h2>
              <TotauxAbonnement abonnement={devis.abonnement} />
              <p className="mt-2 text-small">Prélevé chaque mois à la date anniversaire de votre commande.</p>
            </Card>
          ) : null}
        </div>
      </div>
      <FormulairePayer refCommande={commande.ref} libelle={libelle} />
    </div>
  );
}
