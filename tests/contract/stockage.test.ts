import { afterAll, expect, it } from "vitest";
import { dbSite } from "@/lib/db/site";
import { suiteDeContrat } from "./harness";

// F26 (T005) — contrat du connecteur stockage (specs/026-branchement-scaleway/contracts/stockage.md),
// commun à la démonstration (base du site) et au mode réel (compartiment de recette).

const aleatoire = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const chemin = () => `/stockage/tests-contrat/${aleatoire()}.bin`;

async function lireTout(flux: ReadableStream<Uint8Array>): Promise<Buffer> {
  const morceaux: Uint8Array[] = [];
  const lecteur = flux.getReader();
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    morceaux.push(value);
  }
  return Buffer.concat(morceaux);
}

suiteDeContrat("stockage", "fichiers téléversés (contracts/stockage.md)", ({ registre, mode }) => {
  const stockage = () => registre.stockage();
  // En démonstration, les fichiers de test sont retirés de la base du site.
  afterAll(async () => {
    if (mode === "demo") await dbSite().fichierStocke.deleteMany({ where: { chemin: { startsWith: "/stockage/tests-contrat/" } } });
  });
  const contenu = Buffer.from("0123456789abcdef");

  it("dépôt puis lecture identique, entière et par plage", async () => {
    const c = chemin();
    expect(await stockage().existe(c)).toBeNull();
    await stockage().deposer(c, "application/octet-stream", new Uint8Array(contenu));
    const entier = await stockage().lire(c);
    expect(entier.taille).toBe(contenu.length);
    expect(entier.plage).toBeNull();
    expect((await lireTout(entier.corps)).equals(contenu)).toBe(true);
    const partie = await stockage().lire(c, { debut: 2, fin: 5 });
    expect(partie).toMatchObject({ taille: contenu.length, plage: { debut: 2, fin: 5 } });
    expect((await lireTout(partie.corps)).toString()).toBe("2345");
    expect(await stockage().existe(c)).toMatchObject({ taille: contenu.length });
  });

  it("fichier absent : introuvable", async () => {
    await expect(stockage().lire(chemin())).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("chemin refusé et plage hors limites : opération refusée", async () => {
    await expect(stockage().lire("/stockage/../package.json")).rejects.toMatchObject({ code: "OPERATION_REFUSED" });
    await expect(stockage().deposer("/ailleurs/a.png", "image/png", new Uint8Array(1))).rejects.toMatchObject({ code: "OPERATION_REFUSED" });
    const c = chemin();
    await stockage().deposer(c, "application/octet-stream", new Uint8Array(contenu));
    await expect(stockage().lire(c, { debut: 4, fin: 99 })).rejects.toMatchObject({ code: "OPERATION_REFUSED" });
  });
});
