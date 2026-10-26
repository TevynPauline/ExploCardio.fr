import { NotFound } from "../../erreurs";
import type { AdressePartenaire, DemandeDevis, Devis, DevisEnregistre, NouveauDevis, ResumeDevisEnregistre } from "../interfaces";
import { calculerDevis, etatDevis, type InstantaneDevis as Instantane } from "./devis";
import { euros, genererPdfFacture } from "./factures-pdf";
import { ajouterJours, db, prochaineReference, type Tx } from "./outils";

// Devis enregistrés en démonstration (F16, US6, contracts/connecteur-odoo-devis.md).
// Comme dans Odoo, un devis est une commande à l'état « devis » : même numérotation, validité
// lue dans les paramètres commerciaux. La demande et le calcul complet sont gardés tels
// qu'affichés (le devis ne change pas si le panier change). Un devis ne réserve pas de stock ;
// « Commander » confirme ce même devis (creerCommande avec devisRef, prix figés).

function totaux(calcul: Devis) {
  return {
    totalHt: (calcul.achat?.totalHt ?? 0) + (calcul.abonnement?.premierMoisHt ?? 0),
    totalTtc: (calcul.achat?.totalTtc ?? 0) + (calcul.abonnement?.premierMoisTtc ?? 0),
  };
}

type CommandeLue = NonNullable<Awaited<ReturnType<typeof lireLigne>>>;

async function lireLigne(tx: Tx, ref: string) {
  return tx.commandeVente.findUnique({ where: { ref }, include: { partenaire: true } });
}

function versDevis(c: CommandeLue): DevisEnregistre {
  const i = c.livraison as unknown as Instantane;
  return {
    ref: c.ref,
    creeLe: new Date(i.devis.creeLe ?? c.date),
    validiteLe: c.validiteLe!,
    ...totaux(i.devis.calcul),
    etat: etatDevis(c),
    commandeRef: c.statut === "devis" ? null : c.ref,
    partenaireRef: c.partenaire.ref,
    demande: i.devis.demande,
    calcul: i.devis.calcul,
    estFictif: c.estFictif,
  };
}

/** Devis d'un partenaire, quel que soit son état ; NotFound s'il appartient à un autre client. */
async function devisDuPartenaire(tx: Tx, partenaireRef: string, ref: string): Promise<CommandeLue> {
  const c = await lireLigne(tx, ref);
  if (!c || c.partenaire.ref !== partenaireRef || !c.validiteLe || (c.statut !== "devis" && c.devisRef !== c.ref)) throw new NotFound("Devis", ref);
  return c;
}

