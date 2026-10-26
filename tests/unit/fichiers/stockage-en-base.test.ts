import { describe, expect, it } from "vitest";
import { deposerDocument, deposerImage, lireFichier } from "@/lib/stockage";
import { dbSite } from "@/lib/db/site";

// Fichiers téléversés gardés dans la base du site (le disque de Scalingo est éphémère).

const PNG = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");

describe("stockage en base", () => {
  it("une image déposée est relue depuis la base, avec son type", async () => {
    const chemin = await deposerImage(new File([PNG], "photo.png", { type: "image/png" }), "produits");
    expect(chemin).toMatch(/^\/stockage\/produits\/[0-9a-f]{24}\.png$/);
    const lu = await lireFichier(chemin.split("/").slice(2));
    expect(lu?.type).toBe("image/png");
    expect(lu?.octets.equals(PNG)).toBe(true);
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
  });
});
