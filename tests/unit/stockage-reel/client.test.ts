import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";
import { creerClientStockage, pointAcces, traduireErreur, type CommandeS3 } from "@/connecteurs/stockage/real/client";
import { creerStockageReel } from "@/connecteurs/stockage/real";
import { fluxDe } from "@/connecteurs/stockage/chemins";

// F26 (T021) : mode réel du stockage avec un client S3 simulé — commandes envoyées, lecture en
// flux et par plage, correspondance des erreurs du contrat, clé jamais exposée.

const COMPARTIMENT = "explocardio-recette";
const CHEMIN = "/stockage/actualites/a1b2.png";
const SECRET = "secret-de-test-ne-doit-jamais-sortir";

function corps(texte: string) {
  return { transformToWebStream: () => fluxDe(new Uint8Array(Buffer.from(texte))), destroy: vi.fn() };
}

async function texte(flux: ReadableStream<Uint8Array>) {
  return Buffer.from(await new Response(flux).arrayBuffer()).toString();
}

function erreurS3(name: string, statut?: number) {
  return Object.assign(new Error(`${name} (${SECRET})`), { name, $metadata: { httpStatusCode: statut } });
}

function client(reponse: (c: CommandeS3) => unknown) {
  const envoyer = vi.fn(async (c: CommandeS3) => reponse(c));
  return { envoyer, stockage: creerClientStockage(COMPARTIMENT, envoyer) };
}

describe("mode réel du stockage : commandes S3", () => {
  it("point d'accès Scaleway de la région", () => {
    expect(pointAcces("fr-par")).toBe("https://s3.fr-par.scw.cloud");
  });

  it("dépôt : PutObject avec clé, type et Content-MD5 en base 64", async () => {
    const { envoyer, stockage } = client(() => ({}));
    await stockage.deposer(CHEMIN, "image/png", new Uint8Array(Buffer.from("abc")));
    const c = envoyer.mock.calls[0]![0];
    expect(c).toBeInstanceOf(PutObjectCommand);
    expect(c.input).toMatchObject({
      Bucket: COMPARTIMENT,
      Key: "stockage/actualites/a1b2.png",
      ContentType: "image/png",
      ContentMD5: "kAFQmDzST7DWlj99KOF/cg==", // MD5 de « abc »
      ContentLength: 3,
    });
  });

  it("lecture entière : GetObject sans plage, taille lue dans ContentLength", async () => {
    const { envoyer, stockage } = client(() => ({ Body: corps("0123456789"), ContentLength: 10 }));
    const lu = await stockage.lire(CHEMIN);
    expect(envoyer.mock.calls[0]![0]).toBeInstanceOf(GetObjectCommand);
    expect(envoyer.mock.calls[0]![0].input).not.toHaveProperty("Range");
    expect(lu).toMatchObject({ taille: 10, plage: null });
    expect(await texte(lu.corps)).toBe("0123456789");
  });

  it("lecture d'une plage : Range demandé, taille lue dans ContentRange", async () => {
    const { envoyer, stockage } = client(() => ({ Body: corps("2345"), ContentLength: 4, ContentRange: "bytes 2-5/16" }));
    const lu = await stockage.lire(CHEMIN, { debut: 2, fin: 5 });
    expect(envoyer.mock.calls[0]![0].input).toMatchObject({ Range: "bytes=2-5" });
    expect(lu).toMatchObject({ taille: 16, plage: { debut: 2, fin: 5 } });
    expect(await texte(lu.corps)).toBe("2345");
  });

  it("plage qui dépasse la fin (raccourcie par S3) : refusée, corps abandonné", async () => {
    const b = corps("456789abcdef");
    const { stockage } = client(() => ({ Body: b, ContentLength: 12, ContentRange: "bytes 4-15/16" }));
    await expect(stockage.lire(CHEMIN, { debut: 4, fin: 99 })).rejects.toMatchObject({ code: "OPERATION_REFUSED", details: { taille: 16 } });
    expect(b.destroy).toHaveBeenCalled();
  });

  it("plage mal formée ou chemin refusé : aucun appel", async () => {
    const { envoyer, stockage } = client(() => ({}));
    await expect(stockage.lire(CHEMIN, { debut: 5, fin: 2 })).rejects.toMatchObject({ code: "OPERATION_REFUSED" });
    await expect(stockage.lire("/stockage/../x.png")).rejects.toMatchObject({ code: "OPERATION_REFUSED" });
    await expect(stockage.existe("/ailleurs/x.png")).rejects.toMatchObject({ code: "OPERATION_REFUSED" });
    expect(envoyer).not.toHaveBeenCalled();
  });

  it("présence : HeadObject, ETag sans guillemets ; ETag composite → empreinte inconnue", async () => {
    const { envoyer, stockage } = client(() => ({ ContentLength: 3, ETag: '"900150983cd24fb0d6963f7d28e17f72"' }));
    expect(await stockage.existe(CHEMIN)).toEqual({ taille: 3, md5: "900150983cd24fb0d6963f7d28e17f72" });
    expect(envoyer.mock.calls[0]![0]).toBeInstanceOf(HeadObjectCommand);
    const composite = client(() => ({ ContentLength: 3, ETag: '"9b2cf535f27731c974343645a3985328-2"' }));
    expect(await composite.stockage.existe(CHEMIN)).toEqual({ taille: 3, md5: null });
  });

  it("présence d'un fichier absent : null", async () => {
    const { stockage } = client(() => {
      throw erreurS3("NotFound", 404);
    });
    expect(await stockage.existe(CHEMIN)).toBeNull();
  });
});

