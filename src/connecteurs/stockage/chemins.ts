import { OperationRefusee } from "../erreurs";
import type { Plage } from "./interfaces";

// Validation commune aux deux modes du stockage (F26, contracts/stockage.md) : un chemin est
// toujours « /stockage/<segments> », sans remontée ni caractère de contrôle.

const PREFIXE = "/stockage/";

export function verifierChemin(chemin: string): string {
  const reste = typeof chemin === "string" && chemin.startsWith(PREFIXE) ? chemin.slice(PREFIXE.length) : "";
  const segments = reste.split("/");
  const valide =
    reste.length > 0 &&
    !/[\\\u0000-\u001f\u007f]/.test(reste) &&
    segments.every((s) => s.length > 0 && s !== "." && s !== "..");
  if (!valide) throw new OperationRefusee("Chemin de fichier refusé.", { chemin: String(chemin).slice(0, 200) });
  return chemin;
}

/** Clé de l'objet dans le compartiment : le chemin public sans « / » initial. */
export function cleObjet(chemin: string): string {
  return verifierChemin(chemin).slice(1);
}

/** Plage demandée, contrôlée par rapport à la taille du fichier. */
export function verifierPlage(plage: Plage, taille: number): Plage {
  const { debut, fin } = plage;
  const valide = Number.isInteger(debut) && Number.isInteger(fin) && debut >= 0 && debut <= fin && fin < taille;
  if (!valide) throw new OperationRefusee("Plage d'octets hors des limites du fichier.", { debut, fin, taille });
  return plage;
}

/** Flux d'un contenu déjà en mémoire. */
export function fluxDe(octets: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(c) {
      if (octets.length) c.enqueue(octets);
      c.close();
    },
  });
}
