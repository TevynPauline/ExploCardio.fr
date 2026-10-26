import { afterAll, describe, expect, it } from "vitest";
import { creerRegistre } from "@/connecteurs/registre";
import { dbDemo } from "@/lib/db/demo";
import { dbSite } from "@/lib/db/site";
import { ecrireParametre } from "@/lib/parametres";
import { cadeauPourCommande, confirmerCadeauRemis, etatBienvenue, ouvrirDroitSiEligible, retablirCadeau } from "@/domaine/comptes/bienvenue";
import { confirmerEmail, inscrire } from "@/domaine/comptes/inscription";
import { changerAbonnement } from "@/domaine/comptes/newsletter";
import { saisieDeTest, sirenDeTest } from "./outils";

// T031 (US4, FR-017 à FR-025, SC-002, SC-009).

const registre = creerRegistre(process.env);
const CADEAU = "EC-BIENVENUE-TENSIOMETRE";

/** F16 : compte validé à la confirmation de l'email ; le cadeau suit le numéro d'entreprise. */
async function compteValide(options: { newsletter?: boolean; numero?: string } = {}) {
  const s = saisieDeTest({ newsletter: options.newsletter ?? true, numero: options.numero ?? sirenDeTest() });
  await inscrire(s);
  const c = await dbSite().compteClient.findFirstOrThrow({ where: { utilisateur: { email: s.email } } });
  await confirmerEmail(c.utilisateurId);
  const v = await dbSite().compteClient.findUniqueOrThrow({ where: { id: c.id } });
  return { ...v, email: s.email };
}

const stockCadeau = async () =>
  (await dbDemo().stock.findFirstOrThrow({ where: { variante: { defaultCode: CADEAU } } })).quantite;

async function premiereCommande(compte: Awaited<ReturnType<typeof compteValide>>, cle: string) {
  const ligne = await cadeauPourCommande(compte);
  const lignes = [{ defaultCode: "EC-ELEC-HOLTER-50", quantite: 1 }, ...(ligne ? [ligne] : [])];
  const { ref } = await registre.odoo().commandes.creerCommandePayee(
    { partenaireRef: compte.odooPartnerRef!, lignes, livraison: { adresse: "x", codePostal: "69003", ville: "Lyon", fraisPortHt: 0 }, paiement: { mode: "carte", reference: `FICT-PAY-${cle}` } },
    cle,
  );
  if (ligne) await confirmerCadeauRemis(compte, ref);
  return { ref, avecCadeau: Boolean(ligne) };
}

describe("offre de bienvenue", () => {
  afterAll(async () => {
    await ecrireParametre("bienvenue.active", "true", null);
  });

  it("validation d'un compte abonné : bénéficiaire ; première commande avec ligne à 0 € et stock décompté ; deuxième sans cadeau", async () => {
    const c = await compteValide();
    expect((await etatBienvenue(c.id)).etat).toBe("beneficiaire");
    const avant = await stockCadeau();
    const premiere = await premiereCommande(c, `bienvenue-1-${c.id}`);
    expect(premiere.avecCadeau).toBe(true);
    const lue = await registre.odoo().commandes.lireCommande(premiere.ref);
    expect(lue.lignes.find((l) => l.defaultCode === CADEAU)?.prixUnitaireHt).toBe(0);
    expect(await stockCadeau()).toBe(avant - 1);
    expect((await etatBienvenue(c.id)).etat).toBe("recu");
    expect((await premiereCommande(c, `bienvenue-2-${c.id}`)).avecCadeau).toBe(false);
  });

  it("non abonné : pas de droit ; abonnement tardif : droit ouvert ; désabonnement : droit conservé", async () => {
    const c = await compteValide({ newsletter: false });
    expect((await etatBienvenue(c.id)).etat).toBe("non_abonne");
    await changerAbonnement(c.id, true);
    expect((await etatBienvenue(c.id)).etat).toBe("beneficiaire");
    await changerAbonnement(c.id, false);
    expect((await etatBienvenue(c.id)).etat).toBe("beneficiaire");
  });

  it("offre désactivée : nouveaux comptes non bénéficiaires, droits existants conservés", async () => {
    const ancien = await compteValide();
    await ecrireParametre("bienvenue.active", "false", null);
    const nouveau = await compteValide();
    expect((await etatBienvenue(nouveau.id)).etat).toBe("inactive");
    expect(await cadeauPourCommande(ancien)).not.toBeNull();
    await ecrireParametre("bienvenue.active", "true", null);
  });

  it("SC-002 : 20 commandes simultanées pour un même numéro → un seul cadeau", async () => {
    const c = await compteValide();
    const resultats = await Promise.all(
      Array.from({ length: 20 }, async (_, i) => {
        const ref = `FICT-SO-SIMULTANE-${c.id}-${i}`;
        return confirmerCadeauRemis(c, ref);
      }),
    );
    expect(resultats.filter((r) => r === "remis" || r === "en_attente_stock")).toHaveLength(1);
    expect(await dbSite().attributionCadeau.count({ where: { numero: c.siret! } })).toBe(1);
  });

  it("un même numéro ne s'ouvre qu'une fois ; deux numéros différents ont chacun leur cadeau", async () => {
    const a = await compteValide();
    expect(await ouvrirDroitSiEligible(a.id)).toBe(false); // déjà ouvert à la validation
    const b = await compteValide();
    expect(a.siret).not.toBe(b.siret);
    expect((await etatBienvenue(b.id)).etat).toBe("beneficiaire");
  });

  it("rupture : commande non retardée, état « en attente de stock », bénéficiaire et équipe prévenus", async () => {
    const c = await compteValide();
    const stock = await dbDemo().stock.findFirstOrThrow({ where: { variante: { defaultCode: CADEAU } } });
    await dbDemo().stock.update({ where: { id: stock.id }, data: { quantite: 0, etatHorsStock: "delai", delaiJours: 10 } });
    try {
      const r = await premiereCommande(c, `rupture-${c.id}`);
      expect(r.avecCadeau).toBe(true);
      expect((await etatBienvenue(c.id)).etat).toBe("en_attente_stock");
      expect(await dbSite().messageDemonstration.count({ where: { destinataire: c.email, objet: "Votre cadeau de bienvenue arrive bientôt" } })).toBe(1);
      expect(await dbSite().messageDemonstration.count({ where: { objet: "Cadeau de bienvenue en rupture", rendu: { contains: r.ref } } })).toBe(1);
    } finally {
      await dbDemo().stock.update({ where: { id: stock.id }, data: { quantite: stock.quantite, etatHorsStock: stock.etatHorsStock, delaiJours: stock.delaiJours } });
    }
  });

  it("première commande annulée avant expédition : droit rétabli", async () => {
    const c = await compteValide();
    const r = await premiereCommande(c, `annulee-${c.id}`);
    expect(await retablirCadeau(r.ref)).toBe(true);
    expect((await etatBienvenue(c.id)).etat).toBe("beneficiaire");
  });

  it("un SIRET partagé par deux comptes d'un même cabinet : un seul cadeau (F16)", async () => {
    const siret = "73282932000074";
    await dbSite().attributionCadeau.deleteMany({ where: { numero: siret } });
    const premier = await compteValide({ numero: siret });
    const second = await compteValide({ numero: "732 829 320 00074" });
    expect((await etatBienvenue(premier.id)).etat).toBe("beneficiaire");
    expect((await etatBienvenue(second.id)).etat).not.toBe("beneficiaire");
    await dbSite().attributionCadeau.deleteMany({ where: { numero: siret } });
    await dbSite().utilisateur.deleteMany({ where: { compteClient: { siret } } });
  });

});
