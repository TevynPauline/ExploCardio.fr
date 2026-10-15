import { NotFound } from "../../erreurs";
import type { Commande, CommandesOdoo, NouvelleCommande, ResumeCommande, StatutCommande } from "../interfaces";
import { prixClient } from "./catalogue";
import { soldeCagnotte } from "./fidelite";
import { db, prochaineReference, prochainNumeroFacture, tva, type Tx } from "./outils";
import { decompterStock } from "./stock";

// Domaine « Commandes » en démonstration (contracts/odoo.md §4).
// Une commande payée crée aussi sa facture (numérotation continue, mention FICTIVE au PDF).

const TVA_PORT = 20;

function statutPublic(statut: string): StatutCommande {
  return (statut === "brouillon" ? "confirmee" : statut) as StatutCommande;
}

async function remiseCodePromo(tx: Tx, code: string | undefined, maintenant: Date) {
  if (!code) return null;
  const promo = await tx.promotion.findUnique({ where: { code } });
  if (!promo || promo.type !== "code_promo") return null;
  if ((promo.debut && promo.debut > maintenant) || (promo.fin && promo.fin < maintenant)) return null;
  return promo.remisePourcent ? Number(promo.remisePourcent) : null;
}

export async function creerCommande(tx: Tx, c: NouvelleCommande, cle: string, date = new Date()) {
  const deja = await tx.commandeVente.findUnique({ where: { cle } });
  if (deja) return { ref: deja.ref, id: deja.id, creee: false };

  const partenaire = await tx.partenaire.findUnique({ where: { ref: c.partenaireRef } });
  if (!partenaire) throw new NotFound("Partenaire", c.partenaireRef);

  const refs = c.lignes.map((l) => l.defaultCode);
  const prix = await prixClient(c.partenaireRef, refs, tx);
  const variantes = await tx.variante.findMany({
    where: { defaultCode: { in: refs } },
    include: { modele: true },
  });
  const remisePromo = await remiseCodePromo(tx, c.codePromo, date);

  const lignes = c.lignes.map((l) => {
    const v = variantes.find((x) => x.defaultCode === l.defaultCode)!;
    const p = prix.find((x) => x.defaultCode === l.defaultCode)!;
    const prixUnitaire = l.offerte ? 0 : p.prixHt;
    const brut = prixUnitaire * l.quantite;
    const remise = remisePromo && !l.offerte ? Math.round((brut * remisePromo) / 100) : 0;
    return { v, quantite: l.quantite, prixUnitaire, remise, net: brut - remise, offerte: Boolean(l.offerte) };
  });

  await decompterStock(tx, c.lignes);

  const bons = c.bonsUtilisesHt ?? 0;
  if (bons > 0) {
    const solde = await soldeCagnotte(tx, partenaire.id);
    if (bons > solde) throw new Error(`Bons d'achat insuffisants : solde ${solde}, demandé ${bons}.`);
  }

  const totalLignes = lignes.reduce((s, l) => s + l.net, 0);
  const tvaLignes = lignes.reduce((s, l) => s + tva(l.net, Number(l.v.tauxTva)), 0);
  const port = c.livraison.fraisPortHt;
  const montantHt = totalLignes + port - bons;
  const montantTva = tvaLignes + tva(port, TVA_PORT) - tva(bons, TVA_PORT);

  const ref = await prochaineReference(tx, "SO");
  const commande = await tx.commandeVente.create({
    data: {
      ref,
      cle,
      partenaireId: partenaire.id,
      date,
      montantHtCentimes: montantHt,
      tvaCentimes: montantTva,
      montantTtcCentimes: montantHt + montantTva,
      fraisPortCentimes: port,
      bonsUtilisesCentimes: bons,
      modePaiement: c.paiement.mode,
      referencePaiement: c.paiement.reference,
      statut: "confirmee",
      financee: c.paiement.mode === "financement",
      livraison: c.livraison,
      lignes: {
        create: lignes.map((l) => ({
          varianteId: l.v.id,
          quantite: l.quantite,
          prixUnitaireHtCentimes: l.prixUnitaire,
          remiseCentimes: l.remise,
        })),
      },
    },
  });

  if (bons > 0) {
    await tx.mouvementCagnotte.create({
      data: {
        partenaireId: partenaire.id,
        type: "utilisation",
        montantCentimes: -bons,
        commandeId: commande.id,
        cle: `utilisation:${ref}`,
        date,
      },
    });
  }
  if (lignes.some((l) => l.offerte)) {
    await tx.partenaire.update({ where: { id: partenaire.id }, data: { bienvenueRecue: true } });
  }

  await tx.facture.create({
    data: {
      numero: await prochainNumeroFacture(tx, date),
      type: "facture",
      partenaireId: partenaire.id,
      commandeId: commande.id,
      date,
      montantHtCentimes: commande.montantHtCentimes,
      tvaCentimes: commande.tvaCentimes,
      montantTtcCentimes: commande.montantTtcCentimes,
      etatPaiement: "paye",
      lignes: [
        ...lignes.map((l) => ({
          libelle: `${l.v.modele.marque} ${l.v.modele.nom}${l.v.configuration ? ` — ${l.v.configuration}` : ""}${l.offerte ? " (offert)" : ""}`,
          reference: l.v.defaultCode,
          quantite: l.quantite,
          prixUnitaireHtCentimes: l.prixUnitaire,
          remiseCentimes: l.remise,
          totalHtCentimes: l.net,
        })),
        ...(port > 0
          ? [{ libelle: "Frais de port", reference: "PORT", quantite: 1, prixUnitaireHtCentimes: port, remiseCentimes: 0, totalHtCentimes: port }]
          : []),
        ...(bons > 0
          ? [{ libelle: "Bons d'achat utilisés", reference: "BONS", quantite: 1, prixUnitaireHtCentimes: -bons, remiseCentimes: 0, totalHtCentimes: -bons }]
          : []),
      ],
    },
  });

  return { ref, id: commande.id, creee: true };
}

export const commandesDemo: CommandesOdoo = {
  async creerCommandePayee(commande: NouvelleCommande, cle: string) {
    const { ref } = await db().$transaction((tx) => creerCommande(tx, commande, cle));
    return { ref };
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
      include: { partenaire: true, lignes: { include: { variante: { include: { modele: true } } } } },
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
      financee: c.financee,
      suivi: c.suivi,
      lignes: c.lignes.map((l) => ({
        defaultCode: l.variante.defaultCode,
        libelle: `${l.variante.modele.marque} ${l.variante.modele.nom}`,
        quantite: l.quantite,
        prixUnitaireHt: l.prixUnitaireHtCentimes,
        remiseHt: l.remiseCentimes,
      })),
    };
  },
};
