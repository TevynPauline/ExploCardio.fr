import { registre } from "@/connecteurs/registre";
import { dbSite } from "@/lib/db/site";
import { ouvrirDroitSiEligible } from "./bienvenue";

// Newsletter d'un compte (F02, FR-026 à FR-028). Pour un compte, la confirmation de l'email vaut
// confirmation de l'abonnement. Une inscription faite par le pied de page (F01) avec la même
// adresse est rattachée au compte, sans doublon.

export const TEXTE_ABONNEMENT_COMPTE =
  "Je souhaite recevoir la newsletter d'ExploCardio.fr (nouveautés, offres). Je peux me désinscrire à tout moment.";

async function dernierEtat(compteId: string): Promise<boolean> {
  const d = await dbSite().consentement.findFirst({ where: { compteId, objet: "newsletter" }, orderBy: { date: "desc" } });
  return d?.etat === true;
}

/** Après la confirmation de l'email : rattache une inscription F01, transmet l'état à l'outil. */
export async function synchroniserNewsletterDuCompte(compteId: string): Promise<void> {
  const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId }, include: { utilisateur: true } });
  const email = compte.utilisateur.email;
  const pied = await dbSite().inscriptionNewsletter.findUnique({ where: { email } });
  if (pied?.etat === "confirmee" && !(await dernierEtat(compteId))) {
    await dbSite().consentement.create({
      data: { compteId, email, objet: "newsletter", etat: true, origine: "pied_de_page", textePresente: pied.textePresente },
    });
  }
  const abonne = await dernierEtat(compteId);
  await registre.emailing().mettreAJourContact({ email, consentements: { newsletter: abonne } });
  if (abonne) await ouvrirDroitSiEligible(compteId);
}

/** Abonnement ou désabonnement depuis « Mon compte » (FR-027) ; le droit au cadeau reste acquis. */
export async function changerAbonnement(compteId: string, abonne: boolean): Promise<void> {
  const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId }, include: { utilisateur: true } });
  if ((await dernierEtat(compteId)) === abonne) return;
  await dbSite().consentement.create({
    data: {
      compteId,
      email: compte.utilisateur.email,
      objet: "newsletter",
      etat: abonne,
      origine: "mon_compte",
      textePresente: abonne ? TEXTE_ABONNEMENT_COMPTE : "Désabonnement de la newsletter depuis « Mon compte »",
    },
  });
  await registre.emailing().mettreAJourContact({ email: compte.utilisateur.email, consentements: { newsletter: abonne } });
  if (abonne) await ouvrirDroitSiEligible(compteId);
}

export async function estAbonneCompte(compteId: string): Promise<boolean> {
  return dernierEtat(compteId);
}
