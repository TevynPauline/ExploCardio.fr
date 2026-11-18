import { createHash } from "node:crypto";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ConfigurationIncomplete, NotFound, OperationRefusee, ServiceUnavailable, estErreurConnecteur } from "../../erreurs";
import { cleObjet, verifierPlage } from "../chemins";
import type { ConnecteurStockage, LectureFichier, Plage } from "../interfaces";

// Client Scaleway Object Storage, compatible S3 (F26, research R1, contracts/stockage.md).
// Seul fichier du site qui parle à Scaleway. Délais : 10 s sans réponse en lecture, 60 s pour
// un dépôt ; 2 tentatives. La clé secrète n'apparaît dans aucun message ni détail d'erreur.

export type CommandeS3 = PutObjectCommand | GetObjectCommand | HeadObjectCommand;
/** Envoi d'une commande : `S3Client.send`, ou une fonction simulée dans les tests. */
export type EnvoiS3 = (commande: CommandeS3, options?: { abortSignal?: AbortSignal }) => Promise<unknown>;

export type AccesStockage = { compartiment: string; region: string; cleAcces: string; cleSecrete: string };

const DELAI_LECTURE_MS = 10_000;
const DELAI_DEPOT_MS = 60_000;

/** Point d'accès Scaleway de la région (« fr-par » → https://s3.fr-par.scw.cloud). */
export function pointAcces(region: string): string {
  return `https://s3.${region}.scw.cloud`;
}

export function creerEnvoiScaleway(acces: AccesStockage): EnvoiS3 {
  const client = new S3Client({
    endpoint: pointAcces(acces.region),
    region: acces.region,
    credentials: { accessKeyId: acces.cleAcces, secretAccessKey: acces.cleSecrete },
    maxAttempts: 2,
    // Empreintes CRC ajoutées par défaut par le SDK : non nécessaires (Content-MD5 suffit) et
    // mal prises en charge par les services compatibles S3.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    requestHandler: { connectionTimeout: 5_000, requestTimeout: DELAI_LECTURE_MS },
  });
  return (commande, options) => client.send(commande as GetObjectCommand, options);
}

type ErreurS3 = { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };

const CLE_REFUSEE = new Set(["AccessDenied", "InvalidAccessKeyId", "SignatureDoesNotMatch", "Forbidden", "AllAccessDisabled"]);

/** Erreur S3 → erreur du contrat. Une erreur déjà traduite est rendue telle quelle. */
export function traduireErreur(e: unknown, chemin: string, plage?: Plage): unknown {
  if (estErreurConnecteur(e)) return e;
  const err = (typeof e === "object" && e !== null ? e : {}) as ErreurS3;
  const code = err.Code ?? err.name ?? "inconnu";
  const statut = err.$metadata?.httpStatusCode ?? null;
  if (code === "NoSuchBucket") return new ConfigurationIncomplete("stockage", ["STOCKAGE_COMPARTIMENT"]);
  if (CLE_REFUSEE.has(code) || statut === 403) return new ConfigurationIncomplete("stockage", ["STOCKAGE_CLE_ACCES", "STOCKAGE_CLE_SECRETE"]);
  if (code === "NoSuchKey" || code === "NotFound" || statut === 404) return new NotFound("Fichier", chemin);
  if (code === "InvalidRange" || statut === 416) return new OperationRefusee("Plage d'octets hors des limites du fichier.", { ...plage });
  // Réseau, délai dépassé, 5xx, réponse inattendue : seul le code est conservé, jamais le message.
  return new ServiceUnavailable("stockage", { code: String(code).slice(0, 60), statut });
}

/** Empreinte MD5 d'un contenu, en base 64 (en-tête Content-MD5) et en hexadécimal (ETag). */
export function empreinteMd5(octets: Uint8Array): { base64: string; hex: string } {
  const h = createHash("md5").update(octets).digest();
  return { base64: h.toString("base64"), hex: h.toString("hex") };
}

/** « bytes 2-5/16 » → 16 ; null si l'en-tête est absent ou illisible. */
function tailleDepuisContentRange(valeur: string | undefined): number | null {
  const m = /\/(\d+)\s*$/.exec(valeur ?? "");
  return m ? Number(m[1]) : null;
}

type CorpsS3 = { transformToWebStream?: () => ReadableStream<Uint8Array>; destroy?: () => void } | undefined;

function fluxWeb(corps: CorpsS3): ReadableStream<Uint8Array> {
  if (!corps?.transformToWebStream) throw new ServiceUnavailable("stockage", { code: "CorpsAbsent", statut: null });
  return corps.transformToWebStream();
}

function abandonner(corps: CorpsS3) {
  try {
    corps?.destroy?.();
  } catch {
    // corps déjà fermé
  }
}

export function creerClientStockage(compartiment: string, envoyer: EnvoiS3): ConnecteurStockage {
  async function appel<T>(chemin: string, action: () => Promise<T>, plage?: Plage): Promise<T> {
    try {
      return await action();
    } catch (e) {
      throw traduireErreur(e, chemin, plage);
    }
  }

  return {
    async deposer(chemin, type, octets) {
      const Key = cleObjet(chemin);
      const md5 = empreinteMd5(octets);
      await appel(chemin, () =>
        envoyer(
          new PutObjectCommand({ Bucket: compartiment, Key, Body: octets, ContentType: type, ContentMD5: md5.base64, ContentLength: octets.length }),
          { abortSignal: AbortSignal.timeout(DELAI_DEPOT_MS) },
        ),
      );
    },

    async lire(chemin, plage): Promise<LectureFichier> {
      const Key = cleObjet(chemin);
      if (plage) verifierPlage(plage, Number.MAX_SAFE_INTEGER); // forme seule ; limites vérifiées ci-dessous
      const reponse = (await appel(
        chemin,
        () => envoyer(new GetObjectCommand({ Bucket: compartiment, Key, ...(plage ? { Range: `bytes=${plage.debut}-${plage.fin}` } : {}) })),
        plage,
      )) as { Body?: CorpsS3; ContentLength?: number; ContentRange?: string };

      if (!plage) {
        const taille = reponse.ContentLength;
        if (typeof taille !== "number") {
          abandonner(reponse.Body);
          throw new ServiceUnavailable("stockage", { code: "TailleAbsente", statut: null });
        }
        return { taille, plage: null, corps: fluxWeb(reponse.Body) };
      }
      const taille = tailleDepuisContentRange(reponse.ContentRange);
      if (taille === null) {
        abandonner(reponse.Body);
        throw new ServiceUnavailable("stockage", { code: "PlageAbsente", statut: null });
      }
      // S3 raccourcit une plage qui dépasse la fin du fichier : le contrat la refuse (416).
      if (plage.fin >= taille) {
        abandonner(reponse.Body);
        verifierPlage(plage, taille);
      }
      return { taille, plage, corps: fluxWeb(reponse.Body) };
    },

    async existe(chemin) {
      const Key = cleObjet(chemin);
      try {
        const r = (await envoyer(new HeadObjectCommand({ Bucket: compartiment, Key }))) as { ContentLength?: number; ETag?: string };
        const etag = (r.ETag ?? "").replace(/"/g, "").toLowerCase();
        return { taille: r.ContentLength ?? 0, md5: /^[0-9a-f]{32}$/.test(etag) ? etag : null };
      } catch (e) {
        const traduite = traduireErreur(e, chemin);
        if (traduite instanceof NotFound) return null;
        throw traduite;
      }
    },
  };
}
