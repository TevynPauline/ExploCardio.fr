import type { Envoi } from "@generated/site/client";
import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import type { Devis, NiveauRelance } from "@/connecteurs/odoo/interfaces";
import { ribDuSite } from "@/domaine/commande/notifications";
import { urlDuSite } from "@/emails/charte";
import { emailsEmailing } from "@/emails/modeles-emailing";
import type { EmailRendu } from "@/emails/rendu";
import { jourDeParis } from "@/lib/calendrier";
import { dbSite } from "@/lib/db/site";
import { lireParametre } from "@/lib/parametres";
import { demanderEnvoi } from "../envoi";

// Relances d'impayés (F10, US7, FR-020, FR-021, D4) : niveaux lus dans Odoo (relances de
// factures), en jours avant la conséquence. Virement attendu → annulation de la commande à
// l'échéance (F04) ; prélèvement refusé d'une location ou d'un abonnement logiciel → suspension
// au terme du délai de régularisation d'Odoo (F05, F12). Le niveau atteint le plus élevé est
// envoyé une fois ; un niveau dépassé n'est pas rattrapé ; plus rien dès le paiement reçu.
// Emails transactionnels : jamais désactivables.

const JOUR = 24 * 3600_000;

type Creance = {
  type: "virement" | "location";
  ref: string;
  compteId: string;
  partenaireRef: string;
  objet: string;
  montantTtc: number;
  consequence: string;
  dateConsequence: Date;
  /** Prélèvement refusé : l'email immédiat de F05 part ce jour-là ; aucune relance le même jour. */
  debut: Date | null;
};

/** Niveau à envoyer (fonction pure) : le plus élevé atteint, s'il en est un. */
export function niveauAtteint(niveaux: NiveauRelance[], dateConsequence: Date, maintenant: Date): NiveauRelance | null {
  const restant = dateConsequence.getTime() - maintenant.getTime();
  if (restant <= 0) return null;
  const atteints = niveaux.filter((n) => restant <= n.joursAvantConsequence * JOUR);
  return atteints.sort((a, b) => a.joursAvantConsequence - b.joursAvantConsequence)[0] ?? null;
}

async function creancesVirement(compteIds?: string[]): Promise<Creance[]> {
  const commandes = await dbSite().commandeSite.findMany({
    where: { etatAchat: "en_attente_virement", odooCommandeRef: { not: null }, echeanceVirement: { not: null }, ...(compteIds ? { compteId: { in: compteIds } } : {}) },
    include: { compte: { select: { odooPartnerRef: true } } },
  });
  return commandes
    .filter((c) => c.compte.odooPartnerRef)
    .map((c) => ({
      type: "virement" as const,
      ref: c.odooCommandeRef!,
      compteId: c.compteId,
      partenaireRef: c.compte.odooPartnerRef!,
      objet: `commande ${c.odooCommandeRef}`,
      montantTtc: (c.devis as Devis | null)?.achat?.totalTtc ?? 0,
      consequence: "la commande sera annulée",
      dateConsequence: c.echeanceVirement!,
      debut: null,
    }));
}

async function creancesLocation(compteIds?: string[]): Promise<Creance[]> {
  const suivis = await dbSite().suiviLocation.findMany({ where: { impayeNotifie: true, impayeDepuis: { not: null } } });
  if (!suivis.length) return [];
  const { delaiRegularisationJours } = await registre.odoo().location.lireRegles();
  const resultat: Creance[] = [];
  for (const s of suivis) {
    const compte = await dbSite().compteClient.findFirst({ where: { odooPartnerRef: s.partenaireRef, ...(compteIds ? { id: { in: compteIds } } : {}) }, select: { id: true } });
    if (!compte) continue;
    const location = (await registre.odoo().location.listerLocations(s.partenaireRef)).find((l) => l.ref === s.abonnementRef);
    if (!location?.impaye || location.etat === "suspendue_impaye") continue;
    resultat.push({
      type: "location",
      ref: location.ref,
      compteId: compte.id,
      partenaireRef: s.partenaireRef,
      objet: location.objet === "logiciel" ? `abonnement ${location.libelle}` : `mise à disposition ${location.libelle}`,
      montantTtc: Math.round(location.montantMensuelHt * 1.2),
      consequence: location.objet === "logiciel" ? "votre accès au logiciel sera suspendu" : "la mise à disposition et l'accès au logiciel associé seront suspendus",
      dateConsequence: new Date(s.impayeDepuis!.getTime() + delaiRegularisationJours * JOUR),
      debut: s.impayeDepuis,
    });
  }
  return resultat;
}

