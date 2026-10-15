import { expect, it } from "vitest";
import { cleDeTest, suiteDeContrat } from "../harness";
import { nouveauPartenaire, REF } from "./outils";

suiteDeContrat("odoo", "location et abonnements (contracts/odoo.md §6)", ({ registre }) => {
  const location = () => registre.odoo().location;

  it("crée un abonnement logiciel une seule fois par clé, le résilie puis annule la résiliation", async () => {
    const partenaireRef = await nouveauPartenaire(registre);
    const cle = cleDeTest("abonnement");
    const demande = { partenaireRef, objet: "logiciel" as const, defaultCode: REF.logiciel, debut: new Date() };
    const a = await location().creerAbonnement(demande, cle);
    const b = await location().creerAbonnement(demande, cle);
    expect(b.ref).toBe(a.ref);

    const fin = new Date(Date.now() + 30 * 86_400_000);
    expect((await location().resilier(a.ref, fin)).fin.getTime()).toBe(fin.getTime());
    let liste = await location().listerLocations(partenaireRef);
    expect(liste.find((l) => l.ref === a.ref)?.etat).toBe("resiliation_prevue");

    expect(await location().annulerResiliation(a.ref)).toEqual({ fin: null });
    liste = await location().listerLocations(partenaireRef);
    expect(liste.find((l) => l.ref === a.ref)).toMatchObject({ etat: "en_cours", fin: null, objet: "logiciel" });
  });

  it("liste les locations d'un client avec numéros de série et échéances", async () => {
    const liste = await location().listerLocations(REF.partenaireDroitsActifs);
    const mad = liste.find((l) => l.objet === "mise_a_disposition");
    expect(mad?.numeroSerie).toBeTruthy();
    expect(mad?.prochaineEcheance).toBeInstanceOf(Date);
  });

  it("lève NotFound pour un abonnement inconnu", async () => {
    await expect(location().resilier("FICT-SUB-INCONNU", new Date())).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
