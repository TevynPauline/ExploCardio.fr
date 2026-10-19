import { NotFound } from "../../erreurs";
import type {
  ChangementCommande,
  Commande,
  CommandesOdoo,
  DemandeDevis,
  EnregistrementRemboursement,
  NouvelleCommande,
  RemboursementAExecuter,
  ResumeCommande,
  StatutCommande,
} from "../interfaces";
import { calculerDevis } from "./devis";
import { ajouterJours, db, prochaineReference, prochainNumeroFacture, type Tx } from "./outils";
import { appliquerReglesTx, ARTICLE_ASSISTANCE_ACTE, utiliserBons } from "./fidelite";
import { decompterStock } from "./stock";

// Domaine « Commandes » en démonstration (contracts/odoo.md §4, complété par F04).
// Les montants viennent du devis (F04, R1) : la commande facture ce qui a été affiché.
// Une commande payée crée sa facture (numérotation continue, mention FICTIVE au PDF) ; une
// commande « financée » n'en donne aucune au client (F04, FR-047).

function statutPublic(statut: string): StatutCommande {
  return (statut === "brouillon" || statut === "confirmee" ? "payee" : statut) as StatutCommande;
}

type Creation = { statut: "payee" | "en_attente_paiement"; echeance: Date | null };

/** Consomme une réservation faite avant le paiement, ou décompte le stock. */
async function sortirStock(tx: Tx, c: NouvelleCommande) {
  const reservees = c.reservationCle ? await tx.reservation.findMany({ where: { cle: c.reservationCle } }) : [];
  if (reservees.length) {
    await tx.reservation.deleteMany({ where: { cle: c.reservationCle } });
    // Lignes ajoutées depuis la réservation (cadeau de bienvenue, par exemple) : décomptées.
    const reste = c.lignes
      .map((l) => ({ ...l, quantite: l.quantite - reservees.filter((r) => r.defaultCode === l.defaultCode).reduce((s, r) => s + r.quantite, 0) }))
      .filter((l) => l.quantite > 0);
    if (reste.length) await decompterStock(tx, reste);
    return;
  }
  await decompterStock(tx, c.lignes);
}

async function creerFacture(tx: Tx, commandeId: number, date: Date) {
  const c = await tx.commandeVente.findUniqueOrThrow({ where: { id: commandeId }, include: { lignes: { include: { variante: { include: { modele: true } } } } } });
  return tx.facture.create({
    data: {
      numero: await prochainNumeroFacture(tx, date),
      type: "facture",
      partenaireId: c.partenaireId,
      commandeId: c.id,
      date,
      montantHtCentimes: c.montantHtCentimes,
      tvaCentimes: c.tvaCentimes,
      montantTtcCentimes: c.montantTtcCentimes,
      etatPaiement: "paye",
      lignes: [
        ...c.lignes.map((l) => ({
          libelle: `${l.variante.modele.marque} ${l.variante.modele.nom}${l.variante.configuration ? ` — ${l.variante.configuration}` : ""}${l.prixUnitaireHtCentimes === 0 ? " (offert)" : ""}`,
          reference: l.variante.defaultCode,
          quantite: l.quantite,
          prixUnitaireHtCentimes: l.prixUnitaireHtCentimes,
          remiseCentimes: l.remiseCentimes,
          totalHtCentimes: l.prixUnitaireHtCentimes * l.quantite - l.remiseCentimes,
        })),
        ...(c.fraisPortCentimes > 0
          ? [{ libelle: "Livraison", reference: "PORT", quantite: 1, prixUnitaireHtCentimes: c.fraisPortCentimes, remiseCentimes: 0, totalHtCentimes: c.fraisPortCentimes }]
          : []),
        ...(c.bonsUtilisesCentimes > 0
          ? [{ libelle: "Bons d'achat utilisés", reference: "BONS", quantite: 1, prixUnitaireHtCentimes: -c.bonsUtilisesCentimes, remiseCentimes: 0, totalHtCentimes: -c.bonsUtilisesCentimes }]
          : []),
      ],
    },
  });
}

