import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { lireJournalConnecteurs, PAR_PAGE, verifierSeuil } from "@/domaine/journal";
import { dbSite } from "@/lib/db/site";

// T022 — journal du back-office (F13, US7) : filtres et pagination ; alerte après N erreurs
// successives d'un connecteur, une fois par heure au plus, compteur remis à zéro par un succès ;
// FR-033 : chaque action sensible laisse une ligne JournalAction avec son auteur.

const noms: string[] = [];
const nom = () => {
  const n = `test-f13-${randomBytes(3).toString("hex")}`;
  noms.push(n);
  return n;
};

afterAll(async () => {
  await dbSite().journalConnecteur.deleteMany({ where: { connecteur: { in: noms } } });
  await dbSite().envoi.deleteMany({ where: { cle: { startsWith: "alerte-connecteur:test-f13-" } } });
});

async function appels(connecteur: string, resultats: ("succes" | "erreur")[], depart: Date) {
  let t = depart.getTime();
  for (const resultat of resultats) {
    t += 1000;
    await dbSite().journalConnecteur.create({
      data: { connecteur, mode: "demo", operation: "catalogue.lireArticle", objet: "EC-TEST", resultat, niveau: resultat === "erreur" ? "erreur" : "info", motifErreur: resultat === "erreur" ? "UNAVAILABLE" : null, dureeMs: 3, date: new Date(t) },
    });
  }
  return new Date(t + 1000);
}

describe("lecture filtrée", () => {
  it("filtre par connecteur, résultat et texte ; pagine par 50", async () => {
    const c = nom();
    await appels(c, [...Array(PAR_PAGE + 5).fill("succes"), "erreur", "erreur"], new Date(Date.now() - 600_000));
    const tout = await lireJournalConnecteurs({ connecteur: c });
    expect(tout).toMatchObject({ total: PAR_PAGE + 7, pages: 2 });
    expect(tout.lignes).toHaveLength(PAR_PAGE);
    expect((await lireJournalConnecteurs({ connecteur: c }, 2)).lignes).toHaveLength(7);
    const erreurs = await lireJournalConnecteurs({ connecteur: c, resultat: "erreur" });
    expect(erreurs.total).toBe(2);
    expect((await lireJournalConnecteurs({ connecteur: c, q: "unavailable" })).total).toBe(2);
  });
});

describe("seuil d'alerte", () => {
  it("5 erreurs successives : une notification, pas deux dans l'heure", async () => {
    const c = nom();
    const t = await appels(c, ["erreur", "erreur", "erreur", "erreur"], new Date(Date.now() - 60_000));
    expect(await verifierSeuil(c, "demo", t)).toBe(false);
    const t2 = await appels(c, ["erreur"], t);
    expect(await verifierSeuil(c, "demo", t2)).toBe(true);
    expect(await dbSite().envoi.count({ where: { cle: { startsWith: `alerte-connecteur:${c}:` } } })).toBe(1);
    const t3 = await appels(c, ["erreur", "erreur", "erreur", "erreur", "erreur"], t2);
    expect(await verifierSeuil(c, "demo", t3)).toBe(false);
    expect(await dbSite().journalConnecteur.count({ where: { connecteur: c, niveau: "alerte" } })).toBe(1);
  });

  it("un succès intermédiaire remet le compte à zéro", async () => {
    const c = nom();
    const t = await appels(c, ["erreur", "erreur", "erreur", "succes", "erreur", "erreur"], new Date(Date.now() - 60_000));
    expect(await verifierSeuil(c, "demo", t)).toBe(false);
  });
});

describe("FR-033 : actions sensibles journalisées", () => {
  // Chaque action sensible et le fichier qui l'inscrit au journal, avec l'auteur ; le
  // comportement est vérifié par les tests de chaque domaine (comptes, équipe, paramètres…).
  const ATTENDUES: [string, string, RegExp][] = [
    ["validation, refus, suspension, rétablissement d'un compte", "src/domaine/comptes/validation.ts", /"comptes\.valide"[\s\S]*"comptes\.refuse"[\s\S]*"comptes\.suspendu"[\s\S]*"comptes\.retabli"/],
    ["publication et retrait d'un produit", "src/domaine/catalogue/administration.ts", /"catalogue\.publication"[\s\S]*catalogue\.\$\{|"catalogue\.retrait"/],
    ["publication et retrait d'un contenu d'aide", "src/domaine/aide/administration.ts", /"aide\.publie"[\s\S]*"aide\.retire"/],
    ["publication d'un texte de page", "src/domaine/pages.ts", /"contenus\.page\.publiee"[\s\S]*"contenus\.page\.origine"/],
    ["modification et remise d'un paramètre", "src/domaine/parametres/index.ts", /"parametres\.modifie"[\s\S]*"parametres\.remis"/],
    ["ouverture et fermeture d'un accès Cloud", "src/domaine/cloud/acces.ts", /journal\("ouverture"[\s\S]*journal\("fermeture"/],
    ["changement de rôle, désactivation, invitation (réinitialisation)", "src/domaine/equipe/index.ts", /"equipe\.invitation"[\s\S]*"equipe\.role"[\s\S]*"equipe\.desactivation"/],
    ["suivi d'une demande", "src/domaine/demandes/suivi.ts", /"demandes\.message\.suivi"[\s\S]*"demandes\.devis\.suivi"/],
  ];

  it.each(ATTENDUES)("%s", (_libelle, fichier, motif) => {
    const source = readFileSync(fichier, "utf8");
    expect(source).toMatch(motif);
    expect(source).toMatch(/auteur/);
  });

  it("les écritures de paramètres hors de l'écran Paramètres sont aussi journalisées", () => {
    for (const f of ["app/(back-office)/admin/catalogue/actions.ts", "app/(back-office)/admin/emails/actions.ts", "app/(back-office)/admin/contenus/actions.ts"]) {
      const source = readFileSync(f, "utf8");
      const ecritures = source.match(/ecrireParametre\(/g)?.length ?? 0;
      const journal = (source.match(/journalAction\.create|journaliser\(a, "contenus\.parametre/g) ?? []).length;
      expect(journal, f).toBeGreaterThanOrEqual(ecritures);
    }
  });
});
