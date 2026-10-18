import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { actionLivraison } from "@/actions/commande";
import { devisCommande } from "@/domaine/commande/tunnel";
import { euros } from "@/lib/montants";
import { Kicker, Retour } from "@/ui";
import { Etapes } from "@/ui/commande/Etapes";
import { RefusTunnel } from "@/ui/commande/RefusTunnel";
import { chargerCommande } from "../charger";

export const metadata: Metadata = { title: "Commande — livraison" };

const classePilule =
  "flex min-h-11 cursor-pointer items-start gap-3 rounded border border-line bg-surface p-4 has-[:checked]:border-action has-[:checked]:bg-pale has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-action";

// Étape « Livraison » (FR-010, FR-011, FR-046) : modes d'Odoo, forfaits, délais, franco,
// frais des équipements volumineux ; express soumis au stock et à l'heure limite.
export default async function Livraison({ searchParams }: { searchParams: Promise<{ ref?: string; erreur?: string }> }) {
  const { ref, erreur } = await searchParams;
  const r = await chargerCommande("/commande/livraison", ref);
  if ("refus" in r && r.refus) return <RefusTunnel message={r.refus.message} lien={r.refus.redirection} />;
  const commande = r.commande!;
  if (commande.etape === "adresses") redirect(`/commande/adresses?ref=${commande.ref}`);
  if (commande.etatAchat === "sans_objet") redirect(`/commande/paiement?ref=${commande.ref}`);
  const devis = await devisCommande(commande);
  const choisi = commande.modeLivraison && devis.modesLivraison.some((m) => m.code === commande.modeLivraison && m.disponible) ? commande.modeLivraison : devis.modeLivraison;
  return (
    <div className="mx-auto flex max-w-page flex-col gap-6 px-4 py-10">
      <Kicker>Commande {commande.ref}</Kicker>
      <h1 className="text-display font-light">Livraison</h1>
      <Etapes courante="livraison" atteinte={commande.etape === "terminee" ? "recapitulatif" : commande.etape} refCommande={commande.ref} />
      <Retour erreur={erreur} />
      <form action={actionLivraison} className="flex max-w-2xl flex-col gap-4">
        <input type="hidden" name="ref" value={commande.ref} />
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 font-semibold text-ink">Mode de livraison</legend>
          {devis.modesLivraison.map((m) => (
            <label key={m.code} className={`${classePilule} ${m.disponible ? "" : "cursor-not-allowed opacity-70"}`}>
              <input type="radio" name="mode" value={m.code} defaultChecked={m.code === choisi} disabled={!m.disponible} className="mt-1 size-5" />
              <span className="flex flex-col">
                <span className="font-semibold text-ink">{m.libelle}</span>
                <span>
                  {m.francoAtteint ? "Offerte" : `${euros(m.forfaitHt)} HT`} · livraison estimée sous {m.delaiJours} jour{m.delaiJours > 1 ? "s" : ""} ouvré{m.delaiJours > 1 ? "s" : ""}
                </span>
                {m.motif ? <span className="text-small text-muted">{m.motif}</span> : null}
              </span>
            </label>
          ))}
        </fieldset>
        {devis.achat?.fraisSpecifiquesHt ? (
          <p className="ec-box--info p-3 text-small">
            Livraison et installation des équipements volumineux : {euros(devis.achat.fraisSpecifiquesHt)} HT, en plus du mode choisi.
          </p>
        ) : null}
        {devis.seuilFrancoHt > 0 && !devis.modesLivraison.some((m) => m.francoAtteint) ? (
          <p className="text-small text-muted">Livraison standard offerte dès {euros(devis.seuilFrancoHt)} HT d’achats.</p>
        ) : null}
        <div>
          <button type="submit" className="ec-btn ec-btn--primary">Continuer</button>
        </div>
      </form>
    </div>
  );
}