describe("mode réel du stockage : erreurs du contrat", () => {
  const cas: [string, number | undefined, string, unknown?][] = [
    ["NoSuchKey", 404, "NOT_FOUND"],
    ["NotFound", 404, "NOT_FOUND"],
    ["UnknownError", 404, "NOT_FOUND"],
    ["AccessDenied", 403, "CONFIGURATION_INCOMPLETE", ["STOCKAGE_CLE_ACCES", "STOCKAGE_CLE_SECRETE"]],
    ["InvalidAccessKeyId", 403, "CONFIGURATION_INCOMPLETE", ["STOCKAGE_CLE_ACCES", "STOCKAGE_CLE_SECRETE"]],
    ["SignatureDoesNotMatch", 403, "CONFIGURATION_INCOMPLETE", ["STOCKAGE_CLE_ACCES", "STOCKAGE_CLE_SECRETE"]],
    ["NoSuchBucket", 404, "CONFIGURATION_INCOMPLETE", ["STOCKAGE_COMPARTIMENT"]],
    ["InvalidRange", 416, "OPERATION_REFUSED"],
    ["InternalError", 500, "SERVICE_UNAVAILABLE"],
    ["SlowDown", 503, "SERVICE_UNAVAILABLE"],
    ["TimeoutError", undefined, "SERVICE_UNAVAILABLE"],
    ["ECONNREFUSED", undefined, "SERVICE_UNAVAILABLE"],
  ];

  it.each(cas)("%s (%s) → %s", async (nom, statut, code, variables) => {
    const { stockage } = client(() => {
      throw erreurS3(nom, statut);
    });
    const erreur = await stockage.lire(CHEMIN).catch((e: unknown) => e);
    expect(erreur).toMatchObject({ code });
    if (variables) expect((erreur as { details: { variablesManquantes: string[] } }).details.variablesManquantes).toEqual(variables);
    expect(JSON.stringify({ m: (erreur as Error).message, d: (erreur as { details?: unknown }).details })).not.toContain(SECRET);
  });

  it("dépôt en panne : ServiceUnavailable, sans le message d'origine", async () => {
    const { stockage } = client(() => {
      throw erreurS3("InternalError", 500);
    });
    const e = await stockage.deposer(CHEMIN, "image/png", new Uint8Array(1)).catch((x: unknown) => x);
    expect(e).toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    expect(JSON.stringify(e)).not.toContain(SECRET);
  });

  it("erreur sans forme connue : ServiceUnavailable", () => {
    expect(traduireErreur("bizarre", CHEMIN)).toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });
});

describe("fabrique du mode réel", () => {
  const env = {
    STOCKAGE_ENVIRONNEMENT: "recette",
    STOCKAGE_COMPARTIMENT: COMPARTIMENT,
    STOCKAGE_CLE_ACCES: "cle-acces-de-test",
    STOCKAGE_CLE_SECRETE: SECRET,
  };

  it("configuration incomplète : refus à chaque appel", async () => {
    await expect(creerStockageReel(["STOCKAGE_CLE_SECRETE"], env).existe(CHEMIN)).rejects.toMatchObject({ code: "CONFIGURATION_INCOMPLETE" });
  });

  it("région invalide : refusée, sans appel", async () => {
    const envoyer = vi.fn();
    const s = creerStockageReel([], { ...env, STOCKAGE_REGION: "evil.example.com/x" }, { envoyer });
    await expect(s.existe(CHEMIN)).rejects.toMatchObject({ code: "CONFIGURATION_INCOMPLETE", details: { variablesManquantes: ["STOCKAGE_REGION"] } });
    expect(envoyer).not.toHaveBeenCalled();
  });

  it("configuration complète : utilise le compartiment déclaré", async () => {
    const envoyer = vi.fn(async () => ({ ContentLength: 1, ETag: '"x"' }));
    await creerStockageReel([], env, { envoyer }).existe(CHEMIN);
    expect((envoyer.mock.calls[0] as unknown as [CommandeS3])[0].input).toMatchObject({ Bucket: COMPARTIMENT });
  });
});