export async function creerCommande(tx: Tx, c: NouvelleCommande, cle: string, date = new Date(), creation: Creation = { statut: "payee", echeance: null }) {
  const deja = await tx.commandeVente.findUnique({ where: { cle } });
  if (deja) return { ref: deja.ref, id: deja.id, creee: false, echeance: deja.echeancePaiement };

  const partenaire = await tx.partenaire.findUnique({ where: { ref: c.partenaireRef } });
  if (!partenaire) throw new NotFound("Partenaire", c.partenaireRef);

  const demande: DemandeDevis = {
    partenaireRef: c.partenaireRef,
    lignes: c.lignes.map((l) => ({ defaultCode: l.defaultCode, formule: "achat", quantite: l.quantite, offerte: l.offerte })),
    codePromo: c.codePromo ?? null,
    bonsDemandesHt: c.bonsUtilisesHt ?? 0,
    modeLivraison: c.livraison.mode ?? null,
  };
  const devis = await calculerDevis(demande, tx, {
    maintenant: date,
    ...(c.livraison.mode ? {} : { fraisPortImposeHt: c.livraison.fraisPortHt ?? 0 }),
  });
  const achat = devis.achat!;

  await sortirStock(tx, c);

  const variantes = await tx.variante.findMany({ where: { defaultCode: { in: devis.lignes.map((l) => l.defaultCode) } } });
  const ref = await prochaineReference(tx, "SO");
  const financee = c.paiement.mode === "financement";
  const commande = await tx.commandeVente.create({
    data: {
      ref,
      cle,
      partenaireId: partenaire.id,
      date,
      montantHtCentimes: achat.totalHt,
      tvaCentimes: achat.tva,
      montantTtcCentimes: achat.totalTtc,
      fraisPortCentimes: achat.fraisPortHt + achat.fraisSpecifiquesHt,
      bonsUtilisesCentimes: achat.bonsHt,
      codePromo: devis.codePromo?.applique ? devis.codePromo.code : null,
      modePaiement: c.paiement.mode,
      referencePaiement: c.paiement.reference,
      statut: creation.statut,
      echeancePaiement: creation.echeance,
      financee,
      livraison: { ...c.livraison, mode: devis.modeLivraison, fraisPortHt: achat.fraisPortHt, fraisSpecifiquesHt: achat.fraisSpecifiquesHt },
      lignes: {
        create: devis.lignes.map((l) => ({
          varianteId: variantes.find((v) => v.defaultCode === l.defaultCode)!.id,
          quantite: l.quantite,
          prixUnitaireHtCentimes: l.prixUnitaireHt,
          remiseCentimes: l.remiseHt,
        })),
      },
    },
  });

  // F06 : bons utilisés, consommés dans l'ordre de leur expiration (FR-012).
  if (achat.bonsHt > 0) await utiliserBons(tx, partenaire.id, commande.id, ref, achat.bonsHt);
  // F06 (FR-038) : l'assistance à l'acte payée ouvre une intervention.
  if (creation.statut === "payee" && c.lignes.some((l) => l.defaultCode === ARTICLE_ASSISTANCE_ACTE)) {
    await tx.interventionPayee.create({ data: { partenaireId: partenaire.id, commandeId: commande.id } });
  }
  if (devis.lignes.some((l) => l.offerte)) {
    await tx.partenaire.update({ where: { id: partenaire.id }, data: { bienvenueRecue: true } });
  }
  if (creation.statut === "payee" && !financee) await creerFacture(tx, commande.id, date);
  // F06 : Odoo applique lui-même les règles du programme à la commande payée.
  if (creation.statut === "payee") await appliquerReglesTx(tx, ref, date);

  return { ref, id: commande.id, creee: true, echeance: creation.echeance };
}

/** Avoir d'un remboursement (numérotation continue, la facture d'origine n'est jamais modifiée). */
async function creerAvoir(tx: Tx, commandeId: number, montantTtc: number, motif: string, date: Date) {
  const c = await tx.commandeVente.findUniqueOrThrow({ where: { id: commandeId } });
  const ht = c.montantTtcCentimes ? Math.round((montantTtc * c.montantHtCentimes) / c.montantTtcCentimes) : montantTtc;
  return tx.facture.create({
    data: {
      numero: await prochainNumeroFacture(tx, date),
      type: "remboursement",
      partenaireId: c.partenaireId,
      commandeId: c.id,
      date,
      montantHtCentimes: -ht,
      tvaCentimes: -(montantTtc - ht),
      montantTtcCentimes: -montantTtc,
      etatPaiement: "rembourse",
      lignes: [{ libelle: `Remboursement — ${motif}`, reference: c.ref, quantite: 1, prixUnitaireHtCentimes: -ht, remiseCentimes: 0, totalHtCentimes: -ht }],
    },
  });
}

