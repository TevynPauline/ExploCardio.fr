import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { dbDemo } from "@/lib/db/demo";
import { dbSite } from "@/lib/db/site";
import { OperationDemoInterdite, verifierModeDemonstration } from "@/lib/demo/garde";
import { CATEGORIES, MODELES } from "../../prisma/demo/seed/catalogue";
import { PARTENAIRES } from "../../prisma/demo/seed/partenaires";
import { COMPTES_DEMO } from "../../prisma/site/seed/comptes-demo";
import { remplirJeuDeDepart } from "../../prisma/demo/seed/remplissage";

// T046 : le jeu de départ contient tout le catalogue, une quinzaine de partenaires fictifs,
// chaque cas utile de FR-015 et les cinq comptes de démonstration (SC-006, SC-013).

describe("jeu de données de départ", () => {
  beforeAll(async () => {
    await remplirJeuDeDepart(dbDemo(), dbSite());
  }, 60_000);

  it("contient tout le catalogue de la brochure, sans lampe MedLED", async () => {
    expect(await dbDemo().categorie.count()).toBe(CATEGORIES.length);
    expect(await dbDemo().modeleArticle.count()).toBe(MODELES.length);
    const variantes = MODELES.reduce((n, m) => n + m.variantes.length, 0);
    expect(await dbDemo().variante.count()).toBe(variantes);
    expect(await dbDemo().modeleArticle.count({ where: { nom: { contains: "MedLED", mode: "insensitive" } } })).toBe(0);
    const marques = new Set((await dbDemo().modeleArticle.findMany({ select: { marque: true } })).map((m) => m.marque));
    for (const marque of ["DMS", "SunTech", "Microlife", "IEM", "Norav", "Ergoline", "RAM", "Koch Évolution"]) {
      expect(marques).toContain(marque);
    }
  });

  it("marque chaque prix comme « prix inventé » (décision D6)", async () => {
    expect(await dbDemo().variante.count({ where: { prixInvente: false } })).toBe(0);
  });

  it("reprend les vraies références fabricant connues", async () => {
    const oscar = await dbDemo().variante.findUnique({ where: { defaultCode: "EC-SUN-OSCAR2" } });
    expect(oscar?.referenceFabricant).toBe("99-0133-00");
    const orbit = await dbDemo().variante.findMany({ where: { referenceFabricant: { startsWith: "98-0239-2" } } });
    expect(orbit).toHaveLength(4);
  });

  it("contient une quinzaine de médecins et cabinets fictifs, aux RPPS et SIRET hors des plages réelles", async () => {
    const partenaires = await dbDemo().partenaire.findMany();
    expect(partenaires.length).toBe(PARTENAIRES.length);
    expect(partenaires.length).toBeGreaterThanOrEqual(12);
    for (const p of partenaires) {
      expect(p.estFictif).toBe(true);
      if (p.rpps) expect(p.rpps).toMatch(/^99\d{9}$/);
      if (p.siret) expect(p.siret).toMatch(/^000999\d{8}$/);
    }
  });

  it("couvre chaque cas utile de FR-015", async () => {
    const maintenant = new Date();
    // client sans droits d'assistance
    const sansDroits = await dbDemo().partenaire.findUnique({ where: { ref: "FICT-P-00002" }, include: { droits: true } });
    expect(!sansDroits?.droits || sansDroits.droits.fin < maintenant).toBe(true);
    // client aux droits actifs
    const avecDroits = await dbDemo().partenaire.findUnique({ where: { ref: "FICT-P-00001" }, include: { droits: true } });
    expect(avecDroits?.droits?.fin.getTime()).toBeGreaterThan(maintenant.getTime());
    // location en cours, location en retard de retour
    expect(await dbDemo().abonnement.count({ where: { objet: "mise_a_disposition", etat: "en_cours" } })).toBeGreaterThan(0);
    expect(await dbDemo().abonnement.count({ where: { etat: "en_retard_retour" } })).toBeGreaterThan(0);
    // produit en rupture, produit en « délai X jours »
    expect(await dbDemo().stock.count({ where: { quantite: 0, etatHorsStock: "indisponible" } })).toBeGreaterThan(0);
    expect(await dbDemo().stock.count({ where: { quantite: 0, etatHorsStock: "delai", delaiJours: { gt: 0 } } })).toBeGreaterThan(0);
    // bénéficiaire de l'offre de bienvenue
    expect(await dbDemo().partenaire.count({ where: { bienvenueRecue: true } })).toBeGreaterThan(0);
    // compte en attente de validation (base du site)
    expect(await dbSite().compteClient.count({ where: { statut: "en_attente", estDemonstration: true } })).toBe(1);
  });

  it("crée les cinq comptes de démonstration, rattachés aux partenaires fictifs (FR-041)", async () => {
    const comptes = await dbSite().utilisateur.findMany({
      where: { email: { in: COMPTES_DEMO.map((c) => c.email) } },
      include: { compteClient: true, comptes: true },
    });
    expect(comptes).toHaveLength(5);
    for (const c of comptes) {
      expect(c.comptes[0]?.password).toBeTruthy();
      const attendu = COMPTES_DEMO.find((x) => x.email === c.email)!;
      expect(c.role).toBe(attendu.role);
      if (attendu.role !== "client") expect(c.twoFactorEnabled).toBe(true);
      if (attendu.partenaireRef) expect(c.compteClient?.odooPartnerRef).toBe(attendu.partenaireRef);
    }
  });

  it("ne contient aucune garantie ni demande de SAV, ni donnée de patient (FR-010, FR-039)", async () => {
    const tables = await dbDemo().$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    const noms = tables.map((t) => t.tablename).join(" ");
    expect(noms).not.toMatch(/warranty|garantie|sav|repair|patient/i);
  });
});

describe("refus du remplissage hors démonstration (FR-023)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("refuse quand le connecteur Odoo est réel", () => {
    vi.stubEnv("CONNECTOR_ODOO", "real");
    expect(() => verifierModeDemonstration("remplissage")).toThrow(OperationDemoInterdite);
  });

  it("refuse quand le site est en production", () => {
    vi.stubEnv("SITE_MODE", "prod");
    expect(() => verifierModeDemonstration("remplissage")).toThrow(OperationDemoInterdite);
  });
});
