import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { compteConnecte } from "@/domaine/comptes/session";
import { cheminsDesFiches, lireCatalogue } from "@/domaine/catalogue/lecture";
import type { Bareme } from "@/domaine/commande/prix-ligne";
import { COOKIE_PANIER, panierPour } from "@/domaine/catalogue/panier";
import { panierDetaille } from "@/domaine/commande/devis";
import { codesFinancables } from "@/domaine/financement/demande";
import { kitsDejaPossedes, kitsObligatoires } from "@/domaine/location/kit";
import { cagnotteDuCompte, gainsDuPanier } from "@/domaine/fidelite/gains";
import { bonsAuPanierActifs } from "@/domaine/commande/devis";
import { dbSite } from "@/lib/db/site";
import { BonsAchat } from "@/ui/fidelite/BonsAchat";
import { GainsFidelite } from "@/ui/fidelite/Gains";
import { lireNoms } from "@/domaine/catalogue/lecture";
import { modeDuSite } from "@/lib/config";
import { Card, Kicker } from "@/ui";
import { CodePromo } from "@/ui/commande/CodePromo";
import { LignePanier } from "@/ui/commande/LignePanier";
import { TotauxEnDirect } from "@/ui/commande/TotauxEnDirect";
import { TotauxAbonnement, TotauxAchat } from "@/ui/commande/Totaux";
import { FilAriane } from "@/ui/FilAriane";
import { MentionMetropole } from "@/ui/commande/MentionMetropole";

export const metadata: Metadata = { title: "Panier" };