/** Enregistre un remboursement (idempotent par clé) : avoir, statut de la commande. */
export async function enregistrerRemboursementTx(tx: Tx, r: EnregistrementRemboursement & { deduction?: { bonsDeduitsHt: number; deductionTtc: number } }, cle: string, date = new Date()) {
  const deja = await tx.remboursement.findUnique({ where: { cle } });
  if (deja?.avoirNumero) return { avoir: deja.avoirNumero };
  // Même remboursement Stripe déjà enregistré (décidé dans Odoo, puis notifié par Stripe).
  if (r.referenceStripe) {
    const meme = await tx.remboursement.findFirst({ where: { referenceStripe: r.referenceStripe, etat: "execute" } });
    if (meme?.avoirNumero) return { avoir: meme.avoirNumero };
  }
  const commande = await tx.commandeVente.findUnique({ where: { ref: r.commandeRef }, include: { remboursements: true } });
  if (!commande) throw new NotFound("Commande", r.commandeRef);
  const avoir = await creerAvoir(tx, commande.id, r.montantTtc, r.motif, date);
  const donnees = { etat: "execute" as const, referenceStripe: r.referenceStripe, cle, avoirNumero: avoir.numero };
  if (r.remboursementId) {
    await tx.remboursement.update({ where: { id: Number(r.remboursementId) }, data: donnees });
  } else {
    await tx.remboursement.create({
      data: { commandeId: commande.id, montantTtcCentimes: r.montantTtc, motif: r.motif, source: r.source, bonsDeduitsHtCentimes: r.deduction?.bonsDeduitsHt ?? 0, deductionTtcCentimes: r.deduction?.deductionTtc ?? 0, ...donnees },
    });
  }
  const executes = await tx.remboursement.findMany({ where: { commandeId: commande.id, etat: "execute" } });
  // Les bons déjà dépensés déduits (F06, D4) comptent dans le remboursement intégral.
  const total = executes.reduce((s, x) => s + x.montantTtcCentimes + x.deductionTtcCentimes, 0);
  const complet = total >= commande.montantTtcCentimes;
  await tx.commandeVente.update({ where: { id: commande.id }, data: { statut: complet ? "remboursee" : "remboursee_partiellement" } });
  if (complet) await tx.facture.updateMany({ where: { commandeId: commande.id, type: "facture" }, data: { etatPaiement: "rembourse" } });
  // F06 : Odoo recalcule aussitôt bons et droits de la commande remboursée.
  await appliquerReglesTx(tx, commande.ref);
  return { avoir: avoir.numero };
}

