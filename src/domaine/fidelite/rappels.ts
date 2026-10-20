import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { modeDuConnecteur } from "@/lib/config";
import { dbSite } from "@/lib/db/site";
import { lireParametreEntier } from "@/lib/parametres";
import { emailsFidelite } from "@/emails/modeles-fidelite";
import { demanderEnvoi } from "@/domaine/emailing/envoi";
import { piedPreferences } from "@/domaine/emailing/liens";
import { marquer } from "./suivi";

// Rappels quotidiens de la fidélité (F06, FR-005, FR-011, D2) : fin prochaine des droits
// d'assistance, expiration prochaine de bons d'achat. Une seule fois par échéance. En
// démonstration, l'expiration des lots échus (action planifiée d'Odoo) est jouée ici.
// F10 (D3, US5) : emails de service, désactivables par le client et par l'administrateur ;
// revérifiés au moment de partir (droits prolongés, bons utilisés → non envoyés).

const JOUR = 24 * 3600_000;

export async function envoyerRappelsFidelite(maintenant = new Date()): Promise<{ droits: number; expirations: number }> {
  const bilan = { droits: 0, expirations: 0 };
  if (modeDuConnecteur("odoo") === "demo") {
    const { expirerBons } = await import("@/connecteurs/odoo/demo/fidelite-admin");
    await expirerBons(maintenant);
  }
  const delaiDroits = await lireParametreEntier("fidelite.rappel_droits_jours", 7);
  const delaiBons = await lireParametreEntier("fidelite.rappel_expiration_jours", 30);
  const odoo = registre.odoo().fidelite;
  let seuilHt = 0;
  try {
    seuilHt = (await odoo.lireReglesProgramme()).seuilDroitsHt;
  } catch (e) {
    if (estErreurConnecteur(e)) return bilan;
    throw e;
  }
  const comptes = await dbSite().compteClient.findMany({ where: { statut: "valide", odooPartnerRef: { not: null } }, include: { utilisateur: true } });
  for (const c of comptes) {
    const ref = c.odooPartnerRef!;
    const email = c.utilisateur.email;
    try {
      const droits = await odoo.lireDroitsAssistance(ref);
      if (droits.statut === "actif" && droits.fin.getTime() - maintenant.getTime() <= delaiDroits * JOUR) {
        if (await marquer(`${ref}:rappel-droits:${droits.fin.toISOString()}`, ref)) {
          await demanderEnvoi(
            {
              modele: "droits_rappel_fin",
              compteId: c.id,
              rendu: await emailsFidelite.rappelFinDroits({ fin: droits.fin, seuilHt, pied: piedPreferences(email, "alerte_droits") }),
              variables: { fin: droits.fin.toISOString() },
              cle: `rappel-droits:${ref}:${droits.fin.toISOString()}`,
              declencheur: "rappel de fin des droits",
            },
            maintenant,
          );
          bilan.droits++;
        }
      }
      const { prochaineExpiration, soldeHt } = await odoo.lireCagnotte(ref);
      if (prochaineExpiration && prochaineExpiration.date.getTime() - maintenant.getTime() <= delaiBons * JOUR) {
        if (await marquer(`${ref}:rappel-expiration:${prochaineExpiration.date.toISOString()}`, ref)) {
          await demanderEnvoi(
            {
              modele: "bons_rappel_expiration",
              compteId: c.id,
              rendu: await emailsFidelite.rappelExpiration({ montantHt: prochaineExpiration.montantHt, date: prochaineExpiration.date, soldeHt, pied: piedPreferences(email, "alerte_bons") }),
              variables: { date: prochaineExpiration.date.toISOString() },
              cle: `rappel-expiration:${ref}:${prochaineExpiration.date.toISOString()}`,
              declencheur: "rappel d'expiration de bons",
            },
            maintenant,
          );
          bilan.expirations++;
        }
      }
    } catch (e) {
      if (!estErreurConnecteur(e)) throw e;
    }
  }
  return bilan;
}
