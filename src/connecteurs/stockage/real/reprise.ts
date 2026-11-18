import { empreinteMd5 } from "./client";
import type { ConnecteurStockage } from "../interfaces";

// Reprise des fichiers gardés dans la base du site vers le compartiment Scaleway (F26, research
// R7, US2). Rejouable : un fichier déjà présent à l'identique (taille et MD5) n'est pas recopié.
// L'effacement de la base est une option séparée, refusée tant qu'un fichier n'est pas vérifié ;
// chaque objet est relu juste avant d'effacer sa ligne. Les fichiers sont traités un par un
// (une vidéo de 50 Mo à la fois en mémoire).

export type FichierEnBase = { chemin: string; type: string; taille: number };

export interface BaseFichiers {
  /** Fichiers présents dans la base, sans leur contenu. */
  lister(): Promise<FichierEnBase[]>;
  /** Contenu d'un fichier ; null s'il a disparu entre-temps. */
  octets(chemin: string): Promise<Uint8Array | null>;
  effacer(chemin: string): Promise<void>;
}

export type BilanReprise = {
  copies: number;
  dejaPresents: number;
  /** Chemins non vérifiés présents dans le compartiment. */
  enErreur: string[];
  /** Lignes effacées de la base (option « effacer »). */
  effaces: number;
  /** Effacement demandé mais refusé : au moins un fichier n'est pas vérifié. */
  effacementRefuse: boolean;
  restantEnBase: number;
};

type Client = Pick<ConnecteurStockage, "deposer" | "existe">;

async function identique(client: Client, chemin: string, taille: number, md5: string): Promise<boolean> {
  const present = await client.existe(chemin);
  return present !== null && present.taille === taille && present.md5 === md5;
}

export async function reprendre(options: {
  client: Client;
  base: BaseFichiers;
  effacer?: boolean;
  journal?: (ligne: string) => void;
}): Promise<BilanReprise> {
  const { client, base, effacer = false, journal = () => {} } = options;
  const bilan: BilanReprise = { copies: 0, dejaPresents: 0, enErreur: [], effaces: 0, effacementRefuse: false, restantEnBase: 0 };
  const verifies = new Map<string, { taille: number; md5: string }>();
  const fichiers = await base.lister();

  for (const f of fichiers) {
    try {
      const octets = await base.octets(f.chemin);
      if (!octets) continue; // effacé entre-temps
      const empreinte = { taille: octets.length, md5: empreinteMd5(octets).hex };
      if (await identique(client, f.chemin, empreinte.taille, empreinte.md5)) {
        bilan.dejaPresents++;
        journal(`déjà présent  ${f.chemin}`);
      } else {
        await client.deposer(f.chemin, f.type, octets);
        if (!(await identique(client, f.chemin, empreinte.taille, empreinte.md5))) throw new Error("contrôle après copie");
        bilan.copies++;
        journal(`copié         ${f.chemin}`);
      }
      verifies.set(f.chemin, empreinte);
    } catch (e) {
      bilan.enErreur.push(f.chemin);
      const code = (e as { code?: string })?.code ?? (e instanceof Error ? e.message : "erreur");
      journal(`en erreur     ${f.chemin} (${String(code).slice(0, 80)})`);
    }
  }

  if (effacer) {
    if (bilan.enErreur.length) {
      bilan.effacementRefuse = true;
    } else {
      for (const [chemin, e] of verifies) {
        // Relecture de l'objet juste avant d'effacer la ligne : jamais d'effacement à l'aveugle.
        const ok = await identique(client, chemin, e.taille, e.md5).catch(() => false);
        if (!ok) {
          bilan.enErreur.push(chemin);
          journal(`non effacé    ${chemin} (objet absent ou différent)`);
          continue;
        }
        await base.effacer(chemin);
        bilan.effaces++;
      }
    }
  }

  bilan.restantEnBase = (await base.lister()).length;
  return bilan;
}
