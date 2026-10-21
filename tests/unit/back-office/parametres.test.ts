import { execSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { definition, lireTheme, modifierParametre, ParametreRefuse, PARAMETRES, remettreValeur, versSaisie } from "@/domaine/parametres";
import { valider } from "@/domaine/parametres/validation";
import { dbSite } from "@/lib/db/site";
import { lireParametre } from "@/lib/parametres";

// T015 — paramètres de fonctionnement (F13, US4, FR-015 à FR-019, SC-006).

const admin = { id: "", libelle: "Test (admin)" };
const saisie = (valeurs: Record<string, string>) => (nom: string) => valeurs[nom] ?? "";
const def = (cle: string) => definition(cle)!;

// Paramètres réglés ailleurs : textes et coordonnées (Contenus), emails (F10), services (F03),
// outils de démonstration.
const AILLEURS = /^(contact\.(adresse|email|telephone|motifs)|accueil\.|location\.conditions|cloud\.aide_premiere_connexion|financement\.|services\.|emailing\.|demo\.)/;

const CLES = ["commande.heure_limite_express", "comptes.specialites", "bienvenue.active", "livraison.delai_zones_jours"];
let sauvegarde: { cle: string; valeur: string; type: string }[] = [];

beforeAll(async () => {
  admin.id = (await dbSite().utilisateur.findFirstOrThrow({ where: { role: "admin" } })).id;
  sauvegarde = await dbSite().parametre.findMany({ where: { cle: { in: CLES } }, select: { cle: true, valeur: true, type: true } });
});

afterAll(async () => {
  await dbSite().parametre.deleteMany({ where: { cle: { in: CLES.filter((c) => !sauvegarde.some((s) => s.cle === c)) } } });
  for (const s of sauvegarde) await dbSite().parametre.update({ where: { cle: s.cle }, data: { valeur: s.valeur } });
});

describe("catalogue", () => {
  it("chaque clé lue par le site y figure, ou se règle dans un autre écran", () => {
    const sortie = execSync(`grep -rhoE 'lireParametre(Entier)?\\("[^"]+"' src app`, { encoding: "utf8" });
    const cles = [...new Set(sortie.split("\n").filter(Boolean).map((l) => l.replace(/.*\("/, "").replace(/"$/, "")))];
    const orphelines = cles.filter((c) => !definition(c) && !AILLEURS.test(c));
    expect(orphelines).toEqual([]);
  });

  it("aucun prix, remise, promotion ou bon d'achat (FR-017)", () => {
    expect(PARAMETRES.filter((p) => /prix|tarif|remise|promo|bon_achat|garantie/.test(p.cle))).toEqual([]);
  });
});

describe("validation", () => {
  it("refuse les valeurs incohérentes avec l'explication", () => {
    expect(() => valider(def("commande.heure_limite_express"), saisie({ valeur: "25:00" }))).toThrow(/« 25:00 » n'est pas une heure valide/);
    expect(valider(def("commande.heure_limite_express"), saisie({ valeur: " 13:00 " }))).toBe("13:00");
    expect(() => valider(def("livraison.delai_zones_jours"), saisie({ valeur: "11" }))).toThrow(/entre 0 et 10/);
    expect(() => valider(def("livraison.delai_zones_jours"), saisie({ valeur: "1.5" }))).toThrow(ParametreRefuse);
    expect(() => valider(def("contact.whatsapp"), saisie({ valeur: "06 12 34 56 78" }))).toThrow(/format international/);
    expect(valider(def("contact.whatsapp"), saisie({ valeur: "+33 6 12 34 56 78" }))).toBe("+33 6 12 34 56 78");
    expect(() => valider(def("livraison.jours_non_livres"), saisie({ valeur: "2026-02-30" }))).toThrow(/2026-02-30/);
    expect(valider(def("livraison.jours_non_livres"), saisie({ valeur: "2026-12-26\n2026-08-14\n2026-12-26" }))).toBe('["2026-08-14","2026-12-26"]');
    expect(() => valider(def("contact.horaires"), saisie({ "valeur-1": "18:00-09:00" }))).toThrow(/lundi/);
    expect(JSON.parse(valider(def("contact.horaires"), saisie({ "valeur-1": "09:00-12:00, 14:00-18:00" })))["1"]).toEqual([["09:00", "12:00"], ["14:00", "18:00"]]);
    expect(() => valider(def("contact.fermetures"), saisie({ valeur: "2027-01-03 2026-12-24 Congés" }))).toThrow(/AAAA-MM-JJ/);
  });

  it("liste des spécialités : non vide et sans doublon", () => {
    expect(() => valider(def("comptes.specialites"), saisie({ valeur: "  \n " }))).toThrow(/au moins une ligne/);
    expect(() => valider(def("comptes.specialites"), saisie({ valeur: "Cardiologie\ncardiologie" }))).toThrow(/deux fois/);
    expect(valider(def("comptes.specialites"), saisie({ valeur: "Cardiologie\nMédecine générale" }))).toBe('["Cardiologie","Médecine générale"]');
  });

  it("la saisie relue redonne la même valeur", () => {
    for (const p of PARAMETRES.filter((x) => ["dates", "zones", "liste", "horaires", "fermetures"].includes(x.type))) {
      const exemple = { dates: '["2026-08-14"]', zones: '["20","97"]', liste: '["A","B"]', horaires: '{"1":[["09:00","18:00"]],"2":[],"3":[],"4":[],"5":[],"6":[],"7":[]}', fermetures: '[{"du":"2026-12-24","au":"2027-01-03","motif":"Congés"}]' }[p.type as "dates"];
      expect(valider(p, saisie(versSaisie(p, exemple)))).toBe(exemple);
    }
  });
});

describe("écriture historisée", () => {
  it("modifie, historise (auteur, avant, après), journalise ; « Remettre cette valeur » ajoute une ligne", async () => {
    const cle = "commande.heure_limite_express";
    const depart = (await lireParametre(cle)) ?? "14:00";
    expect(await modifierParametre(cle, saisie({ valeur: "13:00" }), depart, admin, "admin")).toBe(depart !== "13:00");
    expect(await lireParametre(cle)).toBe("13:00");
    await modifierParametre(cle, saisie({ valeur: "15:30" }), "13:00", admin, "admin");
    const [p] = (await lireTheme("livraison")).filter((x) => x.cle === cle);
    expect(p!.valeur).toBe("15:30");
    expect(p!.historique[0]).toMatchObject({ avant: "13:00", apres: "15:30" });
    expect(p!.historique[0]!.auteur).not.toBe("—");

    const lignes = await dbSite().historiqueParametre.count({ where: { cle } });
    await remettreValeur(p!.historique[1]!.id, admin, "admin");
    expect(await lireParametre(cle)).toBe("13:00");
    expect(await dbSite().historiqueParametre.count({ where: { cle } })).toBe(lignes + 1);
    const journal = await dbSite().journalAction.findFirst({ where: { objet: cle }, orderBy: { date: "desc" } });
    expect(journal).toMatchObject({ action: "parametres.remis", detail: { avant: "15:30", apres: "13:00" } });
  });

  it("verrou optimiste : une valeur changée depuis la lecture est refusée, avec l'auteur", async () => {
    const cle = "livraison.delai_zones_jours";
    const lue = (await lireParametre(cle))!;
    await modifierParametre(cle, saisie({ valeur: lue === "3" ? "4" : "3" }), lue, admin, "admin");
    await expect(modifierParametre(cle, saisie({ valeur: "5" }), lue, admin, "admin")).rejects.toThrow(/modifié par .+ à \d{2}:\d{2}/);
  });

  it("commercial : seulement l'offre de bienvenue", async () => {
    await expect(modifierParametre("comptes.specialites", saisie({ valeur: "Cardiologie" }), "", admin, "commercial")).rejects.toThrow(/autre rôle/);
    await expect(modifierParametre("commande.heure_limite_express", saisie({ valeur: "12:00" }), "", admin, "support")).rejects.toThrow(/autre rôle/);
    const lue = (await lireParametre("bienvenue.active")) ?? "true";
    await modifierParametre("bienvenue.active", saisie({ valeur: lue === "true" ? "" : "oui" }), lue, admin, "commercial");
    expect(await lireParametre("bienvenue.active")).toBe(lue === "true" ? "false" : "true");
  });
});
