import { randomUUID } from "node:crypto";
import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import type { Devis } from "@/connecteurs/odoo/interfaces";
import { dbSite } from "@/lib/db/site";
import { lireParametre } from "@/lib/parametres";
import { emailsCommandes, type Rib } from "@/emails/modeles-commandes";
import type { EmailRendu } from "@/emails/modeles";
import type { CommandeSite } from "@generated/site/client";

// Emails et alertes de F04 (contracts/emails.md) : par le connecteur emailing (boîte de
// démonstration en phase 1). Un échec d'envoi n'empêche jamais l'enregistrement d'une commande.

export async function ribDuSite(): Promise<Rib> {
  const [titulaire, iban, bic] = await Promise.all([lireParametre("virement.titulaire"), lireParametre("virement.iban"), lireParametre("virement.bic")]);
  return { titulaire: titulaire ?? "", iban: iban ?? "", bic: bic ?? "" };
}

export async function emailDuCompte(compteId: string): Promise<string> {
  const c = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId }, include: { utilisateur: true } });
  return c.utilisateur.email;
}

export async function envoyer(destinataire: string, email: EmailRendu, declencheur: string, cle: string) {
  try {
    await registre.emailing().envoyerTransactionnel({ ...email, destinataire, declencheur }, cle);
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e;
  }
}

export async function alerterEquipe(objet: string, texte: string, cle: string) {
  const destinataire = (await lireParametre("contact.destinataire_messages"))?.trim() || "admin@demo.explocardio.test";
  try {
    await registre.emailing().envoyerNotificationEquipe({ canal: "email", destinataires: [destinataire], objet, texte, declencheur: "commandes" }, `${cle}:${randomUUID()}`);
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e;
  }
}

/** Email de confirmation d'une commande (carte ou virement), à partir du devis enregistré. */
export async function envoyerConfirmation(commande: CommandeSite, options: { virement?: { rib: Rib; echeance: Date } } = {}) {
  const devis = commande.devis as Devis | null;
  const lignes = (devis?.lignes ?? []).filter((l) => l.formule === "achat").map((l) => ({ libelle: l.libelle, quantite: l.quantite, totalHt: l.totalHt }));
  const email = await emailsCommandes.confirmation({
    ref: commande.odooCommandeRef ?? commande.ref,
    lignes,
    totalHt: devis?.achat?.totalHt ?? 0,
    totalTtc: devis?.achat?.totalTtc ?? 0,
    virement: options.virement ?? null,
  });
  await envoyer(await emailDuCompte(commande.compteId), email, "confirmation de commande", `confirmation:${commande.ref}`);
}
