import type { Prisma } from "@generated/demo/client";
import { ajouterJoursOuvres, jourDeParis, dateDuJour } from "@/lib/calendrier";
import { NotFound, OperationRefusee, OutOfStock } from "../../erreurs";
import type { ChangementLocation, FactureAPrelever, Location, LocationOdoo, NouvelAbonnement, ReglesLocation } from "../interfaces";
import { genererPdfEtiquette } from "./etiquette-pdf";
import { ajouterMois, db, prochaineReference, prochainNumeroFacture, type Tx } from "./outils";

// Domaine « Location et abonnements » en démonstration (contracts/odoo.md §6, F05).
// Les règles (délais de retour, tentatives, tolérance) viennent de la table des règles de
// location, modifiable dans Démonstration → Paramètres commerciaux (principe VI).

const INCLURE = { variante: { include: { modele: true, offreMad: true } }, numeroSerie: true, partenaire: true, commande: true } as const;
type AbonnementLu = Prisma.AbonnementGetPayload<{ include: typeof INCLURE }>;

export const REGLES_PAR_DEFAUT: ReglesLocation = {
  tentativesPrelevement: 3,
  espacementTentativesJours: 3,
  delaiRegularisationJours: 10,
  delaiRetourJoursOuvres: 5,
  toleranceRetardJours: 5,
  delaiNonRetourJours: 30,
};

export async function lireReglesLocation(tx: Tx = db()): Promise<ReglesLocation> {
  const r = await tx.reglesLocation.findFirst({ orderBy: { id: "desc" } });
  return r
    ? {
        tentativesPrelevement: r.tentativesPrelevement,
        espacementTentativesJours: r.espacementTentativesJours,
        delaiRegularisationJours: r.delaiRegularisationJours,
        delaiRetourJoursOuvres: r.delaiRetourJoursOuvres,
        toleranceRetardJours: r.toleranceRetardJours,
        delaiNonRetourJours: r.delaiNonRetourJours,
      }
    : REGLES_PAR_DEFAUT;
}

/** Date limite de retour : fin + N jours ouvrés (règle d'Odoo). */
export function dateLimiteRetour(fin: Date, regles: ReglesLocation): Date {
  return dateDuJour(ajouterJoursOuvres(jourDeParis(fin), regles.delaiRetourJoursOuvres));
}

function versLocation(a: AbonnementLu): Location {
  return {
    ref: a.ref,
    objet: a.objet,
    defaultCode: a.variante.defaultCode,
    libelle: `${a.variante.modele.marque} ${a.variante.modele.nom}`,
    // Le numéro de série n'est communiqué qu'à l'expédition (D5).
    numeroSerie: a.objet === "logiciel" || a.expedieLe ? (a.numeroSerie?.numero ?? null) : null,
    montantMensuelHt: a.montantMensuelCentimes,
    debut: a.debut,
    fin: a.fin,
    prochaineEcheance: a.prochaineEcheance,
    etat: a.etat,
    dateLivraison: a.dateLivraison,
    dateLimiteRetour: a.dateLimiteRetour,
    expedieLe: a.expedieLe,
    transporteur: a.transporteur,
    suivi: a.suivi,
    commandeRef: a.commande?.ref ?? null,
    expeditionBloquee: a.expeditionBloquee,
    attenteChoixClient: a.attenteChoixClient,
    colisNonLivre: a.colisNonLivre,
    impaye: a.impayeDepuis !== null,
    rappelsRetour: a.rappelsRetour,
    etatRetour: a.etatRetour,
    montantDegradationHt: a.montantDegradationCentimes,
    logiciel: a.objet === "logiciel" ? a.variante.defaultCode : (a.variante.offreMad?.logiciel ?? null),
    estFictif: a.estFictif,
  };
}

async function lire(tx: Tx, ref: string): Promise<AbonnementLu> {
  const a = await tx.abonnement.findUnique({ where: { ref }, include: INCLURE });
  if (!a) throw new NotFound("Abonnement", ref);
  return a;
}

/** Ajoute une entrée à l'historique d'un appareil du parc. */
export async function noterHistorique(tx: Tx, numeroSerieId: number | null, entree: Record<string, unknown>) {
  if (!numeroSerieId) return;
  const lot = await tx.numeroSerie.findUnique({ where: { id: numeroSerieId } });
  if (!lot) return;
  const historique = Array.isArray(lot.historique) ? (lot.historique as Prisma.JsonArray) : [];
  await tx.numeroSerie.update({ where: { id: numeroSerieId }, data: { historique: [...historique, { date: new Date().toISOString(), ...entree }] as Prisma.InputJsonValue } });
}

