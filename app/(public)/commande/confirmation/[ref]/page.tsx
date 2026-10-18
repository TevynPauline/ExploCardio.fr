import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Devis } from "@/connecteurs/odoo/interfaces";
import { compteCourant } from "@/domaine/comptes/session";
import { ribDuSite } from "@/domaine/commande/notifications";
import { commandeDuCompte } from "@/domaine/commande/tunnel";
import { euros } from "@/lib/montants";
import { Card, Kicker } from "@/ui";

export const metadata: Metadata = { title: "Commande confirmée" };

// Confirmation (FR-013, FR-017) : référence, et pour un virement le RIB, le montant et la date.
export default async function Confirmation({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const { compte } = await compteCourant(`/commande/confirmation/${ref}`);
  const c = await commandeDuCompte(compte.id, ref);
  if (!c) notFound();
  const devis = c.devis as Devis | null;
  const virement = c.etatAchat === "en_attente_virement";
  const rib = virement ? await ribDuSite() : null;
  return (
    <div className="mx-auto flex max-w-page flex-col gap-6 px-4 py-10">
      <Kicker>Commande {c.odooCommandeRef ?? c.ref}</Kicker>
      <h1 className="text-display font-light">{virement ? "Commande enregistrée" : "Merci, votre commande est confirmée"}</h1>
      <p role="status" className="ec-box--info p-4">
        {virement ? "Votre commande est réservée en attendant votre virement." : "Un email récapitulatif vient de vous être envoyé."}
        {c.etatAbonnement === "payee" ? " Votre mise à disposition est souscrite." : ""}
      </p>
      {virement && rib ? (
        <Card className="flex max-w-2xl flex-col gap-2">
          <h2 className="text-h3 font-semibold">Coordonnées du virement</h2>
          <p>Montant : <strong>{euros(devis?.achat?.totalTtc ?? 0)} TTC</strong></p>
          <p>Référence à rappeler : <strong>{c.odooCommandeRef ?? c.ref}</strong></p>
          {c.echeanceVirement ? <p>À régler avant le {c.echeanceVirement.toLocaleDateString("fr-FR")}.</p> : null}
          <p>Titulaire : {rib.titulaire}</p>
          <p>IBAN : <span className="break-all">{rib.iban}</span></p>
          <p>BIC : {rib.bic}</p>
        </Card>
      ) : null}
      <p className="flex flex-wrap gap-3">
        <Link href="/mon-compte/commandes" className="ec-btn ec-btn--primary">Suivre mes commandes</Link>
        <Link href="/catalogue" className="ec-btn ec-btn--secondary">Continuer mes achats</Link>
      </p>
    </div>
  );
}
