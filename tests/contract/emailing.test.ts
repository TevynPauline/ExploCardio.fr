import { afterEach, expect, it } from "vitest";
import { definirPanne } from "@/connecteurs/panne-simulee";
import { dbSite } from "@/lib/db/site";
import { emailEssai } from "@/emails/modeles";
import { cleDeTest, suiteDeContrat } from "./harness";

// T065, F10 T003 — contrat du connecteur emailing (specs/010-emailing-automatise/contracts/emailing.md).

const DESTINATAIRE = "contrat@demo.explocardio.test";

suiteDeContrat("emailing", "emails et notifications (contracts/emailing.md)", ({ registre, mode }) => {
  const emailing = () => registre.emailing();
  const email = async (destinataire = DESTINATAIRE) => ({
    ...(await emailEssai()),
    famille: "transactionnel" as const,
    destinataire,
    declencheur: "test de contrat",
  });

  afterEach(async () => {
    if (mode === "demo") await definirPanne("emailing", false);
  });

  it("envoie un email une seule fois par clé, et donne son suivi", async () => {
    const cle = cleDeTest("email");
    const a = await emailing().envoyerEmail(await email(), cle);
    const b = await emailing().envoyerEmail(await email(), cle);
    expect(b.envoiId).toBe(a.envoiId);
    const suivi = await emailing().lireSuivi(a.envoiId);
    expect(["envoye", "remis"]).toContain(suivi.etat);
    expect(suivi.motifRejet).toBeNull();
  });

  it("transmet l'adresse de désinscription des emails de service et commerciaux", async () => {
    const { envoiId } = await emailing().envoyerEmail(
      { ...(await email()), famille: "commercial", desinscription: "https://exemple.test/api/emails/desinscription?j=x" },
      cleDeTest("commercial"),
    );
    expect(envoiId).toBeTruthy();
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
    await expect(emailing().mettreAJourContact({ email: DESTINATAIRE, consentements: { newsletter: true } })).resolves.toBeUndefined();
  });

  it("refuse une adresse invalide", async () => {
    await expect(emailing().envoyerEmail(await email("pas-une-adresse"), cleDeTest("invalide"))).rejects.toMatchObject({ code: "OPERATION_REFUSED" });
  });

  it("lève NotFound pour un envoi inconnu", async () => {
    await expect(emailing().lireSuivi("envoi-inconnu")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it.runIf(mode === "demo")("simule les rejets définitifs et temporaires", async () => {
    const definitif = await emailing().envoyerEmail(await email("inconnu@rejet.demo.explocardio.test"), cleDeTest("rejet"));
    expect(await emailing().lireSuivi(definitif.envoiId)).toMatchObject({ etat: "rejete", rejetDefinitif: true });
    const temporaire = await emailing().envoyerEmail(await email("pleine@temporaire.demo.explocardio.test"), cleDeTest("temporaire"));
    expect(await emailing().lireSuivi(temporaire.envoiId)).toMatchObject({ etat: "rejete", rejetDefinitif: false });
  });

  it.runIf(mode === "demo")("ne conserve que l'adresse, l'objet, le rendu et le texte (FR-039)", async () => {
    const e = await email();
    const { envoiId } = await emailing().envoyerEmail(e, cleDeTest("minimal"));
    const m = await dbSite().messageDemonstration.findUniqueOrThrow({ where: { id: envoiId } });
    expect(m).toMatchObject({ destinataire: DESTINATAIRE, objet: e.objet, rendu: e.rendu, texte: e.texte });
  });

  it.runIf(mode === "demo")("lève ServiceUnavailable pendant une panne simulée", async () => {
    await definirPanne("emailing", true);
    await expect(emailing().envoyerEmail(await email(), cleDeTest("panne"))).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });
});
