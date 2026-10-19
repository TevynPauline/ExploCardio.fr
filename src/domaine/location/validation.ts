import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { dbSite } from "@/lib/db/site";
import { emailsLocations } from "@/emails/modeles-locations";
import { alerterEquipe, envoyer } from "../commande/notifications";
import { premiereDatePour } from "./offre";

// Location payée par un compte pas encore validé (F05, US2, FR-009, FR-044, FR-045) : alerte
// de validation prioritaire ; à la validation, l'expédition est débloquée (date recalculée si
// elle n'est plus tenable) ; au refus, la location est annulée et intégralement remboursée.

async function journal(action: string, objet: string, detail: object) {
  await dbSite().journalAction.create({ data: { auteur: "locations", action, objet, detail: JSON.parse(JSON.stringify(detail)) } });
}

/** Au paiement d'une location par un compte en attente : alerte prioritaire à l'équipe. */
export async function alerterValidationPrioritaire(compteId: string, commandeRef: string) {
  const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId }, include: { utilisateur: true } });
  await alerterEquipe(
    "Validation prioritaire : location payée",
    `${compte.utilisateur.name} (${compte.utilisateur.email}, RPPS ${compte.rpps ?? "—"}, SIRET ${compte.siret ?? "—"}) a payé une mise à disposition (commande ${commandeRef}) avant la validation de son compte. Rien ne part avant la validation : à vérifier en priorité.`,
    `validation-prioritaire:${commandeRef}`,
  );
}

/** Compte validé : expédition débloquée ; nouvelle date si celle annoncée n'est plus tenable. */
export async function surCompteValide(compteId: string, maintenant = new Date()) {
  const compte = await dbSite().compteClient.findUnique({ where: { id: compteId }, include: { utilisateur: true, adresses: true } });
  if (!compte?.odooPartnerRef) return;
  try {
    const debloquees = await registre.odoo().location.debloquerExpedition(compte.odooPartnerRef);
    if (!debloquees.length) return;
    const locations = await registre.odoo().location.listerLocations(compte.odooPartnerRef);
    const cp = (compte.adresses.find((a) => a.type === "livraison") ?? compte.adresses.find((a) => a.type === "cabinet"))?.codePostal ?? null;
    for (const l of locations.filter((x) => debloquees.includes(x.ref))) {
      const annoncee = l.dateLivraison?.toISOString().slice(0, 10) ?? null;
      const possible = await premiereDatePour(l.defaultCode, cp, maintenant);
      if (annoncee && possible > annoncee) {
        await registre.odoo().location.reporterLivraison(l.ref, new Date(`${possible}T12:00:00Z`));
        await envoyer(compte.utilisateur.email, await emailsLocations.dateRecalculee({ appareil: l.libelle, dateLivraison: new Date(`${possible}T12:00:00Z`) }), "date de livraison recalculée", `date-recalculee:${l.ref}:${possible}`);
        await journal("location.date_recalculee", l.ref, { avant: annoncee, apres: possible });
      }
      await journal("location.expedition_debloquee", l.ref, { compte: compteId });
    }
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e;
    await alerterEquipe("Expédition à débloquer", `Le compte ${compte.utilisateur.email} est validé mais ses locations n'ont pas pu être débloquées dans Odoo (${e.message}) : à faire dans Odoo.`, `deblocage:${compteId}`);
  }
}

/** Compte refusé : locations non expédiées annulées, premier mois et kit remboursés intégralement (FR-045). */
export async function surCompteRefuse(compteId: string, motif: string) {
  const compte = await dbSite().compteClient.findUnique({ where: { id: compteId }, include: { utilisateur: true } });
  if (!compte?.odooPartnerRef) return;
  const locations = (await registre.odoo().location.listerLocations(compte.odooPartnerRef)).filter((l) => l.etat === "commandee" && !l.expedieLe);
  for (const l of locations) {
    try {
      const commande = (await dbSite().commandeSite.findMany({ where: { compteId, odooAbonnementRefs: { has: l.ref } } }))[0];
      const { montantTtc } = await registre.odoo().location.annulerCommande(l.ref, "Compte refusé", `refus:${l.ref}`);
      let total = 0;
      if (montantTtc && commande?.paiementAbonnementRef) {
        await registre.stripe().rembourser({ paiementRef: commande.paiementAbonnementRef, montantTtc, motif: "Compte refusé : location annulée" }, `refus:${l.ref}`);
        total += montantTtc;
      }
      // Kit d'accessoires acheté avec la location : remboursé lui aussi (exception limitée à F05).
      if (commande?.odooCommandeRef && commande.paiementRef) {
        const achat = await registre.odoo().commandes.lireCommande(commande.odooCommandeRef);
        const reste = achat.montantTtc - achat.remboursementsTtc;
        if (reste > 0) {
          const r = await registre.stripe().rembourser({ paiementRef: commande.paiementRef, montantTtc: reste, motif: "Compte refusé : kit remboursé" }, `refus-kit:${commande.ref}`);
          await registre.odoo().commandes.enregistrerRemboursement(
            { commandeRef: commande.odooCommandeRef, montantTtc: reste, motif: "Compte refusé : location annulée", source: "odoo", referenceStripe: r.remboursementRef },
            `refus-kit:${commande.ref}`,
          );
          total += reste;
        }
      }
      await envoyer(compte.utilisateur.email, await emailsLocations.annuleeRemboursee({ appareil: l.libelle, montantTtc: total, motif: "votre compte n'a pas pu être validé" }), "location annulée", `location-annulee:${l.ref}`);
      await journal("location.annulee_compte_refuse", l.ref, { motif, rembourseTtc: total });
    } catch (e) {
      if (!estErreurConnecteur(e)) throw e;
      await alerterEquipe("Remboursement à faire", `Compte ${compte.utilisateur.email} refusé : la location ${l.ref} n'a pas pu être annulée et remboursée automatiquement (${e.message}).`, `refus-echec:${l.ref}`);
    }
  }
}