export const devisEnregistresDemo = {
  async creerDevis(d: NouveauDevis, cle: string): Promise<DevisEnregistre> {
    return db().$transaction(async (tx) => {
      const deja = await tx.commandeVente.findUnique({ where: { cle }, include: { partenaire: true } });
      if (deja) return versDevis(deja);
      const partenaire = await tx.partenaire.findUnique({ where: { ref: d.partenaireRef } });
      if (!partenaire) throw new NotFound("Partenaire", d.partenaireRef);
      const maintenant = new Date();
      const demande: DemandeDevis = { ...d, devisRef: null };
      const calcul = await calculerDevis(demande, tx, { maintenant });
      const parametres = await tx.parametresVente.findFirst({ orderBy: { id: "desc" } });
      const achat = calcul.achat;
      const instantane: Instantane = {
        ...d.livraison,
        mode: calcul.modeLivraison,
        devis: { creeLe: maintenant.toISOString(), demande: d.lignes.map((l) => ({ defaultCode: l.defaultCode, formule: l.formule, quantite: l.quantite })), calcul },
      };
      const variantes = await tx.variante.findMany({ where: { defaultCode: { in: calcul.lignes.map((l) => l.defaultCode) } } });
      const c = await tx.commandeVente.create({
        data: {
          ref: await prochaineReference(tx, "SO"),
          cle,
          partenaireId: partenaire.id,
          date: maintenant,
          montantHtCentimes: achat?.totalHt ?? 0,
          tvaCentimes: achat?.tva ?? 0,
          montantTtcCentimes: achat?.totalTtc ?? 0,
          fraisPortCentimes: (achat?.fraisPortHt ?? 0) + (achat?.fraisSpecifiquesHt ?? 0),
          bonsUtilisesCentimes: 0,
          codePromo: calcul.codePromo?.applique ? calcul.codePromo.code : null,
          modePaiement: "devis",
          statut: "devis",
          validiteLe: ajouterJours(maintenant, parametres?.validiteDevisJours ?? 30),
          livraison: instantane as unknown as object,
          lignes: {
            create: calcul.lignes
              .filter((l) => l.formule === "achat")
              .map((l) => ({ varianteId: variantes.find((v) => v.defaultCode === l.defaultCode)!.id, quantite: l.quantite, prixUnitaireHtCentimes: l.prixUnitaireHt, remiseCentimes: l.remiseHt })),
          },
        },
        include: { partenaire: true },
      });
      return versDevis(c);
    });
  },

  async listerDevis(partenaireRef: string): Promise<ResumeDevisEnregistre[]> {
    const liste = await db().commandeVente.findMany({
      where: { partenaire: { ref: partenaireRef }, validiteLe: { not: null } },
      include: { partenaire: true },
      orderBy: [{ date: "desc" }, { id: "desc" }],
    });
    return liste
      .filter((c) => c.statut === "devis" || c.devisRef === c.ref)
      .map((c): ResumeDevisEnregistre => {
        const d = versDevis(c);
        return { ref: d.ref, creeLe: d.creeLe, validiteLe: d.validiteLe, totalHt: d.totalHt, totalTtc: d.totalTtc, etat: d.etat, commandeRef: d.commandeRef, estFictif: d.estFictif };
      });
  },

  async lireDevis(partenaireRef: string, ref: string): Promise<DevisEnregistre> {
    return versDevis(await devisDuPartenaire(db(), partenaireRef, ref));
  },

  async lireDevisPdf(partenaireRef: string, ref: string): Promise<Uint8Array> {
    const c = await devisDuPartenaire(db(), partenaireRef, ref);
    const i = c.livraison as unknown as Instantane;
    const { calcul } = i.devis;
    const adresse = (c.partenaire.adresses as AdressePartenaire[]).find((a) => a.type === "facturation") ?? (c.partenaire.adresses as AdressePartenaire[])[0];
    const achat = calcul.achat;
    const mentions = [`Livraison prévue : ${i.adresse}, ${i.codePostal} ${i.ville}.`];
    if (calcul.abonnement) {
      mentions.push(
        `Mise à disposition : premier mois ${euros(calcul.abonnement.premierMoisHt)} HT, puis ${euros(calcul.abonnement.moisSuivantsHt)} HT par mois.`,
      );
    }
    mentions.push("Prix HT garantis jusqu'à la date de validité, sous réserve de disponibilité.");
    return genererPdfFacture({
      numero: c.ref,
      type: "devis",
      date: c.date,
      validiteLe: c.validiteLe!,
      client: {
        nom: c.partenaire.nom,
        adresse: adresse ? [adresse.ligne1, `${adresse.codePostal} ${adresse.ville}`] : [],
        rpps: null,
        siret: c.partenaire.siret,
      },
      commandeRef: null,
      lignes: [
        ...calcul.lignes.map((l) => ({
          libelle: l.formule === "mise_a_disposition" ? `${l.libelle} (mise à disposition, 1er mois)` : l.libelle,
          reference: l.defaultCode,
          quantite: l.quantite,
          prixUnitaireHtCentimes: l.prixUnitaireHt,
          remiseCentimes: l.remiseHt,
          totalHtCentimes: l.totalHt,
        })),
        ...(achat && achat.fraisPortHt + achat.fraisSpecifiquesHt > 0
          ? [{ libelle: "Livraison", reference: "PORT", quantite: 1, prixUnitaireHtCentimes: achat.fraisPortHt + achat.fraisSpecifiquesHt, remiseCentimes: 0, totalHtCentimes: achat.fraisPortHt + achat.fraisSpecifiquesHt }]
          : []),
      ],
      montantHt: totaux(calcul).totalHt,
      tva: totaux(calcul).totalTtc - totaux(calcul).totalHt,
      montantTtc: totaux(calcul).totalTtc,
      mentions,
    });
  },
};

