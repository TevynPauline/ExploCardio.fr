import { describe, expect, it } from "vitest";
import { dbSite } from "@/lib/db/site";
import { MAX_ECHECS, compterEchec, empreinteEmail, estBloque, reussiteConnexion } from "@/domaine/comptes/securite";
import { inscrire } from "@/domaine/comptes/inscription";
import { saisieDeTest } from "./outils";

// T026 (FR-032, FR-034, D2).
describe("échecs de connexion", () => {
  it("5 échecs en 15 minutes bloquent le compte 15 minutes ; journal ; compteur par empreinte", async () => {
    const s = saisieDeTest();
    await inscrire(s);
    const t0 = new Date();
    for (let i = 1; i < MAX_ECHECS; i++) expect((await compterEchec(s.email, t0)).bloque).toBe(false);
    const r = await compterEchec(s.email, t0);
    expect(r.bloque).toBe(true);
    expect(await estBloque(s.email, new Date(t0.getTime() + 60_000))).toBe(true);
    expect(await estBloque(s.email, new Date(t0.getTime() + 16 * 60_000))).toBe(false);
    expect(await dbSite().echecConnexion.count({ where: { cle: { contains: "@" } } })).toBe(0);
    const u = await dbSite().utilisateur.findUniqueOrThrow({ where: { email: s.email } });
    expect(await dbSite().journalAction.count({ where: { action: "securite.blocage", objet: u.id } })).toBe(1);
  });

  it("une connexion réussie remet le compteur à zéro", async () => {
    const s = saisieDeTest();
    await inscrire(s);
    await compterEchec(s.email);
    await compterEchec(s.email);
    const u = await dbSite().utilisateur.findUniqueOrThrow({ where: { email: s.email } });
    await reussiteConnexion(s.email, u.id);
    expect(await dbSite().echecConnexion.findUnique({ where: { cle: empreinteEmail(s.email) } })).toBeNull();
  });

  it("un email inconnu est compté sans bloquer personne ni rien révéler", async () => {
    const inconnu = `inconnu-${Date.now()}@demo.explocardio.test`;
    for (let i = 0; i < MAX_ECHECS + 1; i++) {
      const r = await compterEchec(inconnu);
      expect(r).toEqual({ bloque: false, utilisateur: null });
    }
    expect(await estBloque(inconnu)).toBe(false);
  });
});
