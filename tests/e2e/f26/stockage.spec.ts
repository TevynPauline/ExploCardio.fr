import { expect, test } from "@playwright/test";
import { requete } from "../bases";

// F26 (T015, US1, SC-001) — en démonstration, les fichiers téléversés passent par le connecteur
// « stockage » (base du site) : adresses, en-têtes et lecture par morceaux inchangés.

const nom = () => `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

async function ranger(chemin: string, type: string, octets: Buffer) {
  await requete("site", `INSERT INTO fichier_stocke (chemin, type, octets, taille) VALUES ($1, $2, $3, $4)`, [chemin, type, octets, octets.length]);
}

test.describe("fichiers servis par le connecteur stockage", () => {
  const chemins: string[] = [];
  test.afterAll(async () => {
    if (chemins.length) await requete("site", `DELETE FROM fichier_stocke WHERE chemin = ANY($1)`, [chemins]);
  });

  test("image, SVG en pièce jointe, vidéo par morceaux, plage impossible", async ({ request }) => {
    const png = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');
    const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypisom"), Buffer.alloc(200, 7)]);
    const [cPng, cSvg, cMp4] = [`/stockage/produits/${nom()}.png`, `/stockage/marques/${nom()}.svg`, `/stockage/videos/${nom()}.mp4`];
    chemins.push(cPng, cSvg, cMp4);
    await ranger(cPng, "image/png", png);
    await ranger(cSvg, "image/svg+xml", svg);
    await ranger(cMp4, "video/mp4", mp4);

    const image = await request.get(cPng);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toBe("image/png");
    expect(image.headers()["x-content-type-options"]).toBe("nosniff");
    expect(image.headers()["content-security-policy"]).toContain("sandbox");
    expect((await image.body()).equals(png)).toBe(true);

    const logo = await request.get(cSvg);
    expect(logo.headers()["content-disposition"]).toBe("attachment");

    const morceau = await request.get(cMp4, { headers: { Range: "bytes=4-11" } });
    expect(morceau.status()).toBe(206);
    expect(morceau.headers()["content-range"]).toBe(`bytes 4-11/${mp4.length}`);
    expect((await morceau.body()).toString()).toBe("ftypisom");

    const hors = await request.get(cMp4, { headers: { Range: `bytes=${mp4.length}-` } });
    expect(hors.status()).toBe(416);
    expect(hors.headers()["content-range"]).toBe(`bytes */${mp4.length}`);

    expect((await request.get(`/stockage/produits/${nom()}.png`)).status()).toBe(404);
  });
});
