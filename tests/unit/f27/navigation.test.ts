import { describe, expect, it } from "vitest";
import type { Article, Categorie } from "@/connecteurs/odoo/interfaces";
import type { EntreeCatalogue } from "@/domaine/catalogue/lecture";
import { grouperConsommables } from "@/domaine/catalogue/consommables";
import { construireNavigation, entreeConsommables, entreeProduits, ENTREES_FIXES, LIENS_SECONDAIRES } from "@/domaine/navigation";

// F27 (contracts/navigation.md) : construction des cinq entrées du menu.

const c = (code: string, nom: string, parentCode: string | null, niveau: 0 | 1 | 2): Categorie => ({ code, nom, parentCode, niveau, rubrique: code.split("/")[0]!, ordre: 0, estFictif: true });
const arbre: Categorie[] = [
  c("holter-ecg", "Holter ECG", null, 0),
  c("mapa", "Holter tensionnel / MAPA", null, 0),
  c("effort", "Épreuve d'effort", null, 0),
  c("ecg-repos", "ECG de repos", null, 0),
  c("accessoires", "Accessoires & consommables", null, 0),
  c("holter-ecg/enregistreurs-holter-ecg", "Enregistreurs Holter ECG", "holter-ecg", 1),
  c("holter-ecg/accessoires-holter-ecg", "Accessoires Holter ECG", "holter-ecg", 1),
  c("holter-ecg/accessoires-holter-ecg/cables-pour-holter-ecg", "Câbles pour Holter ECG", "holter-ecg/accessoires-holter-ecg", 2),
  c("holter-ecg/accessoires-holter-ecg/sacoches-pour-holter-ecg", "Sacoches pour Holter ECG", "holter-ecg/accessoires-holter-ecg", 2),
  c("mapa/consommables-mapa", "Consommables MAPA", "mapa", 1),
  c("mapa/vide", "Vide", "mapa", 1),
];

let n = 0;
function entree(nom: string, categorie: string, categorieDetail: string, type: Article["type"] = "equipement"): EntreeCatalogue {
  n++;
  return {
    chemin: `/${categorie}/article-${n}`,
    disponibilites: new Map(),
    contenu: {} as EntreeCatalogue["contenu"],
    article: { reference: `R${n}`, nom, marque: "M", type, categorie, categorieDetail } as Article,
  };
}
const entrees = [
  entree("DMS 300-4L", "holter-ecg", "holter-ecg/enregistreurs-holter-ecg"),
  entree("Câble HDMI", "holter-ecg", "holter-ecg/accessoires-holter-ecg/cables-pour-holter-ecg", "accessoire"),
  entree("SaniCuff", "mapa", "mapa/consommables-mapa", "consommable"),
  entree("Électrodes Skintact", "accessoires", "accessoires", "consommable"),
];

describe("menu « Produits »", () => {
  const p = entreeProduits(arbre, entrees);
  it("quatre colonnes dans l'ordre, vers les pages de famille", () => {
    expect(p.colonnes.map((x) => [x.titre, x.href])).toEqual([
      ["Holter ECG", "/holter-ecg"],
      ["Holter tensionnel / MAPA", "/holter-tensionnel"],
      ["Épreuve d'effort", "/epreuve-effort"],
      ["ECG de repos", "/holter-ecg/ecg-de-repos"],
    ]);
    expect(p.lienFinal).toEqual({ libelle: "Voir tous les produits", href: "/catalogue" });
    expect(p.carte).toBeNull();
  });
  it("trois niveaux ; catégories vides masquées ; niveau 2 en gras s'il a des sous-niveaux", () => {
    const holter = p.colonnes[0]!;
    expect(holter.liens.map((l) => l.libelle)).toEqual(["Enregistreurs Holter ECG", "Accessoires Holter ECG"]);
    const acc = holter.liens[1]!;
    expect(acc.enGras).toBe(true);
    expect(acc.sousLiens).toEqual([{ libelle: "Câbles pour Holter ECG", href: "/holter-ecg?categorie=holter-ecg%2Faccessoires-holter-ecg%2Fcables-pour-holter-ecg" }]);
    expect(p.colonnes[1]!.liens.map((l) => l.libelle)).toEqual(["Consommables MAPA"]);
  });
  it("connecteur indisponible : titres et liens de famille seulement", () => {
    const vide = entreeProduits([], []);
    expect(vide.colonnes).toHaveLength(4);
    expect(vide.colonnes.every((x) => x.liens.length === 0 && x.href)).toBe(true);
  });
});

describe("menu « Consommables »", () => {
  it("par examen, consommables seulement, colonnes vides masquées", () => {
    const e = entreeConsommables(entrees);
    expect(e.colonnes.map((x) => x.titre)).toEqual(["Pour la MAPA", "Autres consommables"]);
    expect(e.colonnes[0]!.liens.map((l) => l.libelle)).toEqual(["SaniCuff"]);
    expect(e.lienFinal?.href).toBe("/consommables");
  });
  it("un consommable reste visible dans « Produits »", () => {
    expect(entreeProduits(arbre, entrees).colonnes[1]!.liens[0]!.libelle).toBe("Consommables MAPA");
    expect(grouperConsommables(entrees).flatMap((g) => g.entrees.map((x) => x.article.nom))).toEqual(["SaniCuff", "Électrodes Skintact"]);
  });
});

describe("barre complète", () => {
  it("cinq entrées dans l'ordre et deux liens secondaires", () => {
    const nav = construireNavigation(arbre, entrees);
    expect(nav.entrees.map((e) => e.libelle)).toEqual(["Produits", "Consommables", "Informatique médicale", "Location et financement", "Services"]);
    expect(nav.liensSecondaires).toEqual(LIENS_SECONDAIRES);
  });
  it("Services sans hébergement ; Informatique médicale mène aux sections de sa page", () => {
    const services = ENTREES_FIXES.services.colonnes.flatMap((x) => x.liens.map((l) => l.href));
    expect(services).toEqual(["/services/assistance", "/aide", "/services/installation-formation"]);
    const im = ENTREES_FIXES.informatique.colonnes.flatMap((x) => x.liens.map((l) => l.href));
    expect(im.every((h) => h.startsWith("/informatique-medicale#"))).toBe(true);
    expect(ENTREES_FIXES.informatique.carte?.bouton.href).toBe("/informatique-medicale#questionnaire");
  });
});