/** Avoir sans commande de vente (premier mois d'une location annulée). */
async function avoirLocation(tx: Tx, a: AbonnementLu, montantTtc: number, motif: string, cle: string) {
  const taux = Number(a.variante.tauxTva);
  const ht = Math.round((montantTtc * 100) / (100 + taux));
  return tx.facture.create({
    data: {
      numero: await prochainNumeroFacture(tx, new Date()),
      type: "remboursement",
      cle,
      partenaireId: a.partenaireId,
      montantHtCentimes: -ht,
      tvaCentimes: -(montantTtc - ht),
      montantTtcCentimes: -montantTtc,
      etatPaiement: "rembourse",
      lignes: [{ libelle: `Remboursement — ${motif}`, reference: a.ref, quantite: 1, prixUnitaireHtCentimes: -ht, remiseCentimes: 0, totalHtCentimes: -ht }],
    },
  });
}

export const locationDemo: LocationOdoo = {
  async creerAbonnement(a: NouvelAbonnement, cle: string) {
    return db().$transaction(async (tx) => {
      const deja = await tx.abonnement.findUnique({ where: { cle } });
      if (deja) return { ref: deja.ref };

      const partenaire = await tx.partenaire.findUnique({ where: { ref: a.partenaireRef } });
      if (!partenaire) throw new NotFound("Partenaire", a.partenaireRef);
      const variante = await tx.variante.findUnique({ where: { defaultCode: a.defaultCode }, include: { offreMad: true } });
      if (!variante) throw new NotFound("Article", a.defaultCode);

      const debut = a.dateLivraison ?? a.debut;
      let numeroSerieId: number | null = null;
      let montantMensuel = variante.prixHtCentimes;
      if (a.objet === "mise_a_disposition") {
        if (!variante.offreMad) throw new NotFound("Offre de mise à disposition", a.defaultCode);
        montantMensuel = variante.offreMad.moisSuivantsCentimes;
        const reservation = a.reservationCle ? await tx.reservationAppareil.findUnique({ where: { cle: a.reservationCle } }) : null;
        if (reservation && reservation.etat === "active") {
          numeroSerieId = reservation.numeroSerieId;
          await tx.reservationAppareil.update({ where: { id: reservation.id }, data: { etat: "consommee" } });
        } else {
          // Sans réservation (ou réservation expirée) : un appareil encore disponible, pris
          // par mise à jour conditionnelle pour qu'il ne serve jamais deux fois (SC-005).
          for (const candidat of await tx.numeroSerie.findMany({ where: { varianteId: variante.id, statut: "disponible" }, orderBy: { numero: "asc" } })) {
            const pris = await tx.numeroSerie.updateMany({ where: { id: candidat.id, statut: "disponible" }, data: { statut: "loue" } });
            if (pris.count === 1) {
              numeroSerieId = candidat.id;
              break;
            }
          }
          if (!numeroSerieId) throw new OutOfStock([a.defaultCode]);
        }
      }

      const commande = a.commandeRef ? await tx.commandeVente.findUnique({ where: { ref: a.commandeRef } }) : null;
      const ref = await prochaineReference(tx, "SUB");
      await tx.abonnement.create({
        data: {
          ref,
          cle,
          partenaireId: partenaire.id,
          objet: a.objet,
          varianteId: variante.id,
          numeroSerieId,
          montantMensuelCentimes: montantMensuel,
          debut,
          prochaineEcheance: ajouterMois(debut, 1),
          dateLivraison: a.dateLivraison ?? null,
          commandeId: commande?.id ?? null,
          expeditionBloquee: a.expeditionBloquee ?? false,
          etat: a.objet === "mise_a_disposition" && a.dateLivraison ? "commandee" : "en_cours",
        },
      });
      await noterHistorique(tx, numeroSerieId, { evenement: "affecte", abonnement: ref });
      return { ref };
    });
  },

  async resilier(ref: string, dateDemande: Date) {
    return db().$transaction(async (tx) => {
      const a = await lire(tx, ref);
      if (a.etat === "commandee") throw new OperationRefusee("Location pas encore expédiée : elle s'annule au lieu de se résilier.", { ref });
      if (a.etat === "terminee" || a.etat === "annulee" || a.etat === "en_retard_retour") throw new OperationRefusee("Location déjà terminée.", { ref });
      if (a.etat === "resiliation_prevue" && a.fin) return { fin: a.fin, dateLimiteRetour: a.dateLimiteRetour };
      // Fin au terme du mois payé ; le jour de l'échéance ou après, le mois entamé reste dû.
      const echeance = a.prochaineEcheance ?? ajouterMois(a.debut, 1);
      const fin = dateDemande < echeance ? echeance : ajouterMois(echeance, 1);
      const limite = a.objet === "mise_a_disposition" ? dateLimiteRetour(fin, await lireReglesLocation(tx)) : null;
      await tx.abonnement.update({ where: { ref }, data: { fin, dateLimiteRetour: limite, etat: "resiliation_prevue" } });
      return { fin, dateLimiteRetour: limite };
    });
  },

  async annulerResiliation(ref: string) {
    const a = await lire(db(), ref);
    if (a.etat !== "resiliation_prevue") throw new OperationRefusee("Aucune résiliation programmée.", { ref });
    if (a.fin && a.fin <= new Date()) throw new OperationRefusee("La location est déjà arrivée à son terme.", { ref });
    await db().abonnement.update({ where: { ref }, data: { fin: null, dateLimiteRetour: null, etat: "en_cours" } });
    return { fin: null };
  },

  async listerLocations(partenaireRef: string): Promise<Location[]> {
    const abonnements = await db().abonnement.findMany({ where: { partenaire: { ref: partenaireRef } }, include: INCLURE, orderBy: { debut: "desc" } });
    return abonnements.map(versLocation);
  },

  async listerChangements(depuis: Date): Promise<ChangementLocation[]> {
    const abonnements = await db().abonnement.findMany({ where: { modifieLe: { gt: depuis } }, include: INCLURE, orderBy: { modifieLe: "asc" } });
    return abonnements.map((a) => ({ ...versLocation(a), partenaireRef: a.partenaire.ref, modifieLe: a.modifieLe }));
  },

  async etiquetteRetour(ref: string) {
    const a = await lire(db(), ref);
    if (a.objet !== "mise_a_disposition" || !["resiliation_prevue", "en_retard_retour", "suspendue_impaye"].includes(a.etat)) {
      throw new OperationRefusee("L'étiquette de retour est disponible après la résiliation.", { ref });
    }
    return genererPdfEtiquette({
      abonnementRef: a.ref,
      appareil: `${a.variante.modele.marque} ${a.variante.modele.nom}`,
      numeroSerie: a.numeroSerie?.numero ?? null,
      expediteur: a.partenaire.nom,
      dateLimite: a.dateLimiteRetour,
    });
  },

  async debloquerExpedition(partenaireRef: string) {
    const bloquees = await db().abonnement.findMany({ where: { partenaire: { ref: partenaireRef }, expeditionBloquee: true, etat: "commandee" } });
    await db().abonnement.updateMany({ where: { id: { in: bloquees.map((b) => b.id) } }, data: { expeditionBloquee: false } });
    return bloquees.map((b) => b.ref);
  },

  async reporterLivraison(ref: string, dateLivraison: Date) {
    const a = await lire(db(), ref);
    if (a.etat !== "commandee" || a.expedieLe) throw new OperationRefusee("L'appareil est déjà parti : la date ne peut plus changer.", { ref });
    await db().abonnement.update({
      where: { ref },
      data: { dateLivraison, debut: dateLivraison, prochaineEcheance: ajouterMois(dateLivraison, 1), attenteChoixClient: false },
    });
  },

  async annulerCommande(ref: string, motif: string, cle: string) {
    return db().$transaction(async (tx) => {
      const a = await lire(tx, ref);
      const deja = await tx.facture.findUnique({ where: { cle } });
      if (a.etat === "annulee") return { montantTtc: deja ? -deja.montantTtcCentimes : 0, avoir: deja?.numero ?? null };
      if (a.etat !== "commandee" || a.expedieLe) throw new OperationRefusee("L'appareil est déjà parti : la location se résilie.", { ref });
      await tx.abonnement.update({ where: { ref }, data: { etat: "annulee", attenteChoixClient: false } });
      if (a.numeroSerieId) {
        await tx.numeroSerie.update({ where: { id: a.numeroSerieId }, data: { statut: "disponible" } });
        await noterHistorique(tx, a.numeroSerieId, { evenement: "annulation", abonnement: ref });
      }
      // Premier mois remboursé intégralement (annulation avant expédition, hypothèse confirmée).
      const premierMois = a.variante.offreMad?.premierMoisCentimes ?? 0;
      const ttc = Math.round((premierMois * (100 + Number(a.variante.tauxTva))) / 100);
      const premiereFacture = await tx.facture.findFirst({ where: { partenaireId: a.partenaireId, type: "facture", lignes: { array_contains: [{ reference: ref }] } } });
      const factureGroupee = premiereFacture ?? (await tx.facture.findFirst({ where: { partenaireId: a.partenaireId, type: "facture", cle: { contains: ":echeance:1" } }, orderBy: { id: "desc" } }));
      if (!factureGroupee || !ttc) return { montantTtc: 0, avoir: null };
      const avoir = await avoirLocation(tx, a, ttc, motif, cle);
      return { montantTtc: ttc, avoir: avoir.numero };
    });
  },

  async kitsPossedes(partenaireRef: string) {
    const partenaire = await db().partenaire.findUnique({ where: { ref: partenaireRef } });
    if (!partenaire) throw new NotFound("Partenaire", partenaireRef);
    const kits = new Set((await db().offreMiseADisposition.findMany({ where: { kitRequis: { not: null } } })).map((o) => o.kitRequis!));
    const enregistres = await db().kitPossede.findMany({ where: { partenaireId: partenaire.id } });
    // Achats payés du kit, hors commandes annulées ou intégralement remboursées.
    const achetes = await db().ligneCommande.findMany({
      where: {
        variante: { defaultCode: { in: [...kits] } },
        commande: { partenaireId: partenaire.id, statut: { notIn: ["brouillon", "en_attente_paiement", "annulee", "remboursee"] } },
      },
      include: { variante: true },
    });
    return [...new Set([...enregistres.map((k) => k.kitDefaultCode), ...achetes.map((l) => l.variante.defaultCode)])].sort();
  },

  async lireRegles() {
    return lireReglesLocation();
  },

  async signalerImpaye(ref: string, date: Date) {
    const a = await lire(db(), ref);
    if (a.impayeDepuis || !["en_cours", "resiliation_prevue"].includes(a.etat)) return;
    await db().abonnement.update({ where: { ref }, data: { impayeDepuis: date, tentativesPrelevement: 0 } });
  },

  async listerFacturesAPrelever(): Promise<FactureAPrelever[]> {
    const factures = await db().facture.findMany({ where: { etatPaiement: "a_prelever" }, orderBy: { id: "asc" } });
    return factures.map((f) => {
      const ligne = (f.lignes as { libelle: string; reference: string }[])[0];
      return { numero: f.numero, abonnementRef: ligne?.reference ?? "", montantTtc: f.montantTtcCentimes, libelle: ligne?.libelle ?? "Location" };
    });
  },

  async enregistrerPrelevement(numero: string, paiementRef: string, cle: string) {
    const f = await db().facture.findUnique({ where: { numero } });
    if (!f) throw new NotFound("Facture", numero);
    if (f.etatPaiement === "paye") return;
    await db().facture.update({ where: { numero }, data: { etatPaiement: "paye", lignes: [...(f.lignes as object[]), { paiement: paiementRef, cle }] } });
  },

  async facturerEcheance(e, cle) {
    return db().$transaction(async (tx) => {
      const deja = await tx.facture.findUnique({ where: { cle } });
      if (deja) return { facture: deja.numero };
      const abonnements = await tx.abonnement.findMany({ where: { ref: { in: e.abonnementRefs } }, include: { variante: { include: { modele: true } } } });
      if (!abonnements.length) throw new NotFound("Abonnement", e.abonnementRefs.join(", "));
      const taux = Number(abonnements[0]!.variante.tauxTva);
      const ht = Math.round((e.montantTtc * 100) / (100 + taux));
      const facture = await tx.facture.create({
        data: {
          numero: await prochainNumeroFacture(tx, new Date()),
          type: "facture",
          cle,
          partenaireId: abonnements[0]!.partenaireId,
          montantHtCentimes: ht,
          tvaCentimes: e.montantTtc - ht,
          montantTtcCentimes: e.montantTtc,
          etatPaiement: "paye",
          lignes: abonnements.map((a) => ({
            libelle: e.libelle,
            reference: a.ref,
            quantite: 1,
            prixUnitaireHtCentimes: Math.round(ht / abonnements.length),
            remiseCentimes: 0,
            totalHtCentimes: Math.round(ht / abonnements.length),
          })),
        },
      });
      if (e.mois === "suivant") {
        // Échéance mensuelle payée : la suivante tombe le même jour du mois d'après ; un impayé est régularisé.
        for (const a of abonnements) {
          await tx.abonnement.update({
            where: { id: a.id },
            data: {
              prochaineEcheance: ajouterMois(a.prochaineEcheance ?? a.debut, 1),
              impayeDepuis: null,
              tentativesPrelevement: 0,
              ...(a.etat === "suspendue_impaye" ? { etat: "en_cours" as const } : {}),
            },
          });
        }
      }
      return { facture: facture.numero };
    });
  },
};
