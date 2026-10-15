import { expect, it } from "vitest";
import { emailEssai } from "@/emails/modeles";
import { cleDeTest, suiteDeContrat } from "./harness";

// T065 — contrat du connecteur emailing (contracts/emailing.md).

suiteDeContrat("emailing", "emails et notifications (contracts/emailing.md)", ({ registre, mode }) => {
  const emailing = () => registre.emailing();

  it("envoie un email transactionnel une seule fois par clé, et donne son état de remise", async () => {
    const email = await emailEssai();
    const cle = cleDeTest("email");
    const a = await emailing().envoyerTransactionnel({ ...email, destinataire: "contrat@demo.explocardio.test", declencheur: "test de contrat" }, cle);
    const b = await emailing().envoyerTransactionnel({ ...email, destinataire: "contrat@demo.explocardio.test", declencheur: "test de contrat" }, cle);
    expect(b.envoiId).toBe(a.envoiId);
    expect(["envoye", "remis"]).toContain(await emailing().lireEtatRemise(a.envoiId));
  });

  it("envoie une notification d'équipe par email et par SMS", async () => {
    for (const canal of ["email", "sms"] as const) {
      const { envoiId } = await emailing().envoyerNotificationEquipe(
        { canal, destinataires: ["equipe@demo.explocardio.test"], texte: "Nouvelle demande de financement.", declencheur: "test de contrat" },
        cleDeTest(`notif-${canal}`),
      );
      expect(envoiId).toBeTruthy();
    }
  });

  it("met à jour un contact marketing", async () => {
    await expect(
      emailing().mettreAJourContact({ email: "contrat@demo.explocardio.test", consentements: { newsletter: true } }),
    ).resolves.toBeUndefined();
  });

  it.runIf(mode === "demo")("simule le rejet pour les adresses de test prévues", async () => {
    const email = await emailEssai();
    const { envoiId } = await emailing().envoyerTransactionnel(
      { ...email, destinataire: "boite-pleine@rejet.demo.explocardio.test", declencheur: "test de contrat" },
      cleDeTest("rejet"),
    );
    expect(await emailing().lireEtatRemise(envoiId)).toBe("rejete");
  });

  it("lève NotFound pour un envoi inconnu", async () => {
    await expect(emailing().lireEtatRemise("envoi-inconnu")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
