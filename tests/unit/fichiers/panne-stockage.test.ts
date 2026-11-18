import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigurationIncomplete, ServiceUnavailable } from "@/connecteurs/erreurs";
import { registre } from "@/connecteurs/registre";
import { deposerImage, FichierRefuse, MESSAGE_STOCKAGE_INDISPONIBLE, MESSAGE_STOCKAGE_NON_CONFIGURE } from "@/lib/stockage";
import { GET } from "@app/stockage/[...chemin]/route";

// F26 (T018, FR-014, US4) : panne ou configuration du stockage → message clair au dépôt ;
// en lecture, 503 sans détail.

const PNG = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");
const image = () => new File([PNG], "photo.png", { type: "image/png" });

function stockageEnErreur(erreur: Error) {
  const panne = { deposer: vi.fn().mockRejectedValue(erreur), lire: vi.fn().mockRejectedValue(erreur), existe: vi.fn().mockRejectedValue(erreur) };
  vi.spyOn(registre, "stockage").mockReturnValue(panne);
}

describe("panne du stockage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("dépôt pendant une panne : message « momentanément indisponible »", async () => {
    stockageEnErreur(new ServiceUnavailable("stockage"));
    await expect(deposerImage(image(), "produits")).rejects.toEqual(new FichierRefuse(MESSAGE_STOCKAGE_INDISPONIBLE));
    expect(MESSAGE_STOCKAGE_INDISPONIBLE).toBe("Le stockage des fichiers est momentanément indisponible. Réessayez dans quelques minutes.");
  });

  it("dépôt sans configuration : l'administrateur doit être prévenu", async () => {
    stockageEnErreur(new ConfigurationIncomplete("stockage", ["STOCKAGE_COMPARTIMENT"]));
    await expect(deposerImage(image(), "produits")).rejects.toEqual(new FichierRefuse(MESSAGE_STOCKAGE_NON_CONFIGURE));
  });

  it("lecture pendant une panne : 503 sans détail", async () => {
    stockageEnErreur(new ServiceUnavailable("stockage"));
    const r = await GET(new Request("http://site/stockage/produits/a.png"), { params: Promise.resolve({ chemin: ["produits", "a.png"] }) });
    expect(r.status).toBe(503);
    expect(await r.text()).toBe("Indisponible");
  });
});
