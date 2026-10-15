import { expect, it } from "vitest";
import { construireEvenement, serialiser } from "@/connecteurs/stripe/demo/emission";
import { cleDeTest, suiteDeContrat } from "./harness";

// T070 — contrat du connecteur Stripe (contracts/stripe.md).
// Les événements de test sont signés par la signature du mode actif : signature de
// démonstration ici ; en phase 3 (F15), le harnais fournira la signature de test de Stripe.

const client = { partenaireRef: "FICT-P-00001", email: "client.droits@demo.explocardio.test" };

suiteDeContrat("stripe", "paiements et abonnements (contracts/stripe.md)", ({ registre, mode }) => {
  const stripe = () => registre.stripe();

  it("ouvre une session de paiement, une seule fois par clé", async () => {
    const cle = cleDeTest("session");
    const session = {
      commandeRef: `FICT-TEST-${cle}`,
      montantTtc: 14_400,
      moyens: ["carte" as const, "sepa" as const],
      client,
      urlRetour: "/merci",
      urlAnnulation: "/panier",
    };
    const a = await stripe().ouvrirSessionPaiement(session, cle);
    const b = await stripe().ouvrirSessionPaiement(session, cle);
    expect(a.url).toBeTruthy();
    expect(b.sessionId).toBe(a.sessionId);
  });

  it("ouvre une session d'abonnement mensuel", async () => {
    const r = await stripe().ouvrirSessionAbonnement(
      {
        client,
        objet: "mise_a_disposition",
        abonnementRef: "FICT-SUB-TEST",
        premierMontantTtc: 7_080,
        montantMensuelTtc: 13_080,
        moyens: ["carte", "sepa"],
        urlRetour: "/merci",
        urlAnnulation: "/panier",
      },
      cleDeTest("abonnement"),
    );
    expect(r.url).toBeTruthy();
  });

  it("lève NotFound pour le remboursement d'un paiement inconnu", async () => {
    await expect(
      stripe().rembourser({ paiementRef: "pi_inconnu", montantTtc: 100, motif: "test" }, cleDeTest("remb")),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("lève NotFound pour la résiliation d'un abonnement inconnu", async () => {
    await expect(stripe().resilierAbonnement("sub_inconnu", new Date())).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it.runIf(mode === "demo")("vérifie un événement signé et le restitue typé", async () => {
    const evt = construireEvenement("paiement_reussi", { montantTtc: 14_400, moyen: "carte", carte: "amex", commandeRef: "FICT-SO-1" });
    const { contenu, signature } = serialiser(evt);
    const lu = await stripe().verifierEvenement(contenu, signature);
    expect(lu).toMatchObject({ id: evt.id, type: "paiement_reussi", carte: "amex", montantTtc: 14_400 });
    expect(lu.date).toBeInstanceOf(Date);
  });

  it("refuse un événement dont la signature est invalide", async () => {
    await expect(stripe().verifierEvenement('{"id":"x"}', "00ff")).rejects.toMatchObject({ code: "INVALID_SIGNATURE" });
  });
});
