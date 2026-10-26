import { dbDemo } from "@/lib/db/demo";
import { dbSite } from "@/lib/db/site";
import { modeDuConnecteur, modeDuSite } from "@/lib/config";
import { verifierModeDemonstration } from "@/lib/demo/garde";
import { leverVerrou, poserVerrou } from "@/lib/demo/verrou";
import { remplirJeuDeDepart, type BilanRemplissage } from "../../prisma/demo/seed/remplissage";
import * as administration from "./odoo/demo/administration";
import { ValeurRefusee } from "./odoo/demo/administration";
import * as locationsAdmin from "./odoo/demo/locations-admin";
import * as fideliteAdmin from "./odoo/demo/fidelite-admin";
import * as emission from "./stripe/demo/emission";
import { invaliderIndexRecherche } from "@/domaine/recherche/index";
import { definirPanne, panneActive } from "./panne-simulee";
import { CONNECTEURS, type NomConnecteur } from "@/lib/config";
import { registre } from "./registre";

export { ValeurRefusee, type ModificationStock, type ParametresCommerciaux } from "./odoo/demo/administration";

// Opérations réservées au mode démonstration (contracts/odoo.md, « Opérations réservées au
// mode démonstration ») : elles ne font pas partie du contrat commun et n'existent pas en mode
// réel. Appelées par l'écran de démonstration du back-office et par les commandes de l'équipe.

export function outilsDemonstrationDisponibles(): boolean {
  return modeDuSite() === "demo" && modeDuConnecteur("odoo") === "demo";
}

export type Auteur = { id: string | null; libelle: string };

/**
 * Réinitialisation (FR-019 à FR-023, data-model.md §4) : remet à l'état de départ la base de
 * démonstration et l'activité de test du site ; conserve contenus, contenus produits,
 * paramètres et leur historique, journal des actions et comptes de l'équipe.
 */
export async function reinitialiserDemonstration(auteur: Auteur): Promise<BilanRemplissage> {
  verifierModeDemonstration("réinitialisation");
  await poserVerrou();
  try {
    const site = dbSite();
    await site.$transaction([
      site.demandeFinancement.deleteMany(),
      site.demandeDevis.deleteMany(),
      site.messageContact.deleteMany(),
      site.messageDemonstration.deleteMany(),
      // F10 : envois des séances ; leurs clés citent les références fictives, qui repartent de
      // zéro (sinon un email d'une nouvelle commande au même numéro serait pris pour un doublon).
      site.envoi.deleteMany(),
      site.panneSimulee.deleteMany(),
      site.evenementPaiementTraite.deleteMany(),
      // F01 : inscriptions à la newsletter et limites d'envoi, données de test en phase 1
      site.inscriptionNewsletter.deleteMany(),
      site.limiteEnvoi.deleteMany(),
      // F03 : paniers des séances (les lignes suivent) ; contenus et sous-catégories conservés
      site.panier.deleteMany(),
      // F04 : commandes du site et suivis des séances (les demandes de financement sont supprimées plus haut)
      site.commandeSite.deleteMany(),
      site.suiviCommande.deleteMany(),
      // F05 : suivis des locations des séances
      site.suiviLocation.deleteMany(),
      // F06 : suivis de fidélité des séances
      site.suiviFidelite.deleteMany(),
      // F12 : registre des accès Cloud et tâches de l'équipe (repris de la plateforme ci-dessous)
      site.tacheAcces.deleteMany(),
      site.accesLogiciel.deleteMany(),
    ]);
    const bilan = await remplirJeuDeDepart(dbDemo(), site);
    const { reprendreAccesExistants } = await import("@/domaine/cloud/acces");
    await reprendreAccesExistants();
    await site.journalAction.create({
      data: {
        auteurId: auteur.id,
        auteur: auteur.libelle,
        action: "demo.reinitialisation",
        detail: { dureeMs: bilan.dureeMs },
      },
    });
    return bilan;
  } finally {
    await leverVerrou();
  }
}

