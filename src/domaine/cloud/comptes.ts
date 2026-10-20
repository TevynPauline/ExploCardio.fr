import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { dbSite } from "@/lib/db/site";
import { medecinDe, retablirAcces, suspendreAcces, type Auteur } from "./acces";

// Effets des changements de compte sur les accès Cloud (F12, FR-017, cas limites) : compte
// suspendu → accès suspendus ; rétabli → accès suspendus pour ce motif rétablis ; supprimé →
// fin programmée (délai de grâce) ; email ou identité modifiés → plateforme mise à jour.

export const MOTIF_COMPTE_SUSPENDU = "compte suspendu";
const ignorerPanne = (e: unknown) => {
  if (!estErreurConnecteur(e)) throw e; // la tâche horaire et l'équipe rattrapent
};

export async function surCompteSuspendu(compteId: string, auteur: Auteur) {
  for (const a of await dbSite().accesLogiciel.findMany({ where: { compteId, etat: { in: ["actif", "grace", "en_ouverture"] } } })) {
    await suspendreAcces(a, MOTIF_COMPTE_SUSPENDU, auteur).catch(ignorerPanne);
  }
}

export async function surCompteRetabli(compteId: string, auteur: Auteur) {
  for (const a of await dbSite().accesLogiciel.findMany({ where: { compteId, etat: "suspendu" } })) {
    const derniere = await dbSite().journalAction.findFirst({ where: { objet: a.id, action: "cloud.suspension" }, orderBy: { date: "desc" } });
    if ((derniere?.detail as { motif?: string } | null)?.motif !== MOTIF_COMPTE_SUSPENDU) continue; // impayé, geste de l'équipe : inchangé
    await retablirAcces(a, "compte rétabli", auteur).catch(ignorerPanne);
  }
}

/** Compte supprimé (RGPD) : les accès prennent fin aujourd'hui, avec le délai de grâce. */
export async function surCompteSupprime(compteId: string, maintenant = new Date()) {
  await dbSite().accesLogiciel.updateMany({ where: { compteId, etat: { not: "ferme" } }, data: { finPrevue: maintenant } });
}

export async function surMedecinModifie(compteId: string) {
  if (!(await dbSite().accesLogiciel.count({ where: { compteId } }))) return;
  const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId }, include: { utilisateur: true } });
  if (!compte.odooPartnerRef) return;
  await registre.pca().mettreAJourMedecin(medecinDe(compte)).catch(ignorerPanne);
}
