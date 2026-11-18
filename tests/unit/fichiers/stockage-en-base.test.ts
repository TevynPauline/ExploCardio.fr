import { describe, expect, it } from "vitest";
import { deposerDocument, deposerImage, deposerVideo, lireFichier } from "@/lib/stockage";
import { dbSite } from "@/lib/db/site";

// Fichiers téléversés : en démonstration, le connecteur « stockage » les garde dans la base du
// site (F26, R4) ; la lecture passe par le connecteur, en flux, entière ou par plage.

const PNG = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");

async function lireTout(flux: ReadableStream<Uint8Array>): Promise<Buffer> {
  return Buffer.from(await new Response(flux).arrayBuffer());
}

describe("stockage en base (démonstration)", () => {
  it("une image déposée est relue par le connecteur, avec son type", async () => {
    const chemin = await deposerImage(new File([PNG], "photo.png", { type: "image/png" }), "produits");
    expect(chemin).toMatch(/^\/stockage\/produits\/[0-9a-f]{24}\.png$/);
    expect(await dbSite().fichierStocke.count({ where: { chemin } })).toBe(1);
    const lu = await lireFichier(chemin.split("/").slice(2));
    expect(lu).toMatchObject({ type: "image/png", taille: PNG.length, plage: null });
    expect((await lireTout(lu!.corps)).equals(PNG)).toBe(true);
    await dbSite().fichierStocke.delete({ where: { chemin } });
  });

  it("un PDF aussi ; un chemin inconnu ou hors du dossier ne renvoie rien", async () => {
    const pdf = Buffer.from("%PDF-1.4\n%fictif\n");
    const { chemin, octets } = await deposerDocument(new File([pdf], "notice.pdf", { type: "application/pdf" }));
    expect(octets).toBe(pdf.length);
    expect((await lireFichier(chemin.split("/").slice(2)))?.type).toBe("application/pdf");
    await dbSite().fichierStocke.delete({ where: { chemin } });
    expect(await lireFichier(["produits", "000000000000000000000000.png"])).toBeNull();
    expect(await lireFichier(["..", "package.json"])).toBeNull();
    expect(await lireFichier(["produits", "a.exe"])).toBeNull();
  });

  it("une vidéo se lit par plage ; une plage impossible est refusée", async () => {
    const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypisom"), Buffer.alloc(100, 7)]);
    const chemin = await deposerVideo(new File([mp4], "aide.mp4", { type: "video/mp4" }));
    const segments = chemin.split("/").slice(2);
    const debut = await lireFichier(segments, "bytes=4-11");
    expect(debut).toMatchObject({ taille: mp4.length, plage: { debut: 4, fin: 11 } });
    expect((await lireTout(debut!.corps)).toString()).toBe("ftypisom");
    expect((await lireFichier(segments, "bytes=-10"))?.plage).toEqual({ debut: mp4.length - 10, fin: mp4.length - 1 });
    await expect(lireFichier(segments, `bytes=${mp4.length}-`)).rejects.toMatchObject({ code: "OPERATION_REFUSED" });
    await dbSite().fichierStocke.delete({ where: { chemin } });
  });
});