/** Inscrit une modification de l'écran de démonstration dans le journal des actions (T064). */
async function journaliser(auteur: Auteur, action: string, objet: string, avant: unknown, apres: unknown) {
  await dbSite().journalAction.create({
    data: {
      auteurId: auteur.id,
      auteur: auteur.libelle,
      action,
      objet,
      detail: JSON.parse(JSON.stringify({ avant, apres })),
    },
  });
}

function exigerOutils() {
  if (!outilsDemonstrationDisponibles()) {
    throw new Error("Les outils de démonstration n'existent pas quand le connecteur Odoo est en mode réel (FR-027).");
  }
}

/** Écran de démonstration (US5) : consultation et modifications des données fictives. */
export const ecranDemonstration = {
  apercu: () => {
    exigerOutils();
    return administration.apercuBase();
  },
  lireParametresCommerciaux: () => {
    exigerOutils();
    return administration.lireParametresCommerciaux();
  },
  async modifierPrix(auteur: Auteur, defaultCode: string, prixHtCentimes: number) {
    exigerOutils();
    const r = await administration.modifierPrix(defaultCode, prixHtCentimes);
    invaliderIndexRecherche();
    await journaliser(auteur, "demo.prix", defaultCode, r.avant, r.apres);
  },
  async modifierStock(auteur: Auteur, defaultCode: string, m: administration.ModificationStock) {
    exigerOutils();
    const r = await administration.modifierStock(defaultCode, m);
    invaliderIndexRecherche();
    await journaliser(auteur, "demo.stock", defaultCode, r.avant, r.apres);
  },
  async modifierOffreMad(auteur: Auteur, defaultCode: string, premierMois: number, moisSuivants: number) {
    exigerOutils();
    const r = await administration.modifierOffreMad(defaultCode, premierMois, moisSuivants);
    invaliderIndexRecherche();
    await journaliser(auteur, "demo.offre_mad", defaultCode, r.avant, r.apres);
  },
  async modifierRemisePromotion(auteur: Auteur, id: number, remisePourcent: number) {
    exigerOutils();
    const r = await administration.modifierRemisePromotion(id, remisePourcent);
    invaliderIndexRecherche();
    await journaliser(auteur, "demo.promotion", String(id), r.avant, r.apres);
  },
  async modifierParametresCommerciaux(auteur: Auteur, p: administration.ParametresCommerciaux) {
    exigerOutils();
    const r = await administration.modifierParametresCommerciaux(p);
    await fideliteAdmin.synchroniserPrixActe();
    await journaliser(auteur, "demo.parametres_commerciaux", "fidelite_et_assistance", r.avant, r.apres);
  },
};

export function pagePaiementDemoDisponible(): boolean {
  return modeDuSite() === "demo" && modeDuConnecteur("stripe") === "demo";
}

function exigerPaiementDemo() {
  if (!pagePaiementDemoDisponible()) {
    throw new Error("La page de paiement de démonstration n'existe pas quand le connecteur Stripe est en mode réel.");
  }
}

