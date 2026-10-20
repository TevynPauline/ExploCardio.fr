import type { Envoi } from "@generated/site/client";
import { ServiceUnavailable } from "@/connecteurs/erreurs";
import { panierDetaille } from "@/domaine/commande/devis";
import { urlDuSite } from "@/emails/charte";
import { emailsEmailing } from "@/emails/modeles-emailing";
import type { EmailRendu } from "@/emails/rendu";
import { dbSite } from "@/lib/db/site";
import { lireParametre, lireParametreEntier } from "@/lib/parametres";
import { demanderEnvoi } from "../envoi";
import { piedPreferences } from "../liens";

// Panier en attente (F10, US6, FR-018, FR-019) : un seul rappel, pour un client connecté, après
// le délai fixé (24 heures par défaut) sans modification ni commande. Rendu au moment de
// l'envoi : prix et disponibilités du moment, sans promettre un prix qui aurait changé. Un
// panier modifié puis laissé de nouveau peut donner lieu à un nouveau rappel.

const HEURE = 3600_000;
/** Au-delà, un panier ancien n'est plus rappelé (mise en ligne, longue absence). */
const ANCIENNETE_MAX_HEURES = 7 * 24;

export async function programmerPaniers(maintenant = new Date(), options: { compteIds?: string[] } = {}): Promise<{ rappels: number }> {
  if ((await lireParametre("emailing.panier.actif")) === "false") return { rappels: 0 };
  const delai = await lireParametreEntier("emailing.panier.delai_heures", 24);
  const paniers = await dbSite().panier.findMany({
    where: {
      compteId: options.compteIds ? { in: options.compteIds } : { not: null },
      compte: { statut: "valide" },
      lignes: { some: {} },
      modifieLe: { lte: new Date(maintenant.getTime() - delai * HEURE), gte: new Date(maintenant.getTime() - ANCIENNETE_MAX_HEURES * HEURE) },
    },
    select: { id: true, compteId: true, modifieLe: true },
  });
  let rappels = 0;
  for (const p of paniers) {
    // Une commande commencée ou passée depuis la dernière modification : pas de rappel.
    const commande = await dbSite().commandeSite.findFirst({ where: { compteId: p.compteId!, modifieLe: { gte: p.modifieLe } }, select: { id: true } });
    if (commande) continue;
    const { etat } = await demanderEnvoi(
      {
        modele: "panier_abandonne",
        compteId: p.compteId!,
        variables: { panierId: p.id, modifieLe: p.modifieLe.toISOString() },
        cle: `panier:${p.id}:${p.modifieLe.toISOString()}`,
        declencheur: "panier en attente",
      },
      maintenant,
    );
    if (etat !== "annule") rappels++;
  }
  return { rappels };
}

const variables = (envoi: Envoi) => (envoi.variables ?? {}) as { panierId?: string; modifieLe?: string };

/** Le panier existe encore, n'a pas changé et n'est pas vide. */
export async function objetValide(envoi: Envoi): Promise<boolean> {
  const v = variables(envoi);
  if (!v.panierId) return false;
  const p = await dbSite().panier.findUnique({ where: { id: v.panierId }, select: { modifieLe: true, _count: { select: { lignes: true } } } });
  return Boolean(p && p._count.lignes > 0 && p.modifieLe.toISOString() === v.modifieLe);
}

export async function rendre(envoi: Envoi): Promise<EmailRendu> {
  const detail = await panierDetaille(variables(envoi).panierId!, envoi.compteId);
  if (detail.indisponible) throw new ServiceUnavailable("Odoo", { rendu: "panier en attente" });
  return emailsEmailing.panier({
    lignes: detail.lignes.map((l) => ({
      libelle: l.libelle,
      quantite: l.quantite,
      prixUnitaireHt: l.prixUnitaireHt,
      miseADisposition: l.formule === "mise_a_disposition",
      disponibilite: l.indisponible ? "indisponible" : l.delaiJours ? `expédié sous ${l.delaiJours} jours` : "disponible",
    })),
    lien: urlDuSite("/panier"),
    pied: piedPreferences(envoi.destinataire, "panier_abandonne"),
  });
}
