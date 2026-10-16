import { randomUUID } from "node:crypto";
import { Prisma } from "@generated/site/client";
import { registre } from "@/connecteurs/registre";
import { dbSite } from "@/lib/db/site";
import { lireParametre } from "@/lib/parametres";
import { emailsComptes } from "@/emails/modeles-comptes";
import { notifier } from "./securite";

// Offre de bienvenue (F02, US4, R6, contracts/domaine.md) : un tensiomètre par numéro RPPS ou
// SIRET, joint à la première commande. Le droit est une donnée du site ; l'article offert et
// son stock sont dans Odoo.

type Compte = { id: string; statut: string; rpps: string | null; siret: string | null };

function numeroDu(compte: Compte): string | null {
  return compte.rpps ?? compte.siret;
}

export async function offreActive(): Promise<boolean> {
  return (await lireParametre("bienvenue.active")) !== "false";
}

export async function estAbonne(compteId: string): Promise<boolean> {
  const dernier = await dbSite().consentement.findFirst({ where: { compteId, objet: "newsletter" }, orderBy: { date: "desc" } });
  return dernier?.etat === true;
}

/**
 * Ouvre le droit si l'offre est active, le compte validé et abonné, et le numéro jamais servi.
 * Sans effet sinon. La contrainte d'unicité sur le numéro empêche tout doublon (SC-002).
 */
export async function ouvrirDroitSiEligible(compteId: string): Promise<boolean> {
  const compte = await dbSite().compteClient.findUnique({ where: { id: compteId } });
  if (!compte || compte.statut !== "valide") return false;
  const numero = numeroDu(compte);
  if (!numero || !(await offreActive()) || !(await estAbonne(compteId))) return false;
  try {
    await dbSite().attributionCadeau.create({ data: { numero, compteId } });
    return true;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return false;
    throw e;
  }
}

export type EtatBienvenue =
  | { etat: "beneficiaire" }
  | { etat: "en_attente_stock" }
  | { etat: "recu" }
  | { etat: "non_abonne" }
  | { etat: "non_valide" }
  | { etat: "inactive" };

/** Ce que « Mon compte » affiche (US4-1, US4-5, US4-7). */
export async function etatBienvenue(compteId: string): Promise<EtatBienvenue> {
  const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId } });
  const numero = numeroDu(compte);
  const attribution = numero ? await dbSite().attributionCadeau.findUnique({ where: { numero } }) : null;
  if (attribution?.etat === "remis") return { etat: "recu" };
  if (attribution?.etat === "en_attente_stock") return { etat: "en_attente_stock" };
  if (attribution?.etat === "droit_ouvert") return { etat: "beneficiaire" };
  if (!(await offreActive())) return { etat: "inactive" };
  if (compte.statut !== "valide") return { etat: "non_valide" };
  return { etat: "non_abonne" };
}

/**
 * Ligne offerte à ajouter à la première commande (appelée par F04 avant de créer la commande),
 * ou null. Le droit doit être ouvert ; l'offre peut avoir été désactivée depuis (droit conservé).
 */
export async function cadeauPourCommande(compte: Compte): Promise<{ defaultCode: string; quantite: 1; offerte: true } | null> {
  const numero = numeroDu(compte);
  if (!numero || compte.statut !== "valide") return null;
  const attribution = await dbSite().attributionCadeau.findUnique({ where: { numero } });
  if (attribution?.etat !== "droit_ouvert") return null;
  const offre = await registre.odoo().fidelite.lireOffreBienvenue();
  if (!offre) return null;
  return { defaultCode: offre.defaultCode, quantite: 1, offerte: true };
}

async function destinataireEquipe(): Promise<string> {
  return (await lireParametre("contact.destinataire_messages"))?.trim() || "admin@demo.explocardio.test";
}

/**
 * Après la création de la commande qui porte la ligne offerte : `remis`, ou `en_attente_stock`
 * en cas de rupture (bénéficiaire informé, équipe alertée, FR-025). Idempotent, et une seule
 * commande peut prendre le cadeau même en cas d'appels simultanés (SC-002).
 */
export async function confirmerCadeauRemis(compte: Compte & { email: string }, commandeRef: string): Promise<"remis" | "en_attente_stock" | "deja_pris"> {
  const numero = numeroDu(compte);
  if (!numero) return "deja_pris";
  const offre = await registre.odoo().fidelite.lireOffreBienvenue();
  const rupture = offre?.disponibilite.etat !== "disponible";
  const etat = rupture ? "en_attente_stock" : "remis";
  // Mise à jour conditionnelle : seule la première commande passe de droit_ouvert à son état.
  const r = await dbSite().attributionCadeau.updateMany({
    where: { numero, OR: [{ etat: "droit_ouvert" }, { commandeRef }] },
    data: { etat, commandeRef, remisLe: rupture ? null : new Date() },
  });
  if (r.count === 0) return "deja_pris";
  if (rupture) {
    await notifier(compte.email, await emailsComptes.cadeauEnAttente(), `cadeau en attente de stock ${commandeRef}`);
    await registre.emailing().envoyerNotificationEquipe(
      {
        canal: "email",
        destinataires: [await destinataireEquipe()],
        objet: "Cadeau de bienvenue en rupture",
        texte: `La commande ${commandeRef} contient un tensiomètre de bienvenue en rupture de stock : à expédier dès son retour.`,
        declencheur: "offre de bienvenue",
      },
      `cadeau-rupture:${commandeRef}:${randomUUID()}`,
    );
  }
  return etat;
}

/** Première commande annulée avant expédition : le droit est rétabli (US4-9). */
export async function retablirCadeau(commandeRef: string): Promise<boolean> {
  const r = await dbSite().attributionCadeau.updateMany({
    where: { commandeRef },
    data: { etat: "droit_ouvert", commandeRef: null, remisLe: null },
  });
  return r.count > 0;
}