// Panier (F04, US1) : deux blocs, « Paiement unique » et « Abonnement mensuel », montants du
// devis d'Odoo, quantités modifiables, code promo, changements signalés.
export default async function Panier({ searchParams }: { searchParams: Promise<{ ajout?: string }> }) {
  const { ajout } = await searchParams;
  // F10 : retour de « Commander de nouveau » (relance de réapprovisionnement).
  const avis =
    ajout === "recommande" ? "L’article de votre relance a été ajouté à votre panier. Vérifiez la quantité avant de commander." : ajout === "impossible" ? "Cet article ne peut plus être commandé en ligne : contactez-nous pour le remplacer." : null;
  const compte = await compteConnecte();
  const jeton = (await cookies()).get(COOKIE_PANIER)?.value;
  const panier = await panierPour(compte ? { compteId: compte.id } : { jeton }, false);
  const detail = panier ? await panierDetaille(panier.id, compte?.id ?? null) : null;

  if (!detail || !detail.lignes.length) {
    return (
      <div className="mx-auto flex max-w-page flex-col gap-4 px-4 py-10">
        <FilAriane etapes={[{ libelle: "Panier" }]} />
        <Kicker>Panier</Kicker>
        <h1 className="text-display font-light">Votre panier est vide</h1>
        {avis ? <p role="status" className="ec-box--info p-4">{avis}</p> : null}
        <p><Link href="/catalogue" className="ec-btn ec-btn--primary">Découvrir le catalogue</Link></p>
      </div>
    );
  }

  const [chemins, catalogue] = await Promise.all([cheminsDesFiches(), lireCatalogue()]);
  const variantes = new Map(catalogue.entrees.flatMap((e) => e.article.variantes.map((v) => [v.defaultCode, v] as const)));
  const achats = detail.lignes.filter((l) => l.formule === "achat");
  const locations = detail.lignes.filter((l) => l.formule === "mise_a_disposition");
  const financables = await codesFinancables(achats.map((l) => l.defaultCode));
  const [obligatoires, possedes] = await Promise.all([kitsObligatoires(detail.panierId, compte?.id ?? null), kitsDejaPossedes(detail.panierId, compte?.id ?? null)]);
  const noms = possedes.length ? await lireNoms() : {};
  // F06 : gains de la commande et bons d'achat utilisables (compte validé seulement).
  const [gains, cagnotte, bonsActifs, panierSite] = await Promise.all([
    achats.length ? gainsDuPanier(detail.panierId, compte?.id ?? null) : null,
    compte?.statut === "valide" ? cagnotteDuCompte(compte.id) : null,
    bonsAuPanierActifs(),
    dbSite().panier.findUnique({ where: { id: detail.panierId } }),
  ]);
  const devis = detail.devis;
  // F16 (D6) : barème de chaque ligne, pour afficher son prix dès que la quantité change.
  const bareme = (l: (typeof detail.lignes)[number]): Bareme | null => {
    if (l.prixUnitaireHt === null || l.totalHt === null) return null;
    const brut = l.prixUnitaireHt * l.quantite;
    const remisePourcent = brut > 0 ? ((l.remiseHt ?? 0) / brut) * 100 : 0;
    const v = variantes.get(l.defaultCode);
    if (l.formule !== "achat" || !v) return { prixHt: l.prixUnitaireHt, paliers: [], prixClientHt: null, remisePourcent };
    const palierAtteint = v.paliers.some((pa) => l.quantite >= pa.quantiteMin);
    return { prixHt: v.prixHt, paliers: v.paliers, prixClientHt: palierAtteint ? null : l.prixUnitaireHt, remisePourcent };
  };
  const ligne = (l: (typeof detail.lignes)[number]) => (
    <LignePanier
      key={l.id}
      id={l.id}
      libelle={l.libelle}
      defaultCode={l.defaultCode}
      chemin={chemins.get(l.defaultCode) ?? null}
      formule={l.formule}
      quantite={l.quantite}
      prixUnitaireHt={l.prixUnitaireHt}
      totalHt={l.totalHt}
      remiseHt={l.remiseHt}
      promotion={l.promotion}
      prixAChange={l.prixAChange}
      promotionTerminee={l.promotionTerminee}
      ancienPrixHt={l.ancienPrixHt}
      delaiJours={l.delaiJours}
      indisponible={l.indisponible}
      obligatoire={l.formule === "achat" && obligatoires.has(l.defaultCode)}
      bareme={bareme(l)}
    />
  );

  return (
    <div className="mx-auto flex max-w-page flex-col gap-8 px-4 py-10">
      <FilAriane etapes={[{ libelle: "Panier" }]} />
      <div className="flex flex-col gap-2">
        <Kicker>Panier</Kicker>
        <h1 className="text-display font-light">Votre panier</h1>
        {modeDuSite() === "demo" ? <p className="text-small text-muted">Version de démonstration : aucun paiement réel.</p> : null}
      </div>
      {avis ? <p role="status" className="ec-box--info p-4">{avis}</p> : null}
      {detail.indisponible ? (
        <p role="status" className="ec-box--info p-4">
          Les prix et la disponibilité sont momentanément indisponibles. Votre panier est conservé : réessayez dans quelques instants.
        </p>
      ) : null}

      {achats.length ? (
        <section aria-labelledby="titre-paiement-unique" className="flex flex-col gap-4">
          <h2 id="titre-paiement-unique" className="text-h2 font-light">Paiement unique</h2>
          <ul className="flex list-none flex-col gap-3 p-0">{achats.map(ligne)}</ul>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <CodePromo code={detail.codePromo} statut={devis?.codePromo ? { applique: devis.codePromo.applique, motif: devis.codePromo.motif } : null} />
              {bonsActifs && cagnotte && panierSite ? (
                <BonsAchat
                  soldeHt={cagnotte.lots.reduce((s, l) => s + l.resteHt, 0)}
                  prochaineExpiration={cagnotte.prochaineExpiration ? { date: cagnotte.prochaineExpiration.date.toISOString(), montantHt: cagnotte.prochaineExpiration.montantHt } : null}
                  utilises={panierSite.utiliserBons}
                  montantDemandeHt={panierSite.bonsDemandesHt}
                  appliquesHt={devis?.achat?.bonsHt ?? 0}
                />
              ) : null}
              {gains ? <GainsFidelite gains={gains} /> : null}
            </div>
            {devis?.achat ? (
              <Card>
                <TotauxEnDirect>
                <TotauxAchat achat={devis.achat} regleCumul={devis.regleCumul} />
                {devis.achat.fraisPortHt > 0 && devis.seuilFrancoHt > 0 ? (
                  <p className="mt-2 text-small text-muted">Livraison standard offerte dès {(devis.seuilFrancoHt / 100).toLocaleString("fr-FR")} € HT d’achats.</p>
                ) : null}
                </TotauxEnDirect>
              </Card>
            ) : null}
          </div>
        </section>
      ) : null}

      {locations.length ? (
        <section aria-labelledby="titre-abonnement" className="flex flex-col gap-4">
          <h2 id="titre-abonnement" className="text-h2 font-light">Abonnement mensuel</h2>
          <ul className="flex list-none flex-col gap-3 p-0">{locations.map(ligne)}</ul>
          {possedes.map((k) => (
            <p key={k} role="status" className="ec-box--info p-3 text-small">
              Vous possédez déjà le kit d’accessoires « {noms[k]?.nom ?? k} » : il n’est pas ajouté à votre commande. Vous pouvez en racheter un depuis sa fiche si besoin.
            </p>
          ))}
          {devis?.abonnement ? (
            <Card className="lg:ml-auto lg:w-1/2">
              <TotauxEnDirect>
                <TotauxAbonnement abonnement={devis.abonnement} />
              </TotauxEnDirect>
            </Card>
          ) : null}
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {detail.bloquant ? (
          <p className="w-full font-medium text-ink">
            {detail.indisponible ? "La commande sera possible dès le retour du service." : "Retirez les articles indisponibles pour commander."}
          </p>
        ) : null}
        {detail.bloquant ? (
          <span className="ec-btn ec-btn--primary opacity-60" aria-disabled="true">Commander</span>
        ) : (
          <Link href="/commande/adresses" className="ec-btn ec-btn--primary">Commander</Link>
        )}
        {financables.size ? <Link href="/financement/demande?depuis=panier" className="ec-btn ec-btn--secondary">Demander mon financement</Link> : null}
        <Link href="/catalogue" className="inline-flex min-h-11 items-center">Continuer mes achats</Link>
      </div>
      <MentionMetropole />
    </div>
  );
}
