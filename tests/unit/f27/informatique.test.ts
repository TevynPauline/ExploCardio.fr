import { describe, expect, it } from "vitest";
import { lienPcaValide, LIEN_PCA_DEFAUT } from "@/domaine/informatique/partenaire";
import { normaliser, SAISIE_VIDE, validerEtape, validerQuestionnaire, type SaisieQuestionnaire } from "@/domaine/informatique/questionnaire";
import { CLES_TEXTES_IM, TEXTES_IM_DEFAUT, textesInformatique } from "@/domaine/informatique/textes";

// F27 : questionnaire (contracts/questionnaire.md), textes de la page, lien suivi PCA.

const complet: SaisieQuestionnaire = {
  ...SAISIE_VIDE,
  interets: ["acces_distance"],
  medecins: "2",
  postes: "4",
  secretariat: "oui",
  logiciels: { holter: "cardioscan", mapa: "autre", effort: "ne_sait_pas" },
  precisions: { holter: "", mapa: "Logiciel X", effort: "" },
  prestataireActuel: "non",
  delai: "vite",
  nom: "Dr Martin",
  cabinet: "Cabinet du Parc",
  codePostal: "75011",
  email: "Martin@Cabinet.fr ",
  telephone: "01 23 45 67 89",
  creneau: "matin",
  consentement: true,
};

describe("questionnaire", () => {
  it("étape 1 vide : sujets, nombres et secrétariat signalés", () => {
    expect(Object.keys(validerEtape(0, SAISIE_VIDE)).sort()).toEqual(["interets", "medecins", "postes", "secretariat"]);
    expect(validerEtape(0, { ...complet, medecins: "51" }).medecins).toBe("Indiquez un nombre entre 1 et 50.");
  });
  it("étape 2 : « autre » exige une précision courte", () => {
    expect(validerEtape(1, { ...complet, precisions: { ...complet.precisions, mapa: "" } })["precisions.mapa"]).toBe("Précisez le logiciel.");
    expect(validerEtape(1, { ...complet, precisions: { ...complet.precisions, mapa: "x".repeat(61) } })["precisions.mapa"]).toContain("60");
  });
  it("étape 3 : téléphone français, code postal, consentement", () => {
    const e = validerEtape(2, { ...complet, telephone: "123", codePostal: "7501", consentement: false });
    expect(Object.keys(e).sort()).toEqual(["codePostal", "consentement", "telephone"]);
    expect(validerEtape(2, { ...complet, telephone: "+33 6 12 34 56 78" })).toEqual({});
  });
  it("validation complète : première étape en erreur, ou aucune", () => {
    expect(validerQuestionnaire(complet)).toEqual({ erreurs: {}, etape: null });
    expect(validerQuestionnaire({ ...complet, creneau: "" }).etape).toBe(2);
  });
  it("données enregistrées : précision seulement pour « autre », email en minuscules", () => {
    const d = normaliser(complet);
    expect(d.logiciels).toEqual({ holter: { choix: "cardioscan" }, mapa: { choix: "autre", precision: "Logiciel X" }, effort: { choix: "ne_sait_pas" } });
    expect(d.coordonnees.email).toBe("martin@cabinet.fr");
    expect(d).toMatchObject({ medecins: 2, postes: 4, secretariat: true });
  });
});

describe("textes de la page", () => {
  it("valeurs de départ ; étape 2 sans nommer de personne", () => {
    expect(TEXTES_IM_DEFAUT["informatique.etape-2"]).toEqual({ titre: "On vous appelle", corps: "Nous précisons avec vous votre cabinet et vos logiciels." });
    expect(JSON.stringify(TEXTES_IM_DEFAUT)).not.toContain("Régis");
  });
  it("repli sur la valeur de départ pour un texte vide", () => {
    const t = textesInformatique([{ cle: "informatique.entete", titre: " ", corps: "Autre phrase" }]);
    expect(t["informatique.entete"]).toEqual({ titre: TEXTES_IM_DEFAUT["informatique.entete"].titre, corps: "Autre phrase" });
    expect(Object.keys(t)).toEqual(CLES_TEXTES_IM);
  });
});

describe("lien suivi vers PCA", () => {
  it("adresse https gardée telle quelle ; sinon le site public", () => {
    expect(lienPcaValide("https://patient-care-anywhere.com/?ref=explocardio")).toBe("https://patient-care-anywhere.com/?ref=explocardio");
    expect(lienPcaValide("http://exemple.fr")).toBe(LIEN_PCA_DEFAUT);
    expect(lienPcaValide("pas une adresse")).toBe(LIEN_PCA_DEFAUT);
    expect(lienPcaValide(null)).toBe(LIEN_PCA_DEFAUT);
  });
});
