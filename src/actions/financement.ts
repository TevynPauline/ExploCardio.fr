"use server";

import { redirect } from "next/navigation";
import { compteConnecte } from "@/domaine/comptes/session";
import { DemandeRefusee, envoyerDemande } from "@/domaine/financement/demande";

// Demande de financement (F04, US6) : aucune donnée bancaire, aucun paiement en ligne.

export type EtatDemande = { erreurs: Record<string, string>; message?: string; saisie?: Record<string, string> };

const t = (d: FormData, n: string) => String(d.get(n) ?? "").trim();

export async function actionDemandeFinancement(_e: EtatDemande, d: FormData): Promise<EtatDemande> {
  const compte = await compteConnecte();
  if (!compte) redirect("/connexion?retour=/financement/demande");
  const equipements = [...d.keys()]
    .filter((k) => k.startsWith("quantite."))
    .map((k) => ({ defaultCode: k.slice("quantite.".length), quantite: Number(t(d, k)) }))
    .filter((e) => e.quantite > 0);
  const praticiens = t(d, "praticiens");
  try {
    await envoyerDemande(compte.id, {
      equipements,
      dureeMois: Number(t(d, "duree")),
      cabinet: { nom: t(d, "cabinet"), siret: t(d, "siret"), adresse: t(d, "adresse"), praticiens: praticiens ? Number(praticiens) : null },
      telephone: t(d, "telephone"),
      depuisPanier: t(d, "source") === "panier",
    });
  } catch (e) {
    if (e instanceof DemandeRefusee) {
      return { erreurs: e.erreurs, message: e.message, saisie: Object.fromEntries([...d.entries()].map(([k, v]) => [k, String(v)])) };
    }
    throw e;
  }
  redirect("/mon-compte/financements?envoyee=1");
}
