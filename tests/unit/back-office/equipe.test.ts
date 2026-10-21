import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { changerRole, desactiver, EquipeRefusee, estDesactive, inviter, listerEquipe, reactiver } from "@/domaine/equipe";
import { auth } from "@/lib/auth";
import { dbSite } from "@/lib/db/site";

// T005 — équipe du back-office (F13, US9, FR-023, D4) : invitation, rôle, désactivation,
// réactivation, dernier administrateur, journal.

const auteur = { id: "test-admin", libelle: "Test (admin)" };
const adresse = (n: string) => `equipe-${n}-${randomBytes(4).toString("hex")}@demo.explocardio.test`;
const crees: string[] = [];

afterAll(async () => {
  await dbSite().utilisateur.deleteMany({ where: { id: { in: crees } } });
});

describe("invitation", () => {
  it("crée le membre avec son rôle, envoie l'email d'invitation et journalise", async () => {
    const email = adresse("commercial");
    const id = await inviter({ nom: "Camille Commerciale", email, role: "commercial" }, auteur);
    crees.push(id);
    const u = await dbSite().utilisateur.findUniqueOrThrow({ where: { id } });
    expect(u).toMatchObject({ role: "commercial", emailVerified: true, desactiveLe: null });
    expect(u.inviteLe).not.toBeNull();
    const m = await dbSite().messageDemonstration.findFirst({ where: { destinataire: email }, orderBy: { date: "desc" } });
    expect(m?.objet).toBe("Votre accès au back-office d'ExploCardio.fr");
    expect(m?.rendu).toContain("reset-password");
    expect(await dbSite().journalAction.count({ where: { action: "equipe.invitation", objet: email } })).toBe(1);
    expect((await listerEquipe()).some((x) => x.id === id)).toBe(true);
  });

  it("refuse une adresse déjà utilisée, invalide ou un rôle inconnu", async () => {
    const email = adresse("double");
    crees.push(await inviter({ nom: "Dominique Double", email, role: "support" }, auteur));
    await expect(inviter({ nom: "Autre", email, role: "support" }, auteur)).rejects.toThrow(EquipeRefusee);
    await expect(inviter({ nom: "Autre", email: "pas-une-adresse", role: "support" }, auteur)).rejects.toThrow(/invalide/);
    await expect(inviter({ nom: "Autre", email: adresse("role"), role: "client" as never }, auteur)).rejects.toThrow(/Rôle/);
  });
});

describe("rôle et désactivation", () => {
  it("désactiver : sessions supprimées, connexion refusée ; réactiver : rétabli ; tout est journalisé", async () => {
    const email = adresse("support");
    const id = await inviter({ nom: "Sacha Support", email, role: "support" }, auteur);
    crees.push(id);
    await dbSite().session.create({ data: { id: `s-${id}`, token: `t-${id}`, userId: id, expiresAt: new Date(Date.now() + 3600_000) } });
    await desactiver(id, auteur);
    expect(await dbSite().session.count({ where: { userId: id } })).toBe(0);
    expect(await estDesactive(email)).toBe(true);
    await expect(auth.api.signInEmail({ body: { email, password: "n-importe-lequel-2026!" } })).rejects.toThrow();
    await reactiver(id, auteur);
    expect(await estDesactive(email)).toBe(false);
    await changerRole(id, "commercial", auteur);
    expect((await dbSite().utilisateur.findUniqueOrThrow({ where: { id } })).role).toBe("commercial");
    const actions = (await dbSite().journalAction.findMany({ where: { objet: email }, orderBy: { date: "asc" } })).map((j) => j.action);
    expect(actions).toEqual(["equipe.invitation", "equipe.desactivation", "equipe.reactivation", "equipe.role"]);
  });

  it("le dernier administrateur actif ne peut être ni rétrogradé ni désactivé", async () => {
    const admins = await dbSite().utilisateur.findMany({ where: { role: "admin", desactiveLe: null } });
    // Ne garder qu'un administrateur actif le temps du test.
    const autres = admins.slice(1).map((a) => a.id);
    const id = admins[0]!.id;
    await dbSite().utilisateur.updateMany({ where: { id: { in: autres } }, data: { desactiveLe: new Date() } });
    try {
      await expect(desactiver(id, auteur)).rejects.toThrow(/au moins un administrateur/);
      await expect(changerRole(id, "support", auteur)).rejects.toThrow(/au moins un administrateur/);
    } finally {
      await dbSite().utilisateur.updateMany({ where: { id: { in: autres } }, data: { desactiveLe: null } });
    }
  });
});
