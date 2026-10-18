import type { Metadata } from "next";
import { adressesDe } from "@/domaine/commande/tunnel";
import { Kicker } from "@/ui";
import { Etapes } from "@/ui/commande/Etapes";
import { FormulaireAdresses } from "@/ui/commande/FormulaireAdresses";
import { RefusTunnel } from "@/ui/commande/RefusTunnel";
import { chargerCommande } from "../charger";

export const metadata: Metadata = { title: "Commande — adresses" };

export default async function Adresses({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const r = await chargerCommande("/commande/adresses", ref);
  if ("refus" in r && r.refus) return <RefusTunnel message={r.refus.message} lien={r.refus.redirection} />;
  const commande = r.commande!;
  const a = adressesDe(commande);
  const valeurs: Record<string, string> = {};
  for (const [p, adr] of Object.entries(a)) for (const [k, v] of Object.entries(adr ?? {})) valeurs[`${p}.${k}`] = String(v ?? "");
  const identique = JSON.stringify(a.livraison ?? null) === JSON.stringify(a.facturation ?? null);
  return (
    <div className="mx-auto flex max-w-page flex-col gap-6 px-4 py-10">
      <Kicker>Commande {commande.ref}</Kicker>
      <h1 className="text-display font-light">Vos adresses</h1>
      <Etapes courante="adresses" atteinte={commande.etape === "terminee" ? "recapitulatif" : commande.etape} refCommande={commande.ref} sansLivraison={commande.etatAchat === "sans_objet"} />
      <div className="max-w-2xl">
        <FormulaireAdresses refCommande={commande.ref} valeurs={valeurs} identique={identique} />
      </div>
    </div>
  );
}