/** Page de paiement de démonstration et simulations de l'écran de démonstration (US7). */
export const paiementDemo = {
  lireSession: (id: string) => {
    exigerPaiementDemo();
    return emission.lireSession(id);
  },
  choisirIssue: (...args: Parameters<typeof emission.choisirIssue>) => {
    exigerPaiementDemo();
    return emission.choisirIssue(...args);
  },
  /** Ouvre une session de paiement de test pour un client de démonstration. */
  async ouvrirPaiementDeTest(montantTtc: number, moyens: ("carte" | "sepa")[]) {
    exigerPaiementDemo();
    const n = Date.now();
    return registre.stripe().ouvrirSessionPaiement(
      {
        commandeRef: `FICT-TEST-${n}`,
        montantTtc,
        moyens,
        client: { partenaireRef: "FICT-P-00001", email: "client.droits@demo.explocardio.test" },
        urlRetour: "/admin/demonstration/paiements",
        urlAnnulation: "/admin/demonstration/paiements",
      },
      `paiement-de-test:${n}`,
    );
  },
  async simulerEcheance(auteur: Auteur, abonnementRef: string, payee: boolean) {
    exigerPaiementDemo();
    exigerOutils();
    const abonnement = await dbDemo().abonnement.findUnique({ where: { ref: abonnementRef } });
    if (!abonnement) throw new administration.ValeurRefusee(`Abonnement introuvable : ${abonnementRef}.`);
    const ttc = Math.round(abonnement.montantMensuelCentimes * 1.2);
    await emission.simulerEcheance(abonnementRef, ttc, payee);
    await journaliser(auteur, payee ? "demo.echeance_payee" : "demo.echeance_refusee", abonnementRef, null, { montantTtc: ttc });
  },
  async simulerRemboursement(auteur: Auteur, paiementRef: string, montantTtc: number, motif: string) {
    exigerPaiementDemo();
    if (!(montantTtc > 0)) throw new administration.ValeurRefusee("Remboursement : le montant doit être positif.");
    await emission.simulerRemboursement(paiementRef, montantTtc, motif, (cle) =>
      registre.stripe().rembourser({ paiementRef, montantTtc, motif }, cle),
    );
    await journaliser(auteur, "demo.remboursement", paiementRef, null, { montantTtc, motif });
  },
  listerPaiementsAcceptes: () => {
    exigerPaiementDemo();
    return emission.listerPaiementsAcceptes();
  },
  listerAbonnements: () => {
    exigerOutils();
    return dbDemo().abonnement.findMany({
      where: { etat: { in: ["en_cours", "resiliation_prevue"] } },
      include: { partenaire: true, variante: { include: { modele: true } } },
      orderBy: { ref: "asc" },
    });
  },
};

/** Pannes simulées (FR-025) : une par connecteur, journalisées. */
export const pannesDemo = {
  async lire(): Promise<Record<NomConnecteur, boolean>> {
    exigerOutils();
    const etats = await Promise.all(CONNECTEURS.map(async (c) => [c, await panneActive(c)] as const));
    return Object.fromEntries(etats) as Record<NomConnecteur, boolean>;
  },
  async definir(auteur: Auteur, connecteur: NomConnecteur, active: boolean) {
    exigerOutils();
    await definirPanne(connecteur, active);
    await journaliser(auteur, active ? "demo.panne_activee" : "demo.panne_desactivee", connecteur, null, { active });
  },
};

/**
 * Cycle des commandes en démonstration (F04) : ce que l'équipe fait dans Odoo en mode réel
 * (virement reçu, expédition, livraison, remboursement décidé). Chaque action est journalisée.
 */
export const commandesDemo = {
  lister: () => {
    exigerOutils();
    return administration.listerCommandesRecentes();
  },
  async virementRecu(auteur: Auteur, ref: string, montantTtc: number) {
    exigerOutils();
    const r = await administration.virementRecu(ref, montantTtc);
    await journaliser(auteur, "demo.virement_recu", ref, null, { montantTtc, ecart: r.ecart });
    return r;
  },
  async marquerExpediee(auteur: Auteur, ref: string, transporteur: string, suivi: string) {
    exigerOutils();
    await administration.marquerExpediee(ref, transporteur, suivi);
    await journaliser(auteur, "demo.commande_expediee", ref, null, { transporteur, suivi });
  },
  async marquerLivree(auteur: Auteur, ref: string) {
    exigerOutils();
    await administration.marquerLivree(ref);
    await journaliser(auteur, "demo.commande_livree", ref, null, {});
  },
  async deciderRemboursement(auteur: Auteur, ref: string, montantTtc: number, motif: string) {
    exigerOutils();
    await administration.deciderRemboursement(ref, montantTtc, motif);
    await journaliser(auteur, "demo.remboursement_decide", ref, null, { montantTtc, motif });
  },
};

