import type { Envoi } from "@generated/site/client";
import { registre } from "@/connecteurs/registre";
import type { EmailRendu } from "@/emails/rendu";
import { dbSite } from "@/lib/db/site";

// Alertes de fin des droits d'assistance et d'expiration des bons (F10, US5, FR-010) : rendues
// par F06 au moment de la programmation ; au moment de partir, l'objet est revérifié dans Odoo.
// Droits prolongés depuis, ou bons utilisés : l'alerte n'a plus d'objet et n'est pas envoyée.

async function partenaire(envoi: Envoi): Promise<string | null> {
  if (!envoi.compteId) return null;
  return (await dbSite().compteClient.findUnique({ where: { id: envoi.compteId }, select: { odooPartnerRef: true } }))?.odooPartnerRef ?? null;
}

const variable = (envoi: Envoi, nom: string) => ((envoi.variables ?? {}) as Record<string, string | undefined>)[nom];

export const alerteDroits = {
  async objetValide(envoi: Envoi): Promise<boolean> {
    const ref = await partenaire(envoi);
    const fin = variable(envoi, "fin");
    if (!ref || !fin) return true;
    const droits = await registre.odoo().fidelite.lireDroitsAssistance(ref);
    return droits.statut === "actif" && droits.fin.toISOString() === fin;
  },
  rendre(): Promise<EmailRendu> {
    throw new Error("L'alerte de fin des droits est rendue lors de sa programmation.");
  },
};

export const alerteBons = {
  async objetValide(envoi: Envoi): Promise<boolean> {
    const ref = await partenaire(envoi);
    const date = variable(envoi, "date");
    if (!ref || !date) return true;
    const { prochaineExpiration } = await registre.odoo().fidelite.lireCagnotte(ref);
    return prochaineExpiration?.date.toISOString() === date;
  },
  rendre(): Promise<EmailRendu> {
    throw new Error("L'alerte d'expiration des bons est rendue lors de sa programmation.");
  },
};
