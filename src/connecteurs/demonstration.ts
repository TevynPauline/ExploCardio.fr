import { dbDemo } from "@/lib/db/demo";
import { dbSite } from "@/lib/db/site";
import { modeDuConnecteur, modeDuSite } from "@/lib/config";
import { verifierModeDemonstration } from "@/lib/demo/garde";
import { leverVerrou, poserVerrou } from "@/lib/demo/verrou";
import { remplirJeuDeDepart, type BilanRemplissage } from "../../prisma/demo/seed/remplissage";
import * as administration from "./odoo/demo/administration";
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
      site.panneSimulee.deleteMany(),
      site.evenementPaiementTraite.deleteMany(),
      // F01 : inscriptions à la newsletter et limites d'envoi, données de test en phase 1
      site.inscriptionNewsletter.deleteMany(),
      site.limiteEnvoi.deleteMany(),
      // F03 : paniers des séances (les lignes suivent) ; contenus et sous-catégories conservés
      site.panier.deleteMany(),
    ]);
    const bilan = await remplirJeuDeDepart(dbDemo(), site);
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