/** Cycle des locations (F05) : ce que l'équipe fait dans Odoo, et ses actions planifiées. */
export const locationsDemo = {
  lister: () => {
    exigerOutils();
    return locationsAdmin.listerLocationsRecentes();
  },
  appareilsDisponibles: (defaultCode: string) => {
    exigerOutils();
    return locationsAdmin.appareilsDisponibles(defaultCode);
  },
  async preparerExpedition(auteur: Auteur, ref: string, transporteur: string, suivi: string, numeroSerie?: string) {
    exigerOutils();
    await locationsAdmin.preparerExpedition(ref, transporteur, suivi, numeroSerie);
    await journaliser(auteur, "demo.location_expediee", ref, null, { transporteur, suivi, numeroSerie: numeroSerie ?? null });
  },
  async signalerAppareilDefectueux(auteur: Auteur, ref: string) {
    exigerOutils();
    const r = await locationsAdmin.signalerAppareilDefectueux(ref);
    await journaliser(auteur, "demo.location_appareil_defectueux", ref, null, r);
    return r;
  },
  async colisNonLivre(auteur: Auteur, ref: string) {
    exigerOutils();
    await locationsAdmin.colisNonLivre(ref);
    await journaliser(auteur, "demo.location_colis_non_livre", ref, null, {});
  },
  async marquerLivree(auteur: Auteur, ref: string) {
    exigerOutils();
    await locationsAdmin.marquerLivree(ref);
    await journaliser(auteur, "demo.location_livree", ref, null, {});
  },
  async enregistrerRetour(auteur: Auteur, ref: string, etat: "complet" | "degrade" | "perdu", appareil: "disponible" | "en_maintenance", degradationHt: number) {
    exigerOutils();
    await locationsAdmin.enregistrerRetour(ref, etat, appareil, degradationHt);
    await journaliser(auteur, "demo.location_retour", ref, null, { etat, appareil, degradationHt });
  },
  async enregistrerKit(auteur: Auteur, partenaireRef: string, kit: string) {
    exigerOutils();
    await locationsAdmin.enregistrerKit(partenaireRef, kit, auteur.libelle);
    await journaliser(auteur, "demo.kit_enregistre", partenaireRef, null, { kit });
  },
  async echouerPrelevement(auteur: Auteur, ref: string) {
    exigerOutils();
    await locationsAdmin.echouerPrelevement(ref);
    await journaliser(auteur, "demo.location_prelevement_echoue", ref, null, {});
  },
  async regulariser(auteur: Auteur, ref: string) {
    exigerOutils();
    await locationsAdmin.regulariser(ref);
    await journaliser(auteur, "demo.location_regularisee", ref, null, {});
  },
  /** Actions planifiées d'Odoo à une date ; les échéances dues sont prélevées par Stripe (démonstration). */
  async avancerJusquA(auteur: Auteur, date: Date) {
    exigerOutils();
    const { echeancesDues } = await locationsAdmin.executerActionsPlanifiees(date);
    for (const e of echeancesDues) {
      await emission.simulerEcheance(e.ref, Math.round((e.montantMensuelHt * (100 + e.tauxTva)) / 100), true);
    }
    await journaliser(auteur, "demo.actions_planifiees", date.toISOString(), null, { echeances: echeancesDues.map((e) => e.ref) });
    return { echeances: echeancesDues.length };
  },
  async modifierRegles(auteur: Auteur, r: Parameters<typeof locationsAdmin.modifierReglesLocation>[0]) {
    exigerOutils();
    const { avant, apres } = await locationsAdmin.modifierReglesLocation(r);
    await journaliser(auteur, "demo.regles_location", "rental_settings", avant, apres);
  },
};

