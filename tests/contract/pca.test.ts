import { afterEach, expect, it, vi } from "vitest";
import { cleDeTest, suiteDeContrat } from "./harness";

// T071 — contrat du connecteur PCA (contracts/pca.md), sous-modes automatique et manuel.

const medecin = { partenaireRef: "FICT-P-00002", nom: "Dr Marc Loubrac", email: "loubrac@demo.explocardio.test", rpps: "99000000102" };

suiteDeContrat("pca", "accès à la plateforme Cloud (contracts/pca.md)", ({ registre, mode }) => {
  const pca = () => registre.pca();
  afterEach(() => vi.unstubAllEnvs());

  it("sous-mode automatique : ouvrir, délai de grâce, suspendre, rétablir, fermer", async () => {
    vi.stubEnv("PCA_DEMO_SUBMODE", "auto");
    const cle = cleDeTest("pca");
    const demande = { medecin, logiciel: "CardioScan Holter ECG", debut: new Date(), finPrevue: null };
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
      { medecin, logiciel: "CardioVision / Cardiac Rehab", debut: new Date(), finPrevue: null },
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

  it("lève NotFound pour un droit inconnu", async () => {
    await expect(pca().suspendre("FICT-PCA-INCONNU", "test")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
