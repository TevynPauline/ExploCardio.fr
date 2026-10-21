import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enregistrerBrouillon, etatPage, PageRefusee, publierPage, revenirOrigine } from "@/domaine/pages";
import { lireTexte, texteOrigine } from "@/domaine/textes";
import { dbSite } from "@/lib/db/site";

// T010 — textes des pages (F13, US2, D8) : le fichier `contenus/<nom>.md` reste la version
// d'origine ; brouillon invisible du public ; publication nettoyée ; retour à l'origine ; verrou.

const NOM = "cookies";
const auteur = { id: "test-admin", libelle: "Test (admin)" };
const nettoyer = () => dbSite().contenu.deleteMany({ where: { type: "page", cle: NOM } });

beforeAll(nettoyer);
afterAll(nettoyer);

describe("textes des pages", () => {
  it("sans texte publié, la page affiche le fichier d'origine", async () => {
    const origine = await texteOrigine(NOM);
    const texte = await lireTexte(NOM);
    expect(texte.titre).toBe(origine.split("\n")[0]!.replace(/^#\s+/, "").trim());
    expect((await etatPage(NOM)).enVigueur).toBe(origine);
  });

  it("brouillon invisible ; publié : texte du back-office nettoyé ; retour à l'origine", async () => {
    const titreOrigine = (await lireTexte(NOM)).titre;
    await enregistrerBrouillon(NOM, "# Cookies (essai)\n\nTexte d'essai.<script>alert(1)</script>", null, auteur);
    expect((await lireTexte(NOM)).titre).toBe(titreOrigine);

    const lu = (await etatPage(NOM)).modifieLe!.toISOString();
    await publierPage(NOM, lu, auteur);
    const publie = await lireTexte(NOM);
    expect(publie.titre).toBe("Cookies (essai)");
    expect(publie.html).toContain("Texte d'essai.");
    expect(publie.html).not.toContain("<script");

    await revenirOrigine(NOM, auteur);
    expect((await lireTexte(NOM)).titre).toBe(titreOrigine);
    const actions = (await dbSite().journalAction.findMany({ where: { objet: NOM, action: { startsWith: "contenus.page" } }, orderBy: { date: "desc" }, take: 3 })).map((j) => j.action);
    expect(actions).toEqual(["contenus.page.origine", "contenus.page.publiee", "contenus.page.brouillon"]);
  });

  it("refuse un texte sans titre, une page inconnue et une version périmée (avec l'auteur)", async () => {
    await expect(enregistrerBrouillon(NOM, "Pas de titre", null, auteur)).rejects.toThrow(/première ligne/);
    await expect(enregistrerBrouillon("inconnue", "# T", null, auteur)).rejects.toThrow(PageRefusee);
    await enregistrerBrouillon(NOM, "# Version A", null, auteur);
    const lu = (await etatPage(NOM)).modifieLe!.toISOString();
    await enregistrerBrouillon(NOM, "# Version B", lu, { id: "autre", libelle: "Dominique (support)" });
    await expect(enregistrerBrouillon(NOM, "# Version C", lu, auteur)).rejects.toThrow(/modifiée par Dominique \(support\)/);
    expect((await etatPage(NOM)).brouillon).toBe("# Version B");
    await revenirOrigine(NOM, auteur);
  });
});
