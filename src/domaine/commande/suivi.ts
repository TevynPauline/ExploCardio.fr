import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import type { ChangementCommande } from "@/connecteurs/odoo/interfaces";
import { dbSite } from "@/lib/db/site";
import { emailsCommandes } from "@/emails/modeles-commandes";
import { retablirCadeau } from "../comptes/bienvenue";
import { alerterEquipe, envoyer } from "./notifications";

// Suivi des commandes (F04, US7, D6), toutes les 5 minutes : les changements faits dans Odoo
// (paiement du virement, expédition, annulation, remboursement) sont relevés et le client est
// prévenu une seule fois par changement (SuiviCommande). Les remboursements décidés dans Odoo
// sont exécutés par Stripe puis enregistrés (avoir). Chaque action est journalisée (FR-041).

/** Fenêtre de relève : les changements sont comparés au dernier état connu, donc rejouables. */
const FENETRE_JOURS = 7;

async function journal(action: string, objet: string, detail: object) {
  await dbSite().journalAction.create({ data: { auteur: "suivi des commandes", action, objet, detail: JSON.parse(JSON.stringify(detail)) } });
}

async function emailDuPartenaire(partenaireRef: string): Promise<string | null> {
  const compte = await dbSite().compteClient.findFirst({ where: { odooPartnerRef: partenaireRef }, include: { utilisateur: true } });
  return compte?.utilisateur.email ?? null;
}

async function traiterChangement(ch: ChangementCommande, maintenant: Date) {
  const suivi = await dbSite().suiviCommande.findUnique({ where: { odooCommandeRef: ch.ref } });
  const statutAvant = suivi?.dernierStatut ?? null;
  const rembourseAvant = suivi?.remboursementsTtc ?? 0;
  if (statutAvant === ch.statut && rembourseAvant === ch.remboursementsTtc) return false;
  const email = await emailDuPartenaire(ch.partenaireRef);

  if (statutAvant !== ch.statut) {
    // Virement constaté dans Odoo : la commande du site passe payée (même email que la tâche du matin).
    const site = await dbSite().commandeSite.findFirst({ where: { odooCommandeRef: ch.ref } });
    if (site?.etatAchat === "en_attente_virement" && !["en_attente_paiement", "annulee"].includes(ch.statut)) {
      await dbSite().commandeSite.update({ where: { id: site.id }, data: { etatAchat: "payee" } });
      if (email) await envoyer(email, await emailsCommandes.paiementRecu({ ref: ch.ref }), "virement reçu", `virement-recu:${ch.ref}`);
      await journal("commande.virement_recu", ch.ref, { commande: site.ref });
    }
    if (ch.statut === "expediee" && email) {
      await envoyer(email, await emailsCommandes.expedition({ ref: ch.ref, transporteur: ch.transporteur, suivi: ch.suivi }), "commande expédiée", `expedition:${ch.ref}`);
      await journal("commande.expediee", ch.ref, { transporteur: ch.transporteur, suivi: ch.suivi });
    }
    // F05 (FR-033) : appareil acheté livré alors qu'une location du même appareil est en cours.
    if (ch.statut === "livree" && email) {
      try {
        const commande = await registre.odoo().commandes.lireCommande(ch.ref);
        const codes = new Set(commande.lignes.map((x) => x.defaultCode));
        const locations = (await registre.odoo().location.listerLocations(ch.partenaireRef)).filter((l) => l.etat === "en_cours" && codes.has(l.defaultCode));
        for (const l of locations) {
          const { emailsLocations } = await import("@/emails/modeles-locations");
          await envoyer(email, await emailsLocations.inviterResiliation({ appareil: l.libelle }), "inviter à résilier", `inviter-resiliation:${ch.ref}:${l.ref}`);
        }
      } catch (e) {
        if (!estErreurConnecteur(e)) throw e;
      }
    }
    if (ch.statut === "annulee" && statutAvant !== null) {
      await retablirCadeau(ch.ref);
      if (email) await envoyer(email, await emailsCommandes.annulation({ ref: ch.ref, motif: "elle a été annulée par notre équipe" }), "commande annulée", `annulation:${ch.ref}`);
      await journal("commande.annulee", ch.ref, { source: "odoo" });
    }
  }

  if (ch.remboursementsTtc > rembourseAvant && email) {
    await envoyer(
      email,
      await emailsCommandes.remboursement({ ref: ch.ref, montantTtc: ch.remboursementsTtc - rembourseAvant, total: ch.statut === "remboursee" }),
      "remboursement",
      `remboursement:${ch.ref}:${ch.remboursementsTtc}`,
    );
  }

  await dbSite().suiviCommande.upsert({
    where: { odooCommandeRef: ch.ref },
    create: { odooCommandeRef: ch.ref, dernierStatut: ch.statut, remboursementsTtc: ch.remboursementsTtc, notifieLe: maintenant },
    update: { dernierStatut: ch.statut, remboursementsTtc: ch.remboursementsTtc, notifieLe: maintenant },
  });
  return true;
}

/** Remboursements décidés dans Odoo : exécutés par Stripe (clé = remboursement), puis enregistrés. */
async function executerRemboursements() {
  let executes = 0;
  for (const r of await registre.odoo().commandes.listerRemboursementsAExecuter()) {
    if (!r.paiementRef) {
      await alerterEquipe(
        "Remboursement sans paiement par carte",
        `Le remboursement de ${(r.montantTtc / 100).toFixed(2)} € de la commande ${r.commandeRef} ne peut pas passer par Stripe (paiement ${r.modePaiement}) : à faire par virement.`,
        `remboursement-manuel:${r.id}`,
      );
      continue;
    }
    try {
      const { remboursementRef } = await registre.stripe().rembourser({ paiementRef: r.paiementRef, montantTtc: r.montantTtc, motif: r.motif }, `remboursement:${r.id}`);
      const { avoir } = await registre.odoo().commandes.enregistrerRemboursement(
        { commandeRef: r.commandeRef, montantTtc: r.montantTtc, motif: r.motif, source: "odoo", referenceStripe: remboursementRef, remboursementId: r.id },
        `odoo:${r.id}`,
      );
      await journal("commande.remboursement", r.commandeRef, { source: "odoo", montantTtc: r.montantTtc, avoir, remboursement: remboursementRef });
      executes++;
    } catch (e) {
      if (!estErreurConnecteur(e)) throw e; // réessayé au prochain passage
    }
  }
  return executes;
}

export async function suivreCommandes(maintenant = new Date()): Promise<{ remboursements: number; changements: number }> {
  const remboursements = await executerRemboursements();
  let changements = 0;
  const depuis = new Date(maintenant.getTime() - FENETRE_JOURS * 24 * 3600_000);
  for (const ch of await registre.odoo().commandes.listerChangements(depuis)) {
    if (await traiterChangement(ch, maintenant)) changements++;
  }
  return { remboursements, changements };
}
