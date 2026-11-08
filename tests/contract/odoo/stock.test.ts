import { expect, it } from "vitest";
import { cleDeTest, suiteDeContrat } from "../harness";
import { REF, itDemo } from "./outils";

suiteDeContrat("odoo", "stock et parc (contracts/odoo.md §2)", ({ registre }) => {
  const stock = () => registre.odoo().stock;

  it("une référence inconnue est simplement absente de la réponse", async () => {
    expect(await stock().lireDisponibilite(["EC-REFERENCE-INCONNUE"])).toEqual([]);
  });

  itDemo("donne la disponibilité par formule", async () => {
    const [mad, rupture, delai] = await stock().lireDisponibilite([REF.equipementMad, REF.enRupture, REF.enDelai]);
    expect(mad?.achat.etat).toBeDefined();
    expect(mad?.miseADisposition).not.toBeNull();
    expect(rupture?.achat).toEqual({ etat: "indisponible" });
    expect(delai?.achat).toMatchObject({ etat: "delai", delaiJours: expect.any(Number) });
    expect(delai?.miseADisposition).toBeNull();
  });

  itDemo("réserve une quantité disponible, une seule fois par clé", async () => {
    const cle = cleDeTest("reservation");
    const a = await stock().reserver([{ defaultCode: REF.consommable, quantite: 1 }], cle);
    const b = await stock().reserver([{ defaultCode: REF.consommable, quantite: 1 }], cle);
    expect(b.reference).toBe(a.reference);
  });

  itDemo("lève OutOfStock pour un article indisponible", async () => {
    await expect(
      stock().reserver([{ defaultCode: REF.enRupture, quantite: 1 }], cleDeTest("rupture")),
    ).rejects.toMatchObject({ code: "OUT_OF_STOCK" });
  });

  itDemo("donne la première date de livraison possible du parc", async () => {
    const souhaitee = new Date(Date.now() + 2 * 86_400_000);
    const { premiereDate } = await stock().lireDisponibiliteParc(REF.equipementMad, souhaitee);
    expect(premiereDate.getTime()).toBeGreaterThanOrEqual(souhaitee.getTime() - 1000);
  });
});
