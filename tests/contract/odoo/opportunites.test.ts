import { expect, it } from "vitest";
import { cleDeTest, suiteDeContrat } from "../harness";
import { REF } from "./outils";

suiteDeContrat("odoo", "opportunités (contracts/odoo.md §8)", ({ registre }) => {
  it("copie une demande de financement ou de devis, sans doublon par clé", async () => {
    const opportunites = registre.odoo().opportunites;
    const cle = cleDeTest("opportunite");
    const demande = {
      type: "financement" as const,
      referenceDemande: `demande-${cle}`,
      partenaireRef: REF.partenaireSansDroits,
      contenu: { equipements: ["EC-KOCH-ULTRA"], dureeMois: 60 },
    };
    const a = await opportunites.copierDemande(demande, cle);
    const b = await opportunites.copierDemande(demande, cle);
    expect(a.ref).toBeTruthy();
    expect(b.ref).toBe(a.ref);
    const devis = await opportunites.copierDemande(
      { type: "devis", referenceDemande: `devis-${cle}`, contenu: { objet: "ECG de repos" } },
      cleDeTest("devis"),
    );
    expect(devis.ref).not.toBe(a.ref);
  });
});
