import { NotFound, OutOfStock } from "../../erreurs";
import type { Location, LocationOdoo, NouvelAbonnement } from "../interfaces";
import { ajouterMois, db, prochaineReference } from "./outils";

// Domaine « Location et abonnements » en démonstration (contracts/odoo.md §6).

export const locationDemo: LocationOdoo = {
  async creerAbonnement(a: NouvelAbonnement, cle: string) {
    return db().$transaction(async (tx) => {
      const deja = await tx.abonnement.findUnique({ where: { cle } });
      if (deja) return { ref: deja.ref };

      const partenaire = await tx.partenaire.findUnique({ where: { ref: a.partenaireRef } });
      if (!partenaire) throw new NotFound("Partenaire", a.partenaireRef);
      const variante = await tx.variante.findUnique({
        where: { defaultCode: a.defaultCode },
        include: { offreMad: true },
      });
      if (!variante) throw new NotFound("Article", a.defaultCode);

      let numeroSerieId: number | null = null;
      let montantMensuel = variante.prixHtCentimes;
      if (a.objet === "mise_a_disposition") {
        if (!variante.offreMad) throw new NotFound("Offre de mise à disposition", a.defaultCode);
        const appareil = await tx.numeroSerie.findFirst({
          where: { varianteId: variante.id, statut: "disponible" },
          orderBy: { numero: "asc" },
        });
        if (!appareil) throw new OutOfStock([a.defaultCode]);
        await tx.numeroSerie.update({ where: { id: appareil.id }, data: { statut: "loue" } });
        numeroSerieId = appareil.id;
        montantMensuel = variante.offreMad.moisSuivantsCentimes;
      }

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
          debut: a.debut,
          prochaineEcheance: ajouterMois(a.debut, 1),
        },
      });
      return { ref };
    });
  },

  async resilier(ref: string, date: Date) {
    const a = await db().abonnement.findUnique({ where: { ref } });
    if (!a) throw new NotFound("Abonnement", ref);
    await db().abonnement.update({ where: { ref }, data: { fin: date, etat: "resiliation_prevue" } });
    return { fin: date };
  },

  async annulerResiliation(ref: string) {
    const a = await db().abonnement.findUnique({ where: { ref } });
    if (!a) throw new NotFound("Abonnement", ref);
    await db().abonnement.update({ where: { ref }, data: { fin: null, etat: "en_cours" } });
    return { fin: null };
  },

  async listerLocations(partenaireRef: string): Promise<Location[]> {
    const abonnements = await db().abonnement.findMany({
      where: { partenaire: { ref: partenaireRef } },
      include: { variante: { include: { modele: true } }, numeroSerie: true },
      orderBy: { debut: "desc" },
    });
    return abonnements.map((a) => ({
      ref: a.ref,
      objet: a.objet,
      defaultCode: a.variante.defaultCode,
      libelle: `${a.variante.modele.marque} ${a.variante.modele.nom}`,
      numeroSerie: a.numeroSerie?.numero ?? null,
      montantMensuelHt: a.montantMensuelCentimes,
      debut: a.debut,
      fin: a.fin,
      prochaineEcheance: a.prochaineEcheance,
      etat: a.etat,
      estFictif: a.estFictif,
    }));
  },
};
