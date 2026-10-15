import { expect, it } from "vitest";
import { cleDeTest, suiteDeContrat } from "../harness";
import { REF } from "./outils";

suiteDeContrat("odoo", "clients (contracts/odoo.md §3)", ({ registre }) => {
  const clients = () => registre.odoo().clients;
  const identite = (rpps: string) => ({
    nom: "Dr Test Clients",
    email: `clients-${rpps}@demo.explocardio.test`,
    rpps,
    adresses: [{ type: "cabinet" as const, ligne1: "2 rue du Test", codePostal: "69001", ville: "Lyon" }],
  });

  it("crée un partenaire puis le retrouve sans doublon (même clé ou même RPPS)", async () => {
    const rpps = `99${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;
    const cle = cleDeTest("client");
    const premier = await clients().creerOuRetrouverPartenaire(identite(rpps), cle);
    expect(premier.cree).toBe(true);
    const memeCle = await clients().creerOuRetrouverPartenaire(identite(rpps), cle);
    expect(memeCle).toEqual({ ref: premier.ref, cree: false });
    const memeRpps = await clients().creerOuRetrouverPartenaire(identite(rpps), cleDeTest("autre"));
    expect(memeRpps.ref).toBe(premier.ref);
  });

  it("met à jour les coordonnées", async () => {
    const rpps = `99${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;
    const { ref } = await clients().creerOuRetrouverPartenaire(identite(rpps), cleDeTest("maj"));
    await clients().mettreAJourCoordonnees(ref, { telephone: "+33 6 99 00 00 01" });
    const situation = await clients().lireSituation(ref);
    expect(situation.partenaire.telephone).toBe("+33 6 99 00 00 01");
  });

  it("lit la situation d'un client : commandes, factures, locations, droits", async () => {
    const s = await clients().lireSituation(REF.partenaireDroitsActifs);
    expect(s.commandesRecentes.length).toBeGreaterThan(0);
    expect(s.factures.length).toBeGreaterThan(0);
    expect(s.locations.length).toBeGreaterThan(0);
    expect(s.droitsAssistance.statut).toBe("actif");
  });

  it("lève NotFound pour un partenaire inconnu", async () => {
    await expect(clients().lireSituation("FICT-P-INCONNU")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
