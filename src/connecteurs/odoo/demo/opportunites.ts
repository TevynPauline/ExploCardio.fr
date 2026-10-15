import type { CopieDemande, OpportunitesOdoo } from "../interfaces";
import { db, prochaineReference } from "./outils";

// Domaine « Opportunités commerciales » en démonstration (contracts/odoo.md §8, FR-021).
// La demande reste gérée par le site ; la base de démonstration n'en reçoit qu'une copie.

export const opportunitesDemo: OpportunitesOdoo = {
  async copierDemande(demande: CopieDemande, cle: string) {
    return db().$transaction(async (tx) => {
      const deja = await tx.opportunite.findUnique({ where: { cle } });
      if (deja) return { ref: deja.ref };
      const partenaire = demande.partenaireRef
        ? await tx.partenaire.findUnique({ where: { ref: demande.partenaireRef } })
        : null;
      const ref = await prochaineReference(tx, "CRM");
      await tx.opportunite.create({
        data: {
          ref,
          cle,
          type: demande.type,
          partenaireId: partenaire?.id ?? null,
          referenceDemande: demande.referenceDemande,
          contenu: demande.contenu as object,
        },
      });
      return { ref };
    });
  },
};
