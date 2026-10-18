"use server";

import { redirect } from "next/navigation";
import { commandesDemo, paiementDemo, ValeurRefusee } from "@/connecteurs/demonstration";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { centimesDepuisSaisie } from "@/lib/montants";
import { exigerAdministrateur } from "@/lib/roles";

const CHEMIN = "/admin/demonstration/paiements";

async function auteur() {
  const { user } = await exigerAdministrateur();
  return { id: user.id, libelle: `${user.name} (${user.email})` };
}

function retour(r: { ok: string } | { erreur: string }): never {
  redirect(`${CHEMIN}?${new URLSearchParams(r).toString()}`);
}

async function executer(succes: string, operation: () => Promise<void>): Promise<never> {
  try {
    await operation();
  } catch (e) {
    if (e instanceof ValeurRefusee || estErreurConnecteur(e)) retour({ erreur: e.message });
    throw e;
  }
  retour({ ok: succes });
}

export async function ouvrirPaiementDeTest(donnees: FormData) {
  await exigerAdministrateur();
  const montant = centimesDepuisSaisie(String(donnees.get("montant") ?? ""));
  if (!montant || montant <= 0) retour({ erreur: "Montant invalide (exemple : 120,00)." });
  const moyens = donnees.getAll("moyens").map(String).filter((m): m is "carte" | "sepa" => m === "carte" || m === "sepa");
  const { url } = await paiementDemo.ouvrirPaiementDeTest(montant, moyens.length ? moyens : ["carte"]);
  redirect(url);
}

export async function simulerEcheance(donnees: FormData) {
  const a = await auteur();
  const ref = String(donnees.get("abonnement"));
  const payee = donnees.get("issue") === "payee";
  await executer(`Échéance ${payee ? "payée" : "refusée"} simulée pour ${ref}.`, () => paiementDemo.simulerEcheance(a, ref, payee));
}

export async function simulerRemboursement(donnees: FormData) {
  const a = await auteur();
  const ref = String(donnees.get("paiement"));
  await executer(`Remboursement simulé pour ${ref}.`, async () => {
    const montant = centimesDepuisSaisie(String(donnees.get("montant") ?? ""));
    if (montant === null) throw new ValeurRefusee("Remboursement : montant invalide (exemple : 50,00).");
    await paiementDemo.simulerRemboursement(a, ref, montant, String(donnees.get("motif") || "remboursement de démonstration"));
    await suivreAussitot();
  });
}

// --- Cycle des commandes (F04) -----------------------------------------------------------------

export async function virementRecu(donnees: FormData) {
  const a = await auteur();
  const ref = String(donnees.get("commande"));
  const montant = centimesDepuisSaisie(String(donnees.get("montant") ?? ""));
  if (montant === null || montant <= 0) retour({ erreur: "Virement : montant invalide (exemple : 120,00)." });
  let ecart = 0;
  await executerSans(async () => {
    ecart = (await commandesDemo.virementRecu(a, ref, montant!)).ecart;
  });
  if (ecart !== 0) {
    const { alerterEquipe } = await import("@/domaine/commande/notifications");
    await alerterEquipe(
      "Virement d'un montant différent",
      `Le virement reçu pour la commande ${ref} diffère du montant attendu de ${(ecart / 100).toFixed(2)} €. La commande reste en attente.`,
      `ecart-virement:${ref}`,
    );
    retour({ erreur: `Montant différent de la commande (écart ${(ecart / 100).toFixed(2).replace(".", ",")} €) : la commande reste en attente et l'équipe est alertée.` });
  }
  // En démonstration, le site est mis à jour tout de suite (en temps normal : tâche du matin).
  const { traiterVirements } = await import("@/domaine/commande/virement");
  await traiterVirements();
  retour({ ok: `Virement enregistré pour ${ref} : commande payée et facturée, client prévenu.` });
}

/** En démonstration, le suivi des commandes passe aussitôt (en temps normal : toutes les 5 minutes). */
async function suivreAussitot() {
  const { suivreCommandes } = await import("@/domaine/commande/suivi");
  await suivreCommandes();
}

export async function expedierCommande(donnees: FormData) {
  const a = await auteur();
  const ref = String(donnees.get("commande"));
  await executer(`Commande ${ref} marquée expédiée : client prévenu.`, async () => {
    await commandesDemo.marquerExpediee(a, ref, String(donnees.get("transporteur") ?? ""), String(donnees.get("suivi") ?? ""));
    await suivreAussitot();
  });
}

export async function livrerCommande(donnees: FormData) {
  const a = await auteur();
  const ref = String(donnees.get("commande"));
  await executer(`Commande ${ref} marquée livrée.`, async () => {
    await commandesDemo.marquerLivree(a, ref);
    await suivreAussitot();
  });
}

export async function deciderRemboursement(donnees: FormData) {
  const a = await auteur();
  const ref = String(donnees.get("commande"));
  const montant = centimesDepuisSaisie(String(donnees.get("montant") ?? ""));
  if (montant === null || montant <= 0) retour({ erreur: "Remboursement : montant invalide (exemple : 50,00)." });
  await executer(`Remboursement décidé pour ${ref} : exécuté, avoir émis, client prévenu.`, async () => {
    await commandesDemo.deciderRemboursement(a, ref, montant!, String(donnees.get("motif") ?? ""));
    await suivreAussitot();
  });
}

async function executerSans(operation: () => Promise<void>) {
  try {
    await operation();
  } catch (e) {
    if (e instanceof ValeurRefusee || estErreurConnecteur(e)) retour({ erreur: e.message });
    throw e;
  }
}