/** Programme de fidélité (F06) : ce que l'équipe fera dans Odoo. */
export const fideliteDemoOps = {
  async ajusterCagnotte(auteur: Auteur, partenaireRef: string, montantCentimes: number, motif: string) {
    exigerOutils();
    await fideliteAdmin.ajusterCagnotte(partenaireRef, montantCentimes, motif, auteur.libelle);
    await journaliser(auteur, "demo.cagnotte_ajustee", partenaireRef, null, { montantCentimes, motif });
  },
  async ajusterDroits(auteur: Auteur, partenaireRef: string, fin: Date, motif: string) {
    exigerOutils();
    await fideliteAdmin.ajusterDroits(partenaireRef, fin, motif, auteur.libelle);
    await journaliser(auteur, "demo.droits_ajustes", partenaireRef, null, { fin, motif });
  },
  listerInterventionsOuvertes: () => {
    exigerOutils();
    return fideliteAdmin.listerInterventionsOuvertes();
  },
  async cloreIntervention(auteur: Auteur, id: number) {
    exigerOutils();
    await fideliteAdmin.cloreIntervention(id, auteur.libelle);
    await journaliser(auteur, "demo.intervention_close", String(id), null, {});
  },
  async expirerBons(auteur: Auteur, date: Date) {
    exigerOutils();
    const n = await fideliteAdmin.expirerBons(date);
    await journaliser(auteur, "demo.bons_expires", date.toISOString(), null, { lots: n });
    return n;
  },
  listerPromotions: () => {
    exigerOutils();
    return fideliteAdmin.listerPromotions();
  },
  async creerPromotion(auteur: Auteur, p: fideliteAdmin.NouvellePromotion) {
    exigerOutils();
    const promo = await fideliteAdmin.creerPromotion(p);
    await journaliser(auteur, "demo.promotion_creee", String(promo.id), null, p);
  },
  async terminerPromotion(auteur: Auteur, id: number) {
    exigerOutils();
    await fideliteAdmin.terminerPromotion(id);
    await journaliser(auteur, "demo.promotion_terminee", String(id), null, {});
  },
};

/** F12 : sous-mode de la plateforme Cloud simulée (réglage de l'écran de démonstration). */
export async function sousModePlateformeDemo(): Promise<"auto" | "manual"> {
  const { sousModeDemo } = await import("./pca/demo");
  return sousModeDemo();
}

/** F10 : niveaux de relance des impayés (ce que l'équipe réglera dans les relances de factures d'Odoo). */
export const relancesDemo = {
  async modifierNiveaux(auteur: Auteur, niveaux: { niveau: number; joursAvantConsequence: number }[]) {
    exigerOutils();
    const jours = niveaux.map((n) => n.joursAvantConsequence);
    if (jours.some((j) => !Number.isInteger(j) || j < 1 || j > 60)) throw new ValeurRefusee("Chaque niveau : entre 1 et 60 jours avant la conséquence.");
    if (jours.some((j, i) => i > 0 && j >= jours[i - 1]!)) throw new ValeurRefusee("Chaque niveau doit être plus proche de la conséquence que le précédent.");
    for (const n of niveaux) await dbDemo().niveauRelance.update({ where: { niveau: n.niveau }, data: { joursAvantConsequence: n.joursAvantConsequence } });
    await journaliser(auteur, "demo.niveaux_relance", "followup_line", null, { niveaux });
  },
};

/** F10 : historique de commandes régulières (relance de réapprovisionnement) et scénarios à la demande. */
export const emailingDemoOps = {
  async simulerCommandesRegulieres(auteur: Auteur, h: import("./odoo/demo/commandes-admin").HistoriqueRegulier) {
    exigerOutils();
    const { simulerCommandesRegulieres } = await import("./odoo/demo/commandes-admin");
    const refs = await simulerCommandesRegulieres(h);
    await journaliser(auteur, "demo.commandes_regulieres", h.partenaireRef, null, { ...h, commandes: refs });
    return refs;
  },
  async lancerScenarios(auteur: Auteur) {
    exigerOutils();
    const { traiterTousLesScenarios } = await import("@/domaine/emailing/scenarios");
    const { releverEnvois } = await import("@/domaine/emailing/envoi");
    const bilan = await traiterTousLesScenarios();
    await releverEnvois();
    await journaliser(auteur, "demo.scenarios_emails_lances", "emailing", null, bilan);
    return bilan;
  },
};
