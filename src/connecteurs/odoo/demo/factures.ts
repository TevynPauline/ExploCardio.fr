import { NotFound } from "../../erreurs";
import type { AdressePartenaire, FacturesOdoo, ResumeFacture } from "../interfaces";
import { genererPdfFacture, type DonneesFacturePdf } from "./factures-pdf";
import { db } from "./outils";

// Domaine « Factures » en démonstration (contracts/odoo.md §5).

export const facturesDemo: FacturesOdoo = {
  async listerFactures(partenaireRef: string): Promise<ResumeFacture[]> {
    const factures = await db().facture.findMany({
      where: { partenaire: { ref: partenaireRef } },
      include: { commande: true },
      orderBy: { date: "desc" },
    });
    return factures.map((f) => ({
      numero: f.numero,
      type: f.type === "remboursement" ? "avoir" : "facture",
      date: f.date,
      commandeRef: f.commande?.ref ?? null,
      montantHt: f.montantHtCentimes,
      montantTtc: f.montantTtcCentimes,
      etatPaiement: (f.etatPaiement === "a_prelever" ? "en_attente" : f.etatPaiement) as ResumeFacture["etatPaiement"],
      references: [...new Set(((f.lignes as { reference?: string }[]) ?? []).map((l) => l.reference).filter((r): r is string => Boolean(r)))],
      estFictif: f.estFictif,
    }));
  },

  async obtenirPdf(numero: string): Promise<Uint8Array> {
    const f = await db().facture.findUnique({
      where: { numero },
      include: { partenaire: true, commande: true },
    });
    if (!f) throw new NotFound("Facture", numero);
    const adresse = (f.partenaire.adresses as AdressePartenaire[]).find((a) => a.type === "facturation") ??
      (f.partenaire.adresses as AdressePartenaire[])[0];
    return genererPdfFacture({
      numero: f.numero,
      type: f.type === "remboursement" ? "avoir" : "facture",
      date: f.date,
      client: {
        nom: f.partenaire.nom,
        adresse: adresse ? [adresse.ligne1, `${adresse.codePostal} ${adresse.ville}`] : [],
        rpps: f.partenaire.rpps,
        siret: f.partenaire.siret,
      },
      commandeRef: f.commande?.ref ?? null,
      lignes: f.lignes as DonneesFacturePdf["lignes"],
      montantHt: f.montantHtCentimes,
      tva: f.tvaCentimes,
      montantTtc: f.montantTtcCentimes,
    });
  },
};
