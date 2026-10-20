import { afterEach, expect, it, vi } from "vitest";
import { cleDeTest, suiteDeContrat } from "./harness";
import { nouveauPartenaire } from "./odoo/outils";

// T071 — contrat du connecteur PCA (contracts/pca.md), sous-modes automatique et manuel.

const medecin = { partenaireRef: "FICT-P-00002", nom: "Dr Marc Loubrac", email: "loubrac@demo.explocardio.test", rpps: "99000000102" };

suiteDeContrat("pca", "accès à la plateforme Cloud (contracts/pca.md)", ({ registre, mode }) => {
  const pca = () => registre.pca();
  afterEach(() => vi.unstubAllEnvs());

  it("sous-mode automatique : ouvrir, délai de grâce, suspendre, rétablir, fermer", async () => {
    vi.stubEnv("PCA_DEMO_SUBMODE", "auto");
    const cle = cleDeTest("pca");
    const demande = { medecin, logiciel: "EC-DMS-CS-HOLTER-CLOUD", debut: new Date(), finPrevue: null };
    const { ref, etat } = await pca().ouvrirDroit(demande, cle);
    expect(etat).toBe("actif");
    expect((await pca().ouvrirDroit(demande, cle)).ref).toBe(ref);
    expect((await pca().passerEnGrace(ref, new Date())).etat).toBe("grace");
    expect((await pca().suspendre(ref, "impayé")).etat).toBe("suspendu");
    expect((await pca().retablir(ref)).etat).toBe("actif");
    expect((await pca().fermer(ref, new Date())).etat).toBe("ferme");
    const droits = await pca().lireDroits(medecin.partenaireRef);
    expect(droits.find((d) => d.ref === ref)?.etat).toBe("ferme");
  });

  it.runIf(mode === "demo")("sous-mode manuel : « à ouvrir » puis actif après confirmation de la tâche", async () => {
    vi.stubEnv("PCA_DEMO_SUBMODE", "manual");
    const { ref, etat } = await pca().ouvrirDroit(
      { medecin, logiciel: "EC-DMS-CARDIOVISION-CLOUD", debut: new Date(), finPrevue: null },
      cleDeTest("pca-manuel"),
    );
    expect(etat).toBe("a_ouvrir");
    expect((await pca().confirmerTache(ref)).etat).toBe("actif");
    expect((await pca().fermer(ref, new Date())).etat).toBe("a_fermer");
    expect((await pca().confirmerTache(ref)).etat).toBe("ferme");
  });

  it.runIf(mode === "demo")("lève CloudAccessDenied pour le cas de refus prévu dans la base", async () => {
    await expect(
      pca().ouvrirDroit({ medecin, logiciel: "DEMO-ACCES-REFUSE", debut: new Date(), finPrevue: null }, cleDeTest("refus")),
    ).rejects.toMatchObject({ code: "CLOUD_ACCESS_DENIED" });
  });

  // F12 (FR-003, FR-009, SC-003) : un seul compte par médecin, droits indépendants.
  it("un seul compte par médecin, même pour deux ouvertures simultanées ; fermer un droit garde les autres", async () => {
    vi.stubEnv("PCA_DEMO_SUBMODE", "auto");
    const partenaireRef = await nouveauPartenaire(registre);
    const m = { partenaireRef, nom: "Dr Test Compte", email: `compte-${partenaireRef}@demo.explocardio.test`, rpps: "99000000999", cabinet: "Cabinet de test" };
    expect(await pca().lireCompte(partenaireRef)).toBeNull();
    const [a, b] = await Promise.all([
      pca().ouvrirDroit({ medecin: m, logiciel: "EC-DMS-CS-HOLTER-CLOUD", debut: new Date(), finPrevue: null }, cleDeTest("compte-a")),
      pca().ouvrirDroit({ medecin: m, logiciel: "EC-DMS-CARDIOVISION-CLOUD", debut: new Date(), finPrevue: null }, cleDeTest("compte-b")),
    ]);
    const compte = await pca().lireCompte(partenaireRef);
    expect(compte).toMatchObject({ ref: expect.any(String) });
    await pca().fermer(a.ref, new Date());
    const droits = await pca().lireDroits(partenaireRef);
    expect(droits.find((d) => d.ref === a.ref)?.etat).toBe("ferme");
    expect(droits.find((d) => d.ref === b.ref)?.etat).toBe("actif");
    expect(await pca().lireCompte(partenaireRef)).toEqual(compte);
    expect(JSON.stringify(droits)).not.toMatch(/mot.?de.?passe|password/i);
  });

  it("prolonger un droit en délai de grâce le rend actif avec sa nouvelle fin ; le médecin est mis à jour", async () => {
    vi.stubEnv("PCA_DEMO_SUBMODE", "auto");
    const partenaireRef = await nouveauPartenaire(registre);
    const m = { partenaireRef, nom: "Dr Test Prolongation", email: `prolonge-${partenaireRef}@demo.explocardio.test` };
    const { ref } = await pca().ouvrirDroit({ medecin: m, logiciel: "EC-DMS-CS-HOLTER-CLOUD", debut: new Date(), finPrevue: new Date() }, cleDeTest("prolonger"));
    await pca().passerEnGrace(ref, new Date());
    const fin = new Date(Date.now() + 30 * 24 * 3600_000);
    expect((await pca().prolonger(ref, fin)).etat).toBe("actif");
    expect((await pca().lireDroits(partenaireRef)).find((d) => d.ref === ref)?.finPrevue?.getTime()).toBe(fin.getTime());
    await expect(pca().mettreAJourMedecin({ ...m, email: `nouveau-${partenaireRef}@demo.explocardio.test`, cabinet: "Nouveau cabinet" })).resolves.toBeUndefined();
    expect(await pca().lireCompte(partenaireRef)).not.toBeNull();
  });

  it("lève NotFound pour un droit inconnu", async () => {
    await expect(pca().suspendre("FICT-PCA-INCONNU", "test")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
