import { afterAll, describe, expect, it } from "vitest";
import { dbDemo } from "@/lib/db/demo";
import { dbSite } from "@/lib/db/site";
import { copierEnOpportunite, DemandeRefusee, envoyerDemande, preparerDemande, type SaisieDemande } from "@/domaine/financement/demande";
import { compteValide, nettoyer, remplirPanier } from "../commande/outils";

// T029 — demande de financement (F04, US6, FR-033 à FR-037).

afterAll(nettoyer);

const cabinet = { nom: "Cabinet du Test", siret: "", adresse: "1 rue du Test, 69003 Lyon", praticiens: 2 };
const saisie = (equipements: SaisieDemande["equipements"], dureeMois = 36, depuisPanier = false): SaisieDemande => ({ equipements, dureeMois, cabinet, telephone: "", depuisPanier });

describe("demande de financement", () => {
  it("préremplie depuis une fiche : équipement, durées du barème, mention indicative, cabinet", async () => {
    const c = await compteValide();
    const p = await preparerDemande(c.compteId, { article: "EC-DMS-3004L" });
    expect(p.equipements).toHaveLength(1);
    expect(p.durees).toEqual([24, 36, 48, 60]);
    // 1 690 € × 3,08 % ≈ 52,05 € HT / mois sur 36 mois.
    expect(p.equipements[0]!.mensualites.find((m) => m.dureeMois === 36)!.montantHt).toBe(Math.round(169000 * 0.0308));
    expect(p.mention).toMatch(/indicatif/i);
    expect(p.cabinet.adresse).toContain("1 rue du Test");
  });

  it("montant forcé pour ce client repris dans la mensualité indicative", async () => {
    const c = await compteValide();
    const partenaire = await dbDemo().partenaire.findUniqueOrThrow({ where: { ref: c.partenaireRef } });
    await dbDemo().listePrix.create({ data: { nom: "Test forcé", partenaireId: partenaire.id, regles: [{ defaultCode: "EC-DMS-3004L", dureeMois: 36, mensualiteCentimes: 4500 }] } });
    const p = await preparerDemande(c.compteId, { article: "EC-DMS-3004L" });
    expect(p.equipements[0]!.mensualites.find((m) => m.dureeMois === 36)!.montantHt).toBe(4500);
  });

  it("enregistrée « reçue », copiée en opportunité, email sans nom d'organisme ; doublon signalé", async () => {
    const c = await compteValide();
    const { id } = await envoyerDemande(c.compteId, saisie([{ defaultCode: "EC-DMS-3004L", quantite: 2 }]));
    const d = await dbSite().demandeFinancement.findUniqueOrThrow({ where: { id } });
    expect(d).toMatchObject({ statut: "recue", dureeMois: 36, mensualiteIndicativeHt: 2 * Math.round(169000 * 0.0308) });
    expect(d.opportuniteRef).toMatch(/CRM/);
    expect(d.cabinet).toMatchObject({ nom: "Cabinet du Test", praticiens: 2 });
    const email = await dbSite().messageDemonstration.findFirstOrThrow({ where: { destinataire: c.email, objet: "Votre demande de financement" } });
    expect(email.rendu).toContain("36 mois");
    expect(email.rendu).not.toMatch(/Grenke|Locam|BNP|Leasecom|Franfinance/i);
    await expect(envoyerDemande(c.compteId, saisie([{ defaultCode: "EC-DMS-3004L", quantite: 1 }], 48))).rejects.toThrow(/déjà une demande en cours/);
  });

  it("saisie invalide : durée hors barème, équipement non finançable, cabinet manquant", async () => {
    const c = await compteValide();
    const r = await envoyerDemande(c.compteId, { ...saisie([{ defaultCode: "EC-ELEC-HOLTER-50", quantite: 1 }], 12), cabinet: { ...cabinet, nom: "" } }).catch((e) => e);
    expect(r).toBeInstanceOf(DemandeRefusee);
    expect((r as DemandeRefusee).erreurs).toMatchObject({ equipements: expect.any(String), cabinet: expect.any(String) });
    const r2 = await envoyerDemande(c.compteId, saisie([{ defaultCode: "EC-DMS-3004L", quantite: 1 }], 12)).catch((e) => e);
    expect((r2 as DemandeRefusee).erreurs.duree).toBeDefined();
  });

  it("depuis le panier : seuls les équipements financés quittent le panier", async () => {
    const c = await compteValide();
    await remplirPanier(c.compteId, [
      { defaultCode: "EC-DMS-3004L", formule: "achat", quantite: 1 },
      { defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 2 },
    ]);
    const p = await preparerDemande(c.compteId, { panier: true });
    expect(p.equipements.map((e) => e.defaultCode)).toEqual(["EC-DMS-3004L"]);
    await envoyerDemande(c.compteId, saisie([{ defaultCode: "EC-DMS-3004L", quantite: 1 }], 60, true));
    const panier = await dbSite().panier.findUniqueOrThrow({ where: { compteId: c.compteId }, include: { lignes: true } });
    expect(panier.lignes.map((l) => l.defaultCode)).toEqual(["EC-ELEC-HOLTER-50"]);
  });

  it("compte en attente accepté ; compte suspendu refusé", async () => {
    const attente = await compteValide({ statut: "en_attente" });
    await expect(envoyerDemande(attente.compteId, saisie([{ defaultCode: "EC-DMS-3004L", quantite: 1 }]))).resolves.toHaveProperty("id");
    const suspendu = await compteValide({ statut: "suspendu" });
    await expect(preparerDemande(suspendu.compteId, { article: "EC-DMS-3004L" })).rejects.toThrow(DemandeRefusee);
  });

  it("Odoo injoignable : la copie est reportée (file d'attente) puis faite au rejeu", async () => {
    const c = await compteValide();
    const { id } = await envoyerDemande(c.compteId, saisie([{ defaultCode: "EC-DMS-3004L", quantite: 1 }], 24));
    await dbSite().demandeFinancement.update({ where: { id }, data: { opportuniteRef: null } });
    await dbDemo().opportunite.deleteMany({ where: { referenceDemande: id } });
    await dbSite().panneSimulee.upsert({ where: { connecteur: "odoo" }, create: { connecteur: "odoo", active: true }, update: { active: true } });
    try {
      expect(await copierEnOpportunite(id)).toBe(false);
      expect((await dbSite().demandeFinancement.findUniqueOrThrow({ where: { id } })).opportuniteRef).toBeNull();
    } finally {
      await dbSite().panneSimulee.update({ where: { connecteur: "odoo" }, data: { active: false } });
    }
    expect(await copierEnOpportunite(id, { depuisFile: true })).toBe(true);
    expect((await dbSite().demandeFinancement.findUniqueOrThrow({ where: { id } })).opportuniteRef).toMatch(/CRM/);
  });
});
