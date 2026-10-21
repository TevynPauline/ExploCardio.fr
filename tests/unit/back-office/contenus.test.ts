import { afterAll, describe, expect, it } from "vitest";
import { exigerTexteRemplacement, journaliser, SaisieRefusee, verifierVersionContenu } from "@/domaine/admin-contenus";
import { dbSite } from "@/lib/db/site";

// T010 — contenus du site (F13, US2) : verrou optimiste (D9) et texte de remplacement (FR-008).

const crees: string[] = [];
afterAll(async () => {
  await dbSite().contenu.deleteMany({ where: { id: { in: crees } } });
  await dbSite().journalAction.deleteMany({ where: { objet: { in: crees } } });
});

describe("verrou optimiste", () => {
  it("accepte la version lue, refuse une version périmée en nommant l'auteur et l'heure", async () => {
    const c = await dbSite().contenu.create({ data: { type: "bandeau", titre: "Message du bandeau", corps: "Essai F13", etat: "preparation" } });
    crees.push(c.id);
    const lu = c.modifieLe.toISOString();
    await expect(verifierVersionContenu(c.id, lu)).resolves.toBeUndefined();

    await new Promise((r) => setTimeout(r, 5));
    await dbSite().contenu.update({ where: { id: c.id }, data: { corps: "Modifié ailleurs" } });
    await journaliser({ id: "autre", libelle: "Camille (commercial)" }, "contenus.bandeau.modifie", c.id, null, null);
    const refus = verifierVersionContenu(c.id, lu);
    await expect(refus).rejects.toThrow(SaisieRefusee);
    await expect(verifierVersionContenu(c.id, lu)).rejects.toThrow(/modifié par Camille \(commercial\) à \d{2}:\d{2}.*rien n'a été écrasé/);
    expect((await dbSite().contenu.findUniqueOrThrow({ where: { id: c.id } })).corps).toBe("Modifié ailleurs");
  });

  it("sans version lue (création) : rien à vérifier", async () => {
    await expect(verifierVersionContenu("", "")).resolves.toBeUndefined();
  });
});

describe("texte de remplacement des images", () => {
  it("est exigé et limité à 200 caractères", () => {
    expect(() => exigerTexteRemplacement("  ")).toThrow(/obligatoire/);
    expect(() => exigerTexteRemplacement("x".repeat(201))).toThrow(/200 caractères/);
    expect(exigerTexteRemplacement("  Holter ECG DMS posé sur un bureau ")).toBe("Holter ECG DMS posé sur un bureau");
  });
});
