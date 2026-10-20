import { dbDemo } from "@/lib/db/demo";
import { dbSite } from "@/lib/db/site";
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

/** Compte du médecin sur la plateforme simulée, créé au premier droit (contrainte d'unicité). */
async function compteDe(partenaireId: number, m: Medecin) {
  const existant = await db().compteCloud.findUnique({ where: { partenaireId } });
  if (existant) return existant;
  try {
    return await db().compteCloud.create({
      data: { ref: `${PREFIXE_REFERENCE_FICTIVE}PCA-C-${String(partenaireId).padStart(5, "0")}`, partenaireId, email: m.email, cabinet: m.cabinet ?? null },
    });
  } catch (e) {
    const cree = await db().compteCloud.findUnique({ where: { partenaireId } });
    if (cree) return cree; // créé au même instant par une autre ouverture
    throw e;
  }
}

/**
 * Sous-mode de la plateforme simulée : réglage de l'écran de démonstration s'il existe (F12,
 * T024), sinon la variable PCA_DEMO_SUBMODE.
 */
export async function sousModeDemo(): Promise<"auto" | "manual"> {
  const reglage = await dbSite().parametre.findUnique({ where: { cle: "demo.pca_sous_mode" } });
  return reglage?.valeur === "manual" || reglage?.valeur === "auto" ? reglage.valeur : sousModePcaDemo();
}

export function creerPcaDemo(): ConnecteurPca {
  const manuel = async () => (await sousModeDemo()) === "manual";
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
      // F12 (FR-003) : un seul compte par médecin, même pour deux ouvertures simultanées.
      const compte = await compteDe(partenaire.id, d.medecin);
      const etat: EtatAcces = (await manuel()) ? "a_ouvrir" : "actif";
      const n = (await db().accesCloud.count()) + 1;
      const ref = `${PREFIXE_REFERENCE_FICTIVE}PCA-${String(n).padStart(5, "0")}-${cle.slice(-8)}`;
      try {
        await db().accesCloud.create({
          data: { ref, cle, partenaireId: partenaire.id, compteId: compte.id, logiciel: d.logiciel, etat, debut: d.debut, finPrevue: d.finPrevue },
        });
      } catch (e) {
        // Même clé rejouée en parallèle : le droit existe déjà.
        const deja = await db().accesCloud.findUnique({ where: { cle } });
        if (deja) return { ref: deja.ref, etat: deja.etat };
        throw e;
      }
      return { ref, etat };
    },

    passerEnGrace: (ref) => changer(ref, "grace"),

    async prolonger(ref: string, finPrevue: Date | null) {
      await lire(ref);
      await db().accesCloud.update({ where: { ref }, data: { etat: "actif", finPrevue, motif: null } });
      return { etat: "actif" as EtatAcces };
    },

    async lireCompte(partenaireRef: string) {
      const c = await db().compteCloud.findFirst({ where: { partenaire: { ref: partenaireRef } } });
      return c ? { ref: c.ref, etat: c.etat } : null;
    },

    async mettreAJourMedecin(m: Medecin) {
      await db().compteCloud.updateMany({ where: { partenaire: { ref: m.partenaireRef } }, data: { email: m.email, cabinet: m.cabinet ?? null } });
    },
    suspendre: (ref, motif) => changer(ref, "suspendu", motif),
    retablir: (ref) => changer(ref, "actif"),

    async fermer(ref: string, date: Date) {
      await lire(ref);
      const etat: EtatAcces = (await manuel()) ? "a_fermer" : "ferme";
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
