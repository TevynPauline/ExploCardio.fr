import { PDFDocument } from "pdf-lib";
import { expect, it } from "vitest";
import { cleDeTest, suiteDeContrat } from "../harness";
import { livraison, nouveauPartenaire, REF } from "./outils";

/** Texte brut des flux du PDF (suffisant pour retrouver une mention écrite en clair). */
async function contientMention(pdf: Uint8Array, mention: string): Promise<boolean> {
  const doc = await PDFDocument.load(pdf);
  const titre = doc.getTitle() ?? "";
  const brut = Buffer.from(pdf).toString("latin1");
  const hexa = Buffer.from(mention, "latin1").toString("hex").toUpperCase();
  return titre.includes(mention) || brut.includes(mention) || brut.toUpperCase().includes(hexa);
}

suiteDeContrat("odoo", "factures (contracts/odoo.md §5)", ({ registre, mode }) => {
  const factures = () => registre.odoo().factures;

  it("liste les factures d'un client avec leur état de paiement", async () => {
    const partenaireRef = await nouveauPartenaire(registre);
    const { ref } = await registre.odoo().commandes.creerCommandePayee(
      {
        partenaireRef,
        lignes: [{ defaultCode: REF.accessoire, quantite: 1 }],
        livraison,
        paiement: { mode: "carte", reference: "FICT-PAY-facture" },
      },
      cleDeTest("facture"),
    );
    const liste = await factures().listerFactures(partenaireRef);
    const f = liste.find((x) => x.commandeRef === ref);
    expect(f).toMatchObject({ type: "facture", etatPaiement: "paye" });
    expect(f!.montantTtc).toBeGreaterThan(f!.montantHt);
  });

  it("fournit le PDF d'une facture", async () => {
    const [f] = await factures().listerFactures(REF.partenaireDroitsActifs);
    const pdf = await factures().obtenirPdf(f!.numero);
    expect(Buffer.from(pdf.subarray(0, 5)).toString()).toBe("%PDF-");
  });

  it.runIf(mode === "demo")(
    "SC-008 : chaque facture et chaque avoir de démonstration porte la mention « FICTIVE »",
    async () => {
      for (const partenaire of [REF.partenaireDroitsActifs, REF.partenaireSansDroits]) {
        for (const f of await factures().listerFactures(partenaire)) {
          expect(await contientMention(await factures().obtenirPdf(f.numero), "FICTIVE"), f.numero).toBe(true);
        }
      }
    },
  );

  it("fournit les niveaux de relance des paiements en retard, du premier au dernier (F10)", async () => {
    const niveaux = await factures().lireNiveauxRelance();
    expect(niveaux.length).toBeGreaterThan(0);
    expect(niveaux.map((n) => n.niveau)).toEqual([...niveaux.map((n) => n.niveau)].sort((x, y) => x - y));
    for (const n of niveaux) expect(n.joursAvantConsequence).toBeGreaterThan(0);
    expect(niveaux.at(-1)!.annonceConsequence).toBe(true);
  });

  it("lève NotFound pour une facture inconnue", async () => {
    await expect(factures().obtenirPdf("FICT/0000/99999")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