export async function programmerImpayes(maintenant = new Date(), options: { compteIds?: string[] } = {}): Promise<{ relances: number }> {
  if ((await lireParametre("emailing.impayes.actif")) === "false") return { relances: 0 };
  let niveaux: NiveauRelance[];
  let creances: Creance[];
  try {
    niveaux = await registre.odoo().factures.lireNiveauxRelance();
    creances = [...(await creancesVirement(options.compteIds)), ...(await creancesLocation(options.compteIds))];
  } catch (e) {
    if (estErreurConnecteur(e)) return { relances: 0 };
    throw e;
  }
  let relances = 0;
  for (const c of creances) {
    if (c.debut && jourDeParis(c.debut) === jourDeParis(maintenant)) continue;
    const n = niveauAtteint(niveaux, c.dateConsequence, maintenant);
    if (!n) continue;
    if (c.type === "virement") {
      // Le virement a pu arriver dans Odoo avant le passage du suivi des virements.
      const statut = (await registre.odoo().commandes.lireCommande(c.ref).catch(() => null))?.statut;
      if (statut !== "en_attente_paiement") continue;
    }
    const { etat } = await demanderEnvoi(
      {
        modele: "relance_impaye",
        compteId: c.compteId,
        variables: {
          type: c.type,
          ref: c.ref,
          objet: c.objet,
          montant: c.montantTtc,
          consequence: c.consequence,
          dateConsequence: c.dateConsequence.toISOString(),
          niveau: n.niveau,
          libelle: n.libelle,
          annonce: n.annonceConsequence,
        },
        cle: `impaye:${c.type}:${c.ref}:${c.dateConsequence.toISOString().slice(0, 10)}:${n.niveau}`,
        declencheur: `relance de paiement (niveau ${n.niveau})`,
      },
      maintenant,
    );
    if (etat !== "annule") relances++;
  }
  return { relances };
}

type Variables = { type: "virement" | "location"; ref: string; objet: string; montant: number; consequence: string; dateConsequence: string; niveau: number; libelle?: string; annonce: boolean };
const variables = (envoi: Envoi) => envoi.variables as unknown as Variables;

/** Toujours dû : virement non reçu, prélèvement non régularisé, et conséquence pas encore arrivée. */
export async function objetValide(envoi: Envoi, maintenant: Date): Promise<boolean> {
  const v = variables(envoi);
  if (new Date(v.dateConsequence) <= maintenant) return false;
  if (v.type === "virement") return (await registre.odoo().commandes.lireCommande(v.ref)).statut === "en_attente_paiement";
  const compte = envoi.compteId ? await dbSite().compteClient.findUnique({ where: { id: envoi.compteId }, select: { odooPartnerRef: true } }) : null;
  if (!compte?.odooPartnerRef) return false;
  const l = (await registre.odoo().location.listerLocations(compte.odooPartnerRef)).find((x) => x.ref === v.ref);
  return Boolean(l?.impaye && l.etat !== "suspendue_impaye");
}

export async function rendre(envoi: Envoi): Promise<EmailRendu> {
  const v = variables(envoi);
  let regulariser: string;
  if (v.type === "virement") {
    const rib = await ribDuSite();
    regulariser = `Effectuez votre virement en rappelant la référence ${v.ref} : titulaire ${rib.titulaire}, IBAN ${rib.iban}, BIC ${rib.bic}. Vous pouvez aussi nous appeler pour régler par carte.`;
  } else {
    regulariser = "Le prélèvement a été refusé par votre banque. Mettez à jour votre moyen de paiement depuis votre compte, ou appelez-nous : nous relancerons le prélèvement.";
  }
  return emailsEmailing.relanceImpaye({
    niveau: v.libelle ?? (v.annonce ? "Dernier rappel" : "Rappel"),
    objet: v.objet,
    montantTtc: v.montant,
    consequence: v.consequence,
    dateConsequence: new Date(v.dateConsequence),
    annonce: v.annonce,
    regulariser,
    lien: urlDuSite(v.type === "virement" ? "/mon-compte/commandes" : "/mon-compte/locations"),
    libelleLien: v.type === "virement" ? "Voir ma commande" : "Voir mes locations",
  });
}
