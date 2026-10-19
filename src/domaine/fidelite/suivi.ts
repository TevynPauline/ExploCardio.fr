import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import type { ChangementFidelite } from "@/connecteurs/odoo/interfaces";
import { dbSite } from "@/lib/db/site";
import { emailsFidelite } from "@/emails/modeles-fidelite";
import { envoyer } from "../commande/notifications";

// Suivi de la fidélité (F06, R7), toutes les 5 minutes : chaque nouveau mouvement de cagnotte,
// changement de droits ou intervention close, calculé par Odoo, est relevé et le client prévenu
// une seule fois (SC-005, SC-006). Le site ne calcule rien (FR-020).

const FENETRE_JOURS = 7;

async function emailDu(partenaireRef: string) {
  return (await dbSite().compteClient.findFirst({ where: { odooPartnerRef: partenaireRef }, include: { utilisateur: true } }))?.utilisateur.email ?? null;
}

/** Marque une clé comme notifiée ; faux si elle l'était déjà. */
export async function marquer(cle: string, partenaireRef: string): Promise<boolean> {
  try {
    await dbSite().suiviFidelite.create({ data: { cle, partenaireRef } });
    return true;
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return false; // déjà notifiée (clé unique)
    throw e;
  }
}

async function notifier(c: ChangementFidelite) {
  const email = await emailDu(c.partenaireRef);
  if (!email) return;
  const cle = `fidelite:${c.partenaireRef}:${c.cle}`;
  if (c.genre === "mouvement") {
    const m = c.mouvement;
    const rendu =
      m.type === "credit"
        ? await emailsFidelite.credit({ montantHt: m.montantHt, commandeRef: m.commandeRef, validiteFin: m.validiteFin })
        : m.type === "retrait"
          ? await emailsFidelite.retrait({ montantHt: -m.montantHt, commandeRef: m.commandeRef })
          : m.type === "restitution"
            ? await emailsFidelite.restitution({ montantHt: m.montantHt, commandeRef: m.commandeRef, validiteFin: m.validiteFin })
            : m.type === "ajustement"
              ? await emailsFidelite.ajustement({ montantHt: m.montantHt, motif: m.motif })
              : null; // utilisation et expiration : pas d'email (confirmation de commande, rappel préalable)
    if (rendu) await envoyer(email, rendu, `fidélité : ${m.type}`, cle);
  } else if (c.genre === "droits") {
    await envoyer(email, await emailsFidelite.droits({ type: c.evenement.type, fin: c.evenement.fin, motif: c.evenement.motif }), `droits : ${c.evenement.type}`, cle);
  } else if (c.intervention.etat === "consommee") {
    await envoyer(email, await emailsFidelite.interventionClose(), "intervention close", cle);
  }
}

export async function suivreFidelite(maintenant = new Date()): Promise<{ notifies: number }> {
  let notifies = 0;
  let changements: ChangementFidelite[];
  try {
    changements = await registre.odoo().fidelite.listerChangementsDepuis(new Date(maintenant.getTime() - FENETRE_JOURS * 24 * 3600_000));
  } catch (e) {
    if (estErreurConnecteur(e)) return { notifies };
    throw e;
  }
  for (const c of changements) {
    // Un mouvement d'une commande rejouée garde sa clé : il n'est jamais notifié deux fois.
    if (!(await marquer(`${c.partenaireRef}:${c.cle}`, c.partenaireRef))) continue;
    await notifier(c);
    notifies++;
  }
  return { notifies };
}
