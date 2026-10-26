import { afterAll, describe, expect, it } from "vitest";
import { enregistrerNumero, NumeroRefuse, numeroManquant, refuserNumero, verifierNumero } from "@/domaine/comptes/verification-numero";
import { dbSite } from "@/lib/db/site";
import { comptesCrees, compteValide } from "../commande/outils";

// T028 — numéro d'entreprise vérifié après coup (F16, US7, FR-023 à FR-026, FR-034, FR-035).

const equipe = { id: "test-equipe", libelle: "Équipe de test" };

afterAll(async () => {
  await dbSite().utilisateur.deleteMany({ where: { id: { in: comptesCrees } } });
});

async function compteSansNumero() {
  const c = await compteValide();
  await dbSite().compteClient.update({ where: { id: c.compteId }, data: { siret: null, numeroVerification: null } });
  return c;
}

describe("numéro d'entreprise", () => {
  it("saisi : contrôlé dans sa forme, « à vérifier », journalisé ; plus demandé ensuite", async () => {
    const c = await compteSansNumero();
    expect(numeroManquant(await dbSite().compteClient.findUniqueOrThrow({ where: { id: c.compteId } }))).toBe(true);
    await expect(enregistrerNumero(c.compteId, "123")).rejects.toThrow(NumeroRefuse);
    await enregistrerNumero(c.compteId, "732 829 320");
    const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { id: c.compteId } });
    expect(compte).toMatchObject({ siret: "732829320", numeroVerification: "a_verifier" });
    expect(numeroManquant(compte)).toBe(false);
    expect(await dbSite().journalAction.count({ where: { objet: c.compteId, action: "comptes.numero_saisi" } })).toBe(1);
  });

  it("vérifié par l'équipe ; un nouveau numéro repasse « à vérifier »", async () => {
    const c = await compteSansNumero();
    await enregistrerNumero(c.compteId, "73282932000074");
    await verifierNumero(c.compteId, equipe);
    expect(await dbSite().compteClient.findUniqueOrThrow({ where: { id: c.compteId } })).toMatchObject({ numeroVerification: "verifie", numeroVerifiePar: "Équipe de test" });
    await enregistrerNumero(c.compteId, "732829320");
    expect((await dbSite().compteClient.findUniqueOrThrow({ where: { id: c.compteId } })).numeroVerification).toBe("a_verifier");
  });

  it("refusé : motif obligatoire, compte suspendu, email « Votre numéro d'entreprise », journal", async () => {
    const c = await compteSansNumero();
    await enregistrerNumero(c.compteId, "73282932000074");
    await expect(refuserNumero(c.compteId, equipe, "")).rejects.toThrow(/motif/);
    await refuserNumero(c.compteId, equipe, "aucune entreprise en activité sous ce numéro");
    const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { id: c.compteId } });
    expect(compte).toMatchObject({ statut: "suspendu", numeroVerification: "refuse", motifRefusNumero: "aucune entreprise en activité sous ce numéro" });
    const email = await dbSite().messageDemonstration.findFirst({ where: { destinataire: c.email, objet: "Votre numéro d'entreprise" } });
    expect(email?.rendu).toContain("aucune entreprise en activité sous ce numéro");
    expect(await dbSite().journalAction.count({ where: { objet: c.compteId, action: "comptes.numero_refuse" } })).toBe(1);
  });
});
