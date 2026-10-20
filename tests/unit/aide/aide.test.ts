import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { aideDe, compterConsultation, contenuPublie, contenusPublies, documentsProduits, trierFaq } from "@/domaine/aide/lecture";
import { dbSite } from "@/lib/db/site";
import { verifierPubliable } from "@/domaine/aide/administration";

// T011 — centre d'aide (F09, US3) : seuls les contenus publiés, filtres, recherche, FAQ triée par
// consultations, compteur, aide d'un modèle, notices des produits reprises de F03.

const crees: string[] = [];
afterAll(async () => {
  await dbSite().contenuAide.deleteMany({ where: { id: { in: crees } } });
});

async function contenu(donnees: Partial<Parameters<ReturnType<typeof dbSite>["contenuAide"]["create"]>[0]["data"]> & { titre: string }) {
  const c = await dbSite().contenuAide.create({
    data: { slug: `essai-${randomUUID().slice(0, 8)}`, type: "faq", resume: "Résumé", theme: "analyse", reponse: "Réponse", etat: "publie", ...donnees },
  });
  crees.push(c.id);
  return c;
}

describe("centre d'aide", () => {
  it("seuls les contenus publiés sont lus ; filtres thème, type et référence", async () => {
    const publie = await contenu({ titre: "Réglage du gain", references: ["EC-ESSAI-1"] });
    const brouillon = await contenu({ titre: "Brouillon", etat: "preparation" });
    const tous = await contenusPublies();
    expect(tous.map((c) => c.id)).toContain(publie.id);
    expect(tous.map((c) => c.id)).not.toContain(brouillon.id);
    expect(await contenuPublie(brouillon.slug)).toBeNull();
    expect((await contenusPublies({ theme: "analyse", reference: "EC-ESSAI-1" })).map((c) => c.id)).toEqual([publie.id]);
    expect(await contenusPublies({ reference: "EC-ESSAI-1", type: "video" })).toEqual([]);
  });

  it("recherche sans accents ni casse, dans le titre, la réponse et les étapes", async () => {
    const c = await contenu({ titre: "Électrodes décollées", reponse: "Nettoyez la PEAU avant la pose." });
    expect((await contenusPublies({ recherche: "electrodes peau" })).map((x) => x.id)).toContain(c.id);
    expect(await contenusPublies({ recherche: "introuvable-xyz" })).toEqual([]);
  });

  it("FAQ : les plus consultées en tête ; le compteur ne vise que les questions publiées", async () => {
    const a = await contenu({ titre: "Question A", ordre: 1 });
    const b = await contenu({ titre: "Question B", ordre: 2 });
    expect(await compterConsultation(b.slug)).toBe(true);
    expect(await compterConsultation(b.slug)).toBe(true);
    const brouillon = await contenu({ titre: "Brouillon", etat: "preparation" });
    expect(await compterConsultation(brouillon.slug)).toBe(false);
    const ids = trierFaq(await contenusPublies({ type: "faq" })).map((x) => x.id);
    expect(ids.indexOf(b.id)).toBeLessThan(ids.indexOf(a.id));
  });

  it("aide d'un modèle et notices des produits reprises de leur fiche (F03)", async () => {
    const c = await contenu({ titre: "Aide du modèle", type: "mode_emploi", reponse: null, references: ["EC-ESSAI-2"] });
    expect((await aideDe(["EC-ESSAI-2", "EC-AUTRE"])).map((x) => x.id)).toEqual([c.id]);
    const docs = await documentsProduits();
    expect(docs.length).toBeGreaterThan(0);
    expect(docs[0]).toMatchObject({ chemin: expect.stringMatching(/\.pdf$/), ficheSlug: expect.any(String) });
  });

  it("publication : vidéo sans sous-titres ou transcription refusée (FR-015) ; étapes avec images ; PDF ; réponse", () => {
    const base = { video: null, sousTitres: null, transcription: null, etapes: [], document: null, reponse: null };
    expect(() => verifierPubliable({ ...base, type: "video", video: "/v.mp4", transcription: "Texte" })).toThrow(/sous-titres/);
    expect(() => verifierPubliable({ ...base, type: "video", video: "/v.mp4", sousTitres: "/v.vtt" })).toThrow(/transcription/);
    expect(() => verifierPubliable({ ...base, type: "video", video: "/v.mp4", sousTitres: "/v.vtt", transcription: "Texte" })).not.toThrow();
    expect(() => verifierPubliable({ ...base, type: "mode_emploi", etapes: [{ texte: "Pose", image: null, texteRemplacement: "" }] })).toThrow(/image/);
    expect(() => verifierPubliable({ ...base, type: "notice" })).toThrow(/PDF/);
    expect(() => verifierPubliable({ ...base, type: "faq" })).toThrow(/réponse/);
  });
});
