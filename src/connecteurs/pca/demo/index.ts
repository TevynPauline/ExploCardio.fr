import { dbDemo } from "@/lib/db/demo";
import { sousModePcaDemo } from "@/lib/config";
import { CloudAccessDenied, NotFound } from "../../erreurs";
import { PREFIXE_REFERENCE_FICTIVE } from "../../garde-donnees-fictives";
import type { ConnecteurPca, DroitCloud, EtatAcces, Medecin } from "../interfaces";

// Connecteur PCA de démonstration (FR-030, contracts/pca.md) : simule l'ouverture, le délai de
// grâce, la suspension et la fermeture des accès, dans les deux sous-modes (PCA_DEMO_SUBMODE).
// Aucun compte réel n'est créé. Seules l'identité professionnelle et les logiciels sont manipulés.

/** Logiciel de démonstration dont l'ouverture est refusée, pour montrer le cas d'erreur. */
export const LOGICIEL_REFUSE_DEMO = "DEMO-ACCES-REFUSE";

const db = () => dbDemo();

async function lire(ref: string) {
  const acces = await db().accesCloud.findUnique({ where: { ref } });
  if (!acces) throw new NotFound("Accès Cloud", ref);
  return acces;
}

async function changer(ref: string, etat: EtatAcces, motif: string | null = null) {
  await lire(ref);
  await db().accesCloud.update({ where: { ref }, data: { etat, motif } });
  return { etat };
}

export function creerPcaDemo(): ConnecteurPca {
  const manuel = () => sousModePcaDemo() === "manual";
  return {
    async ouvrirDroit(
      d: { medecin: Medecin; logiciel: string; debut: Date; finPrevue: Date | null },
      cle: string,
    ) {
      const deja = await db().accesCloud.findUnique({ where: { cle } });
      if (deja) return { ref: deja.ref, etat: deja.etat };
      const partenaire = await db().partenaire.findUnique({ where: { ref: d.medecin.partenaireRef } });
      if (!partenaire) throw new NotFound("Partenaire", d.medecin.partenaireRef);
      if (d.logiciel === LOGICIEL_REFUSE_DEMO) {
        throw new CloudAccessDenied("cas de refus prévu dans la base de démonstration");
      }
      const etat: EtatAcces = manuel() ? "a_ouvrir" : "actif";
      const n = (await db().accesCloud.count()) + 1;
      const ref = `${PREFIXE_REFERENCE_FICTIVE}PCA-${String(n).padStart(5, "0")}-${cle.slice(0, 8)}`;
      await db().accesCloud.create({
        data: {
          ref,
          cle,
          partenaireId: partenaire.id,
          logiciel: d.logiciel,
          etat,
          debut: d.debut,
          finPrevue: d.finPrevue,
        },
      });
      return { ref, etat };
    },

    passerEnGrace: (ref) => changer(ref, "grace"),
    suspendre: (ref, motif) => changer(ref, "suspendu", motif),
    retablir: (ref) => changer(ref, "actif"),

    async fermer(ref: string, date: Date) {
      await lire(ref);
      const etat: EtatAcces = manuel() ? "a_fermer" : "ferme";
      await db().accesCloud.update({ where: { ref }, data: { etat, finPrevue: date } });
      return { etat };
    },

    async confirmerTache(ref: string) {
      const acces = await lire(ref);
      const etat: EtatAcces =
        acces.etat === "a_ouvrir" ? "actif" : acces.etat === "a_fermer" ? "ferme" : acces.etat;
      await db().accesCloud.update({ where: { ref }, data: { etat } });
      return { etat };
    },

    async lireDroits(partenaireRef: string): Promise<DroitCloud[]> {
      const acces = await db().accesCloud.findMany({
        where: { partenaire: { ref: partenaireRef } },
        include: { partenaire: true },
        orderBy: { debut: "desc" },
      });
      return acces.map((a) => ({
        ref: a.ref,
        partenaireRef: a.partenaire.ref,
        logiciel: a.logiciel,
        etat: a.etat,
        debut: a.debut,
        finPrevue: a.finPrevue,
        estFictif: a.estFictif,
      }));
    },
  };
}
