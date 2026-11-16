import { randomUUID } from "node:crypto";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { notifierEquipe } from "@/domaine/emailing/envoi";
import { dbSite } from "@/lib/db/site";
import { lireParametre } from "@/lib/parametres";
import { CRENEAUX, DELAIS, INTERETS, normaliser, type SaisieQuestionnaire } from "./questionnaire";

// Demandes « Informatique médicale » (F27, FR-034 à FR-036, contracts/questionnaire.md) :
// enregistrées dans la base du site, puis l'équipe est prévenue par le connecteur emailing
// (simulé en démonstration). Rien n'est transmis à 2i ni à PCA : Régis qualifie et transmet.

/** Même destinataire que les messages de contact (paramètre du back-office). */
async function destinataires(): Promise<string[]> {
  const parametre = (await lireParametre("contact.destinataire_messages"))?.trim();
  return [parametre || "admin@demo.explocardio.test"];
}

export async function enregistrerDemandeInformatique(s: SaisieQuestionnaire, compteId: string | null, maintenant = new Date()): Promise<string> {
  const d = normaliser(s);
  const demande = await dbSite().demandeInformatique.create({
    data: { ...d, consentementLe: maintenant, compteId },
  });
  const sujets = d.interets.map((i) => INTERETS[i as keyof typeof INTERETS]?.libelle ?? i).join(", ");
  const texte = [
    `${d.coordonnees.nom} (${d.coordonnees.cabinet}, ${d.coordonnees.codePostal}) a décrit son besoin depuis la page Informatique médicale.`,
    "",
    `Sujets : ${sujets}`,
    `Cabinet : ${d.medecins} médecin(s), ${d.postes} poste(s), secrétariat sur place : ${d.secretariat ? "oui" : "non"}`,
    `Délai : ${DELAIS[d.delai as keyof typeof DELAIS] ?? d.delai}`,
    `À rappeler : ${CRENEAUX[d.creneau as keyof typeof CRENEAUX] ?? d.creneau}, au ${d.coordonnees.telephone} (${d.coordonnees.email})`,
    "",
    "Le détail est dans le back-office : Demandes → Informatique médicale.",
  ].join("\n");
  try {
    await notifierEquipe(
      { canal: "email", destinataires: await destinataires(), objet: "Nouvelle demande Informatique médicale", texte, declencheur: "informatique" },
      `informatique:${demande.id}:${randomUUID()}`,
    );
  } catch (e) {
    // La demande reste consultable par l'équipe même si l'envoi échoue (SC-006).
    if (!estErreurConnecteur(e)) throw e;
    console.error("[informatique] notification d'équipe impossible", e.code);
  }
  return demande.id;
}

/** Coordonnées connues d'un médecin connecté, pour préremplir l'étape 3 (FR-031). */
export async function coordonneesDuCompte(utilisateurId: string): Promise<{ compteId: string; nom: string; email: string; cabinet: string; codePostal: string } | null> {
  const compte = await dbSite().compteClient.findUnique({ where: { utilisateurId }, include: { utilisateur: true, adresses: true } });
  if (!compte) return null;
  return {
    compteId: compte.id,
    nom: compte.utilisateur.name,
    email: compte.utilisateur.email,
    cabinet: compte.nomCabinet ?? "",
    codePostal: compte.adresses[0]?.codePostal ?? "",
  };
}
