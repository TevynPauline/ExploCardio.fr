import { expect, it } from "vitest";
import { suiteDeContrat } from "../harness";
import { REF, itDemo } from "./outils";
import { references } from "./references";

suiteDeContrat("odoo", "catalogue (contracts/odoo.md §1)", ({ registre, mode }) => {
  const catalogue = () => registre.odoo().catalogue;

  it("liste les cinq catégories du catalogue, dans l'ordre", async () => {
    const categories = await catalogue().listerCategories();
    expect(categories.map((c) => c.nom)).toEqual([
      "Holter ECG",
      "Holter tensionnel / MAPA",
      "Épreuve / écho d'effort",
      "ECG de repos",
      "Accessoires & consommables",
    ]);
  });

  itDemo("liste les articles d'une catégorie avec prix « à partir de », formules et disponibilité", async () => {
    const articles = await catalogue().listerArticles("holter-ecg");
    expect(articles.length).toBeGreaterThan(0);
    for (const a of articles) {
      expect(a.categorie).toBe("holter-ecg");
      expect(a.prixAPartirDeHt).toBeGreaterThan(0);
      expect(["disponible", "delai", "indisponible"]).toContain(a.disponibilite.etat);
    }
    const dms = articles.find((a) => a.nom === "DMS 300-4L");
    expect(dms?.formules).toEqual(expect.arrayContaining(["achat", "mise_a_disposition", "financement"]));
  });

  itDemo("filtre par marque, par type et par disponibilité", async () => {
    const suntech = await catalogue().listerArticles("mapa", { marque: "SunTech" });
    expect(suntech.length).toBeGreaterThan(0);
    expect(suntech.every((a) => a.marque === "SunTech")).toBe(true);
    const consommables = await catalogue().listerArticles("accessoires", { type: "consommable" });
    expect(consommables.every((a) => a.type === "consommable")).toBe(true);
    const indisponibles = await catalogue().listerArticles("mapa", { disponibilite: "indisponible" });
    expect(indisponibles.map((a) => a.reference)).toContain(REF.enRupture);
  });

  itDemo("lit un article : variantes, prix HT, TVA, offre de mise à disposition et barème", async () => {
    const a = await catalogue().lireArticle(REF.equipementMad);
    expect(a.nom).toBe("DMS 300-4L");
    expect(a.variantes.length).toBeGreaterThanOrEqual(2);
    const v = a.variantes.find((x) => x.defaultCode === REF.equipementMad)!;
    expect(v.prixHt).toBeGreaterThan(0);
    expect(v.tauxTva).toBe(20);
    expect(v.offreMiseADisposition).toMatchObject({
      premierMoisHt: expect.any(Number),
      moisSuivantsHt: expect.any(Number),
    });
    expect(a.baremeFinancement.length).toBeGreaterThan(0);
  });

  it("lève NotFound pour une référence inconnue", async () => {
    await expect(catalogue().lireArticle(references(mode).inconnue!)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("chaque article listé se lit, avec des variantes à prix HT et TVA, sans marque fictive en mode réel", async () => {
    const tous = (await Promise.all((await catalogue().listerCategories()).map((c) => catalogue().listerArticles(c.code)))).flat();
    for (const resume of tous.slice(0, 10)) {
      const a = await catalogue().lireArticle(resume.reference);
      expect(a.variantes.length).toBeGreaterThan(0);
      for (const v of a.variantes) {
        expect(v.prixHt).toBeGreaterThan(0);
        expect(v.tauxTva).toBeGreaterThanOrEqual(0);
        expect(v.quantiteParLot).toBeGreaterThanOrEqual(1);
      }
      if (mode === "real") expect(a.estFictif).toBe(false);
    }
    const index = await catalogue().listerReferences();
    const codes = index.map((r) => r.defaultCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("rapport de contrôle : anomalies bien formées, bloquantes d'abord (F14)", async () => {
    const anomalies = await catalogue().controlerDonnees();
    const objets = ["article", "variante", "categorie", "regle_prix", "client"];
    for (const a of anomalies) {
      expect(objets).toContain(a.objet);
      expect(typeof a.reference).toBe("string");
      expect(typeof a.nom).toBe("string");
      expect(a.code).toMatch(/^[A-Z_]+$/);
      expect(typeof a.bloquant).toBe("boolean");
    }
    const i = anomalies.findIndex((a) => !a.bloquant);
    if (i >= 0) expect(anomalies.slice(i).every((a) => !a.bloquant)).toBe(true);
  });

  itDemo("donne les prix applicables à un client", async () => {
    const prix = await catalogue().lirePrixClient(REF.partenaireDroitsActifs, [REF.consommable, REF.equipement]);
    expect(prix).toHaveLength(2);
    for (const p of prix) {
      expect(p.prixHt).toBeGreaterThan(0);
      expect(p.prixHt).toBeLessThanOrEqual(p.prixCatalogueHt);
    }
  });

  itDemo("recherche par texte et par référence fabricant", async () => {
    const parNom = await catalogue().rechercher("oscar");
    expect(parNom.some((a) => a.nom === "Oscar 2")).toBe(true);
    const parReference = await catalogue().rechercher("98-0239-22");
    expect(parReference.some((a) => a.nom === "Brassard MAPA Orbit")).toBe(true);
  });

  itDemo("liste une ligne par variante pour l'index de recherche (F01)", async () => {
    const references = await catalogue().listerReferences();
    expect(references.length).toBeGreaterThan(40);
    const orbit = references.find((r) => r.referenceFabricant === "98-0239-22");
    expect(orbit).toMatchObject({
      defaultCode: "EC-SUN-ORBIT-M",
      referenceArticle: "EC-SUN-ORBIT-S",
      nom: "Brassard MAPA Orbit",
      marque: "SunTech",
      type: "consommable",
      categorie: "accessoires",
      configuration: "26-34 cm",
    });
    expect(orbit!.prixHt).toBeGreaterThan(0);
    expect(["disponible", "delai", "indisponible"]).toContain(orbit!.disponibilite.etat);
    const codes = references.map((r) => r.defaultCode);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

// F03 — conditionnements, prix dégressifs, mensualités forcées, packs (contracts/odoo.md, F03).
suiteDeContrat("odoo", "catalogue : champs ajoutés par F03", ({ registre }) => {
  const catalogue = () => registre.odoo().catalogue;

  itDemo("chaque variante a une quantité par lot d'au moins 1 ; les électrodes en ont 50 et 500", async () => {
    const a = await catalogue().lireArticle(REF.consommableParLot);
    for (const v of a.variantes) expect(v.quantiteParLot).toBeGreaterThanOrEqual(1);
    expect(a.variantes.map((v) => v.quantiteParLot).sort((x, y) => x - y)).toEqual([50, 500]);
    const equipement = await catalogue().lireArticle(REF.equipement);
    expect(equipement.variantes.every((v) => v.quantiteParLot === 1)).toBe(true);
  });

  itDemo("les paliers dégressifs sont triés par quantité croissante et prix décroissant, sous le prix de base", async () => {
    const a = await catalogue().lireArticle(REF.consommableParLot);
    const v = a.variantes.find((x) => x.defaultCode === REF.consommableParLot)!;
    expect(v.paliers.length).toBeGreaterThan(0);
    for (let i = 0; i < v.paliers.length; i++) {
      const p = v.paliers[i]!;
      expect(p.quantiteMin).toBeGreaterThan(1);
      expect(p.prixHt).toBeLessThan(v.prixHt);
      if (i > 0) {
        expect(p.quantiteMin).toBeGreaterThan(v.paliers[i - 1]!.quantiteMin);
        expect(p.prixHt).toBeLessThan(v.paliers[i - 1]!.prixHt);
      }
    }
  });

  itDemo("les mensualités forcées pour tous portent une durée du barème", async () => {
    const references = await catalogue().listerReferences();
    let trouvees = 0;
    for (const ref of new Set(references.filter((r) => r.type === "equipement").map((r) => r.referenceArticle))) {
      const a = await catalogue().lireArticle(ref);
      const durees = a.baremeFinancement.map((b) => b.dureeMois);
      for (const v of a.variantes) {
        for (const m of v.mensualitesForcees) {
          trouvees++;
          expect(durees).toContain(m.dureeMois);
          expect(m.montantHt).toBeGreaterThan(0);
        }
      }
    }
    expect(trouvees).toBeGreaterThan(0);
  });

  itDemo("donne les mensualités forcées propres à un client, vides sinon", async () => {
    const [force] = await catalogue().lirePrixClient(REF.partenaireMensualiteForcee, [REF.equipementMad]);
    expect(force!.mensualitesForcees.length).toBeGreaterThan(0);
    const a = await catalogue().lireArticle(REF.equipementMad);
    const durees = a.baremeFinancement.map((b) => b.dureeMois);
    for (const m of force!.mensualitesForcees) expect(durees).toContain(m.dureeMois);
    const [autre] = await catalogue().lirePrixClient(REF.partenaireSansDroits, [REF.equipementMad]);
    expect(autre!.mensualitesForcees).toEqual([]);
  });

  itDemo("lève NotFound pour un client inconnu", async () => {
    await expect(catalogue().lirePrixClient("FICT-P-INCONNU", [REF.equipement])).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  itDemo("donne la quantité en stock et le délai de réassort (consommables)", async () => {
    const [d] = await registre.odoo().stock.lireDisponibilite([REF.consommableParLot]);
    expect(d!.quantiteDisponible).toEqual(expect.any(Number));
    expect(d!.quantiteDisponible).toBeGreaterThanOrEqual(0);
    expect(d!.delaiReassortJours === null || d!.delaiReassortJours > 0).toBe(true);
    const [rupture] = await registre.odoo().stock.lireDisponibilite([REF.enRupture]);
    expect(rupture!.delaiReassortJours).toBeNull();
  });

  itDemo("un pack n'est pas plus disponible que ses composants", async () => {
    const a = await catalogue().lireArticle(REF.pack);
    const pack = a.variantes.find((v) => v.defaultCode === REF.pack)!;
    expect(pack.composants.length).toBeGreaterThan(0);
    const dispos = await registre.odoo().stock.lireDisponibilite([REF.pack, ...pack.composants]);
    const rang = (e: (typeof dispos)[number]["achat"]) => (e.etat === "disponible" ? 0 : e.etat === "delai" ? 1 + e.delaiJours / 1000 : 9);
    const duPack = rang(dispos.find((d) => d.defaultCode === REF.pack)!.achat);
    for (const c of pack.composants) expect(duPack).toBeGreaterThanOrEqual(rang(dispos.find((d) => d.defaultCode === c)!.achat));
  });
});
