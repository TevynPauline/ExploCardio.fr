import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { dbSite } from "@/lib/db/site";
import { lireParametreEntier } from "@/lib/parametres";
import { emailsLocations } from "@/emails/modeles-locations";
import { prixTtc } from "../catalogue/prix";
import { envoyer } from "../commande/notifications";
import { commandeDeLocation, suiviPour } from "./suivi";

// Tâche quotidienne des locations (F05, US6, D6) : rappel avant chaque échéance (FR-025),
// rappels de retour en retard avant toute facturation (FR-028, SC-010), fermeture de l'accès
// Cloud à la date de fin (FR-022), libération de l'autorisation de prélèvement une fois
// l'appareil rendu et les sommes réglées (FR-030). Les règles de délai viennent d'Odoo ; les
// fréquences des emails, du back-office (FR-040).

const JOUR = 24 * 3600_000;

async function journal(action: string, objet: string, detail: object) {
  await dbSite().journalAction.create({ data: { auteur: "rappels des locations", action, objet, detail: JSON.parse(JSON.stringify(detail)) } });
}

async function emailDu(partenaireRef: string) {
  return (await dbSite().compteClient.findFirst({ where: { odooPartnerRef: partenaireRef }, include: { utilisateur: true } }))?.utilisateur.email ?? null;
}

export async function envoyerRappelsLocations(maintenant = new Date()): Promise<{ echeances: number; retours: number; autorisations: number }> {
  const bilan = { echeances: 0, retours: 0, autorisations: 0 };
  const delaiEcheance = await lireParametreEntier("location.rappel_echeance_jours", 3);
  const frequenceRetour = await lireParametreEntier("location.rappel_retour_jours", 2);
  const regles = await registre.odoo().location.lireRegles();
  const aPrelever = new Set((await registre.odoo().location.listerFacturesAPrelever()).map((f) => f.abonnementRef));
  const locations = (await registre.odoo().location.listerChangements(new Date(0))).filter((l) => l.objet === "mise_a_disposition");

  for (const l of locations) {
    const suivi = await suiviPour(l);

    // Rappel avant l'échéance (une fois par échéance), si la location continue après elle.
    const continue_ = l.etat === "en_cours" || (l.etat === "resiliation_prevue" && l.fin && l.prochaineEcheance && l.fin > l.prochaineEcheance);
    if (continue_ && l.prochaineEcheance && l.prochaineEcheance > maintenant && l.prochaineEcheance.getTime() - maintenant.getTime() <= delaiEcheance * JOUR) {
      if (suivi.echeanceRappelee?.getTime() !== l.prochaineEcheance.getTime()) {
        const email = await emailDu(l.partenaireRef);
        if (email) {
          await envoyer(
            email,
            await emailsLocations.rappelEcheance({ appareil: l.libelle, echeance: l.prochaineEcheance, montantHt: l.montantMensuelHt, montantTtc: prixTtc(l.montantMensuelHt, 20) }),
            "rappel d'échéance",
            `rappel-echeance:${l.partenaireRef}:${l.ref}:${l.prochaineEcheance.toISOString().slice(0, 10)}`,
          );
        }
        await dbSite().suiviLocation.update({ where: { abonnementRef: l.ref }, data: { echeanceRappelee: l.prochaineEcheance } });
        bilan.echeances++;
      }
    }

    // F12 : la fin de l'accès au logiciel Cloud (délai de grâce, fermeture) suit la tâche horaire des accès.

    // Retour en retard : rappels espacés, avec la date de facturation du mois suivant (SC-010).
    if (l.etat === "en_retard_retour" && l.dateLimiteRetour && l.dateLimiteRetour < maintenant) {
      const dernier = suivi.dernierRappelRetour;
      if (!dernier || maintenant.getTime() - dernier.getTime() >= frequenceRetour * JOUR) {
        const email = await emailDu(l.partenaireRef);
        const facturationLe = new Date(l.dateLimiteRetour.getTime() + regles.toleranceRetardJours * JOUR);
        if (email) {
          await envoyer(
            email,
            await emailsLocations.rappelRetour({ appareil: l.libelle, dateLimiteRetour: l.dateLimiteRetour, facturationLe, montantHt: l.montantMensuelHt }),
            "rappel de retour",
            `rappel-retour:${l.partenaireRef}:${l.ref}:${suivi.rappelsRetour + 1}`,
          );
        }
        await dbSite().suiviLocation.update({ where: { abonnementRef: l.ref }, data: { rappelsRetour: suivi.rappelsRetour + 1, dernierRappelRetour: maintenant } });
        await journal("location.rappel_retour", l.ref, { rappel: suivi.rappelsRetour + 1 });
        bilan.retours++;
      }
    }

    // Appareil rendu et sommes réglées : l'autorisation de prélèvement est libérée (FR-030).
    if (l.etat === "terminee" && !aPrelever.has(l.ref)) {
      const lien = await commandeDeLocation(l.ref);
      if (lien) {
        const soeurs = locations.filter((x) => lien.commande.odooAbonnementRefs.includes(x.ref));
        const toutesFinies = soeurs.every((x) => (x.etat === "terminee" || x.etat === "annulee") && !aPrelever.has(x.ref));
        if (toutesFinies && suivi.dernierEtat !== "autorisation_liberee") {
          try {
            await registre.stripe().libererAutorisation(lien.commande.ref);
            await dbSite().suiviLocation.update({ where: { abonnementRef: l.ref }, data: { dernierEtat: "autorisation_liberee" } });
            await journal("location.autorisation_liberee", l.ref, { commande: lien.commande.ref });
            bilan.autorisations++;
          } catch (e) {
            if (!estErreurConnecteur(e)) throw e;
          }
        }
      }
    }
  }
  return bilan;
}
