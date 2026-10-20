import { afterAll, describe, expect, it } from "vitest";
import { CATALOGUE } from "@/domaine/emailing/catalogue";
import { apercuModele, enregistrerBrouillon, envoyerTestModele, etatModele, publierModele, revenirAuTexteOrigine, validerTextes } from "@/domaine/emailing/textes";
import { emailsCommandes } from "@/emails/modeles-commandes";
import { TEXTES_PAR_DEFAUT } from "@/emails/textes-par-defaut";
import { dbSite } from "@/lib/db/site";

// T026 — textes modifiables des modèles (F10, US8, FR-026, SC-009, D2) : textes par défaut sans
// ligne en base ; brouillon invisible des envois ; publication contrôlée ; retour à l'origine.

const auteur = { id: "test-admin", libelle: "Test (admin)", email: "admin@demo.explocardio.test" };
const CODE = "commande_annulee";
const defaut = TEXTES_PAR_DEFAUT[CODE]!;
const annulation = () => emailsCommandes.annulation({ ref: "FICT-SO-TEXTES", motif: "test" });

afterAll(async () => {
  await dbSite().modeleEmail.deleteMany({ where: { code: CODE } });
  await dbSite().envoi.deleteMany({ where: { cle: { startsWith: `modele-test:${CODE}:` } } });
});

describe("textes par défaut", () => {
  it("chaque modèle du catalogue (hors campagnes) a ses textes modifiables", () => {
    const sans = Object.keys(CATALOGUE).filter((c) => c !== "campagne" && !TEXTES_PAR_DEFAUT[c]);
    expect(sans).toEqual([]);
  });

  it("sans ligne en base : le texte du code", async () => {
    expect((await annulation()).objet).toBe("Commande FICT-SO-TEXTES annulée");
  });
});

describe("contrôle avant publication", () => {
  const avec = (champs: Partial<typeof defaut>) => ({ ...defaut, ...champs, blocs: { ...defaut.blocs, ...(champs.blocs ?? {}) } });
  it("variable inconnue, variable retirée, variable mal écrite, objet trop long, lien : refusés", () => {
    expect(() => validerTextes(CODE, avec({ objet: "Commande {{ref}} {{inconnue}}" }))).toThrow(/Variable inconnue : \{\{inconnue\}\}/);
    expect(() => validerTextes(CODE, avec({ objet: "Commande annulée", blocs: { corps: "Bonjour, votre commande est annulée." } }))).toThrow(/doivent rester.*\{\{ref\}\}/);
    expect(() => validerTextes(CODE, avec({ objet: "Commande {{ref} annulée" }))).toThrow();
    expect(() => validerTextes(CODE, avec({ objet: `${"x".repeat(121)} {{ref}}` }))).toThrow(/120 caractères/);
    expect(() => validerTextes(CODE, avec({ blocs: { corps: "Voir https://exemple.com {{ref}} {{motif}}" } }))).toThrow(/Pas de lien/);
  });

  it("un texte valide est accepté ; un champ vide reprend le texte d'origine", () => {
    const t = validerTextes(CODE, avec({ objet: "Annulation de la commande {{ref}}", apercu: "" }));
    expect(t.objet).toBe("Annulation de la commande {{ref}}");
    expect(t.apercu).toBe(defaut.apercu);
  });
});

describe("brouillon, aperçu, test, publication", () => {
  it("le brouillon ne change pas les envois ; l'aperçu et le test l'utilisent ; la publication l'applique ; retour à l'origine", async () => {
    const brouillon = { ...defaut, objet: "Annulation de votre commande {{ref}}", blocs: { corps: "Bonjour,\n\nVotre commande {{ref}} est **annulée** : {{motif}}." } };
    await enregistrerBrouillon(CODE, brouillon, auteur);
    expect((await annulation()).objet).toBe("Commande FICT-SO-TEXTES annulée");

    const apercu = await apercuModele(CODE, brouillon);
    expect(apercu.objet).toMatch(/^Annulation de votre commande/);
    expect(apercu.rendu).toContain("<strong>annulée</strong>");

    await envoyerTestModele(CODE, auteur);
    const test = await dbSite().envoi.findFirstOrThrow({ where: { cle: { startsWith: `modele-test:${CODE}:` } } });
    expect(test).toMatchObject({ destinataire: auteur.email, famille: "transactionnel", objet: expect.stringMatching(/^Annulation de votre commande/) });

    await publierModele(CODE, auteur);
    expect((await annulation()).objet).toBe("Annulation de votre commande FICT-SO-TEXTES");
    const etat = await etatModele(CODE);
    expect(etat.brouillon).toBeNull();
    expect(etat.publiePar).toBe(auteur.libelle);
    expect(await dbSite().journalAction.count({ where: { action: "emailing.modele_publie", objet: CODE } })).toBeGreaterThan(0);

    await revenirAuTexteOrigine(CODE, auteur);
    expect((await annulation()).objet).toBe("Commande FICT-SO-TEXTES annulée");
  });

  it("les valeurs des variables restent du texte (pas de balise injectée)", async () => {
    const e = await emailsCommandes.annulation({ ref: "<b>X</b>", motif: "**y**" });
    expect(e.rendu).not.toContain("<b>X</b>");
    expect(e.rendu).toContain("&lt;b&gt;X&lt;/b&gt;");
  });
});
