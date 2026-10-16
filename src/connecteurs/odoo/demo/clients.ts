import { NotFound } from "../../erreurs";
import type { AdressePartenaire, ClientsOdoo, IdentitePartenaire, Partenaire, SituationClient } from "../interfaces";
import { commandesDemo } from "./commandes";
import { facturesDemo } from "./factures";
import { fideliteDemo } from "./fidelite";
import { locationDemo } from "./location";
import { db, prochaineReference } from "./outils";

// Domaine « Clients » en démonstration (contracts/odoo.md §3).

type PartenaireBase = {
  ref: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  rpps: string | null;
  siret: string | null;
  adresses: unknown;
  estFictif: boolean;
};

export function versPartenaire(p: PartenaireBase): Partenaire {
  return {
    ref: p.ref,
    nom: p.nom,
    email: p.email,
    telephone: p.telephone,
    rpps: p.rpps,
    siret: p.siret,
    adresses: p.adresses as AdressePartenaire[],
    estFictif: p.estFictif,
  };
}

export const clientsDemo: ClientsOdoo = {
  async creerOuRetrouverPartenaire(identite: IdentitePartenaire, cle: string) {
    return db().$transaction(async (tx) => {
      const existant = await tx.partenaire.findFirst({
        where: {
          OR: [
            { cleCreation: cle },
            ...(identite.rpps ? [{ rpps: identite.rpps }] : []),
            ...(identite.siret ? [{ siret: identite.siret, estSociete: true }] : []),
          ],
        },
      });
      if (existant) return { ref: existant.ref, cree: false };
      const ref = await prochaineReference(tx, "P");
      await tx.partenaire.create({
        data: {
          ref,
          nom: identite.nom,
          estSociete: !identite.rpps && Boolean(identite.siret),
          email: identite.email,
          telephone: identite.telephone ?? null,
          rpps: identite.rpps ?? null,
          siret: identite.siret ?? null,
          adresses: identite.adresses,
          cleCreation: cle,
        },
      });
      return { ref, cree: true };
    });
  },

  async mettreAJourCoordonnees(ref, coordonnees) {
    const p = await db().partenaire.findUnique({ where: { ref } });
    if (!p) throw new NotFound("Partenaire", ref);
    await db().partenaire.update({
      where: { ref },
      data: {
        ...(coordonnees.nom !== undefined ? { nom: coordonnees.nom } : {}),
        ...(coordonnees.email !== undefined ? { email: coordonnees.email } : {}),
        ...(coordonnees.telephone !== undefined ? { telephone: coordonnees.telephone } : {}),
        ...(coordonnees.adresses !== undefined ? { adresses: coordonnees.adresses } : {}),
      },
    });
  },

  async archiverPartenaire(ref: string) {
    const p = await db().partenaire.findUnique({ where: { ref } });
    if (!p) throw new NotFound("Partenaire", ref);
    if (!p.archive) await db().partenaire.update({ where: { ref }, data: { archive: true } });
  },

  async lireSituation(ref: string): Promise<SituationClient> {
    const p = await db().partenaire.findUnique({ where: { ref } });
    if (!p) throw new NotFound("Partenaire", ref);
    const [commandes, factures, locations, droits] = await Promise.all([
      commandesDemo.listerCommandes(ref),
      facturesDemo.listerFactures(ref),
      locationDemo.listerLocations(ref),
      fideliteDemo.lireDroitsAssistance(ref),
    ]);
    return {
      partenaire: versPartenaire(p),
      commandesRecentes: commandes.slice(0, 10),
      factures,
      locations,
      droitsAssistance: droits,
    };
  },
};
