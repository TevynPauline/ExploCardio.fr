import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { reprendre, type BaseFichiers } from "@/connecteurs/stockage/real/reprise";
import { ServiceUnavailable } from "@/connecteurs/erreurs";

// F26 (T024) : reprise des fichiers de la base vers le compartiment — copie contrôlée,
// rejouable, effacement de la base seulement après vérification de chaque objet.

const md5 = (o: Uint8Array) => createHash("md5").update(o).digest("hex");
const octets = (t: string) => new Uint8Array(Buffer.from(t));

function base(initial: Record<string, string>): BaseFichiers & { lignes: Map<string, Uint8Array> } {
  const lignes = new Map(Object.entries(initial).map(([c, t]) => [c, octets(t)]));
  return {
    lignes,
    lister: async () => [...lignes].map(([chemin, o]) => ({ chemin, type: "image/png", taille: o.length })),
    octets: async (c) => lignes.get(c) ?? null,
    effacer: vi.fn(async (c: string) => {
      lignes.delete(c);
    }),
  };
}

function compartiment(initial: Record<string, string> = {}, options: { echec?: string } = {}) {
  const objets = new Map(Object.entries(initial).map(([c, t]) => [c, octets(t)]));
  return {
    objets,
    deposer: vi.fn(async (c: string, _type: string, o: Uint8Array) => {
      if (c === options.echec) throw new ServiceUnavailable("stockage");
      objets.set(c, new Uint8Array(o));
    }),
    existe: vi.fn(async (c: string) => {
      const o = objets.get(c);
      return o ? { taille: o.length, md5: md5(o) } : null;
    }),
  };
}

const A = "/stockage/actualites/a.png";
const B = "/stockage/produits/b.pdf";
const C = "/stockage/aide/c.mp4";

describe("reprise des fichiers en base", () => {
  it("fichier absent → copié puis contrôlé ; présent identique → déjà présent ; présent différent → recopié", async () => {
    const b = base({ [A]: "aaa", [B]: "bbb", [C]: "ccc" });
    const s = compartiment({ [B]: "bbb", [C]: "ancien" });
    const bilan = await reprendre({ client: s, base: b });
    expect(bilan).toMatchObject({ copies: 2, dejaPresents: 1, enErreur: [], effaces: 0, restantEnBase: 3 });
    expect(Buffer.from(s.objets.get(A)!).toString()).toBe("aaa");
    expect(Buffer.from(s.objets.get(C)!).toString()).toBe("ccc");
    expect(s.deposer).toHaveBeenCalledTimes(2);
  });

  it("relance : aucune copie en double", async () => {
    const b = base({ [A]: "aaa", [B]: "bbb" });
    const s = compartiment();
    await reprendre({ client: s, base: b });
    s.deposer.mockClear();
    const bilan = await reprendre({ client: s, base: b });
    expect(bilan).toMatchObject({ copies: 0, dejaPresents: 2 });
    expect(s.deposer).not.toHaveBeenCalled();
  });

  it("échec d'une copie : en erreur, les autres continuent", async () => {
    const b = base({ [A]: "aaa", [B]: "bbb", [C]: "ccc" });
    const s = compartiment({}, { echec: B });
    const lignes: string[] = [];
    const bilan = await reprendre({ client: s, base: b, journal: (l) => lignes.push(l) });
    expect(bilan).toMatchObject({ copies: 2, enErreur: [B] });
    expect(lignes.find((l) => l.includes(B))).toMatch(/en erreur .*SERVICE_UNAVAILABLE/);
  });

  it("copie non conforme au contrôle : en erreur", async () => {
    const b = base({ [A]: "aaa" });
    const s = compartiment();
    s.deposer.mockImplementation(async (c: string) => {
      s.objets.set(c, octets("tronqué"));
    });
    expect((await reprendre({ client: s, base: b })).enErreur).toEqual([A]);
  });

  it("sans l'option, aucune ligne effacée", async () => {
    const b = base({ [A]: "aaa" });
    await reprendre({ client: compartiment(), base: b });
    expect(b.effacer).not.toHaveBeenCalled();
  });

  it("--effacer-la-base refusé s'il reste un fichier non vérifié", async () => {
    const b = base({ [A]: "aaa", [B]: "bbb" });
    const bilan = await reprendre({ client: compartiment({}, { echec: B }), base: b, effacer: true });
    expect(bilan).toMatchObject({ effacementRefuse: true, effaces: 0, restantEnBase: 2 });
    expect(b.effacer).not.toHaveBeenCalled();
  });

  it("--effacer-la-base : chaque ligne effacée après relecture de son objet", async () => {
    const b = base({ [A]: "aaa", [B]: "bbb" });
    const s = compartiment();
    const bilan = await reprendre({ client: s, base: b, effacer: true });
    expect(bilan).toMatchObject({ copies: 2, effaces: 2, restantEnBase: 0, effacementRefuse: false });
    // dépôt, contrôle après copie, puis relecture avant effacement
    expect(s.existe.mock.calls.filter(([c]) => c === A)).toHaveLength(3);
  });

  it("objet disparu avant l'effacement : ligne conservée", async () => {
    const b = base({ [A]: "aaa", [B]: "bbb" });
    const s = compartiment();
    let appels = 0;
    const existe = s.existe.getMockImplementation()!;
    s.existe.mockImplementation(async (c: string) => (c === B && ++appels === 3 ? null : existe(c)));
    const bilan = await reprendre({ client: s, base: b, effacer: true });
    expect(bilan).toMatchObject({ effaces: 1, enErreur: [B], restantEnBase: 1 });
    expect(b.lignes.has(B)).toBe(true);
  });
});