export const commandesDemo: CommandesOdoo = {
  async calculerDevis(demande) {
    return calculerDevis(demande);
  },

  async creerCommandePayee(commande: NouvelleCommande, cle: string) {
    const { ref } = await db().$transaction((tx) => creerCommande(tx, commande, cle));
    return { ref };
  },

  async creerCommandeVirement(commande: NouvelleCommande, cle: string) {
    return db().$transaction(async (tx) => {
      const parametres = await tx.parametresVente.findFirst({ orderBy: { id: "desc" } });
      const maintenant = new Date();
      const r = await creerCommande(tx, commande, cle, maintenant, {
        statut: "en_attente_paiement",
        echeance: ajouterJours(maintenant, parametres?.delaiVirementJours ?? 7),
      });
      return { ref: r.ref, echeance: r.echeance! };
    });
  },

  async annulerCommandeEnAttente(ref: string, motif: string) {
    await db().$transaction(async (tx) => {
      const c = await tx.commandeVente.findUnique({ where: { ref }, include: { lignes: { include: { variante: { include: { stock: true } } } } } });
      if (!c) throw new NotFound("Commande", ref);
      if (c.statut !== "en_attente_paiement") return;
      for (const l of c.lignes) {
        if (l.variante.stock) await tx.stock.update({ where: { id: l.variante.stock.id }, data: { quantite: { increment: l.quantite } } });
      }
      await tx.commandeVente.update({ where: { id: c.id }, data: { statut: "annulee" } });
      // F06 (A1) : bons utilisés rendus à leur validité d'origine, par la règle commune.
      await appliquerReglesTx(tx, ref);
      if (c.lignes.some((l) => l.prixUnitaireHtCentimes === 0)) {
        await tx.partenaire.update({ where: { id: c.partenaireId }, data: { bienvenueRecue: false } });
      }
      await tx.commandeVente.update({ where: { id: c.id }, data: { statut: "annulee", livraison: { ...(c.livraison as object), motifAnnulation: motif } } });
    });
  },

  async listerCommandes(partenaireRef: string): Promise<ResumeCommande[]> {
    const commandes = await db().commandeVente.findMany({
      where: { partenaire: { ref: partenaireRef } },
      orderBy: { date: "desc" },
    });
    return commandes.map((c) => ({
      ref: c.ref,
      date: c.date,
      montantHt: c.montantHtCentimes,
      montantTtc: c.montantTtcCentimes,
      statut: statutPublic(c.statut),
      estFictif: c.estFictif,
    }));
  },

  async lireCommande(ref: string): Promise<Commande> {
    const c = await db().commandeVente.findUnique({
      where: { ref },
      include: { partenaire: true, lignes: { include: { variante: { include: { modele: true } } } }, remboursements: { where: { etat: "execute" } } },
    });
    if (!c) throw new NotFound("Commande", ref);
    return {
      ref: c.ref,
      date: c.date,
      montantHt: c.montantHtCentimes,
      montantTtc: c.montantTtcCentimes,
      tva: c.tvaCentimes,
      statut: statutPublic(c.statut),
      estFictif: c.estFictif,
      partenaireRef: c.partenaire.ref,
      fraisPortHt: c.fraisPortCentimes,
      bonsUtilisesHt: c.bonsUtilisesCentimes,
      modePaiement: c.modePaiement,
      referencePaiement: c.referencePaiement,
      financee: c.financee,
      transporteur: c.transporteur,
      suivi: c.suivi,
      echeancePaiement: c.echeancePaiement,
      remboursementsTtc: c.remboursements.reduce((s, r) => s + r.montantTtcCentimes, 0),
      lignes: c.lignes.map((l) => ({
        defaultCode: l.variante.defaultCode,
        libelle: `${l.variante.modele.marque} ${l.variante.modele.nom}${l.variante.configuration ? ` — ${l.variante.configuration}` : ""}`,
        quantite: l.quantite,
        prixUnitaireHt: l.prixUnitaireHtCentimes,
        remiseHt: l.remiseCentimes,
      })),
    };
  },

  async listerChangements(depuis: Date): Promise<ChangementCommande[]> {
    const commandes = await db().commandeVente.findMany({
      where: { modifieLe: { gt: depuis } },
      include: { partenaire: true, remboursements: { where: { etat: "execute" } } },
      orderBy: { modifieLe: "asc" },
    });
    return commandes.map((c) => ({
      ref: c.ref,
      partenaireRef: c.partenaire.ref,
      statut: statutPublic(c.statut),
      transporteur: c.transporteur,
      suivi: c.suivi,
      remboursementsTtc: c.remboursements.reduce((s, r) => s + r.montantTtcCentimes, 0),
      modifieLe: c.modifieLe,
    }));
  },

  async listerRemboursementsAExecuter(): Promise<RemboursementAExecuter[]> {
    const liste = await db().remboursement.findMany({ where: { etat: "a_executer", source: "odoo" }, include: { commande: true }, orderBy: { id: "asc" } });
    return liste.map((r) => ({
      id: String(r.id),
      commandeRef: r.commande.ref,
      paiementRef: r.commande.modePaiement === "virement" ? null : r.commande.referencePaiement,
      modePaiement: r.commande.modePaiement,
      montantTtc: r.montantTtcCentimes,
      motif: r.motif,
      bonsDeduitsHt: r.bonsDeduitsHtCentimes,
    }));
  },

  async enregistrerRemboursement(r: EnregistrementRemboursement, cle: string) {
    return db().$transaction((tx) => enregistrerRemboursementTx(tx, r, cle));
  },
};
