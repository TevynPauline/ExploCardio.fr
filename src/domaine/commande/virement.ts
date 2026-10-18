import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { dbSite } from "@/lib/db/site";
import { lireParametreEntier } from "@/lib/parametres";
import { emailsCommandes } from "@/emails/modeles-commandes";
import type { Devis } from "@/connecteurs/odoo/interfaces";
import { retablirCadeau } from "../comptes/bienvenue";
import { emailDuCompte, envoyer, ribDuSite } from "./notifications";

// Commandes réglées par virement (F04, US4, R6, D5) : tâche quotidienne. Virement reçu dans
// Odoo → commande payée, client prévenu ; rappel quelques jours avant l'échéance ; à
// l'échéance, la commande est annulée par l'opération du contrat (stock libéré), le droit au
// cadeau de bienvenue rétabli et le client prévenu. Chaque action est journalisée (FR-041).

const JOUR = 24 * 3600_000;

async function journal(action: string, objet: string, detail: object) {
  await dbSite().journalAction.create({ data: { auteur: "suivi des virements", action, objet, detail: JSON.parse(JSON.stringify(detail)) } });
}

export type BilanVirements = { payes: number; rappels: number; annules: number };

export async function traiterVirements(maintenant = new Date()): Promise<BilanVirements> {
  const bilan: BilanVirements = { payes: 0, rappels: 0, annules: 0 };
  const rappelJours = await lireParametreEntier("virement.rappel_jours", 2);
  const enAttente = await dbSite().commandeSite.findMany({ where: { etatAchat: "en_attente_virement", odooCommandeRef: { not: null } } });
  for (const c of enAttente) {
    const odooRef = c.odooCommandeRef!;
    let statut: string;
    try {
      statut = (await registre.odoo().commandes.lireCommande(odooRef)).statut;
    } catch (e) {
      if (estErreurConnecteur(e)) continue;
      throw e;
    }
    const email = await emailDuCompte(c.compteId);
    if (statut !== "en_attente_paiement" && statut !== "annulee") {
      // Virement reçu et enregistré dans Odoo.
      await dbSite().commandeSite.update({ where: { id: c.id }, data: { etatAchat: "payee" } });
      await envoyer(email, await emailsCommandes.paiementRecu({ ref: odooRef }), "virement reçu", `virement-recu:${odooRef}`);
      await journal("commande.virement_recu", odooRef, { commande: c.ref });
      bilan.payes++;
      continue;
    }
    const echeance = c.echeanceVirement;
    if (!echeance) continue;
    if (statut === "en_attente_paiement" && echeance <= maintenant) {
      await registre.odoo().commandes.annulerCommandeEnAttente(odooRef, "Virement non reçu à l'échéance");
      await retablirCadeau(odooRef);
      await dbSite().commandeSite.update({ where: { id: c.id }, data: { etatAchat: "refusee", motifRefus: "Virement non reçu à l'échéance : commande annulée." } });
      await dbSite().suiviCommande.upsert({
        where: { odooCommandeRef: odooRef },
        create: { odooCommandeRef: odooRef, dernierStatut: "annulee" },
        update: { dernierStatut: "annulee", notifieLe: maintenant },
      });
      await envoyer(email, await emailsCommandes.annulation({ ref: odooRef, motif: "nous n'avons pas reçu votre virement à la date prévue" }), "commande annulée", `annulation:${odooRef}`);
      await journal("commande.annulee", odooRef, { motif: "virement non reçu", commande: c.ref });
      bilan.annules++;
      continue;
    }
    if (!c.rappelVirementLe && echeance.getTime() - maintenant.getTime() <= rappelJours * JOUR) {
      const devis = c.devis as Devis | null;
      await envoyer(
        email,
        await emailsCommandes.rappelVirement({ ref: odooRef, totalTtc: devis?.achat?.totalTtc ?? 0, echeance, rib: await ribDuSite() }),
        "rappel de virement",
        `rappel-virement:${odooRef}`,
      );
      await dbSite().commandeSite.update({ where: { id: c.id }, data: { rappelVirementLe: maintenant } });
      await journal("commande.rappel_virement", odooRef, { echeance });
      bilan.rappels++;
    }
  }
  return bilan;
}
